import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from '../api';
import { formatTime } from '../utils/date';
import { emitAppointmentsChanged } from './events';

const REMINDER_PREFIX = 'appt-';
const REMINDER_CHANNEL = 'appointment-reminders';
const NEW_CHANNEL = 'new-appointments';
const LEAD_MS = 30 * 60 * 1000;
const HORIZON_DAYS = 90;

/** Expo Go no soporta push remoto desde SDK 53. */
function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function supportsRemotePush() {
  return Platform.OS !== 'web' && !isExpoGo();
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function reminderId(appointmentId) {
  return `${REMINDER_PREFIX}${appointmentId}`;
}

function getEasProjectId() {
  const id =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    null;
  const trimmed = id && String(id).trim();
  return trimmed || null;
}

async function ensureLocalChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Recordatorios de turnos',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync(NEW_CHANNEL, {
    name: 'Nuevos turnos',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function ensurePermissions() {
  if (Platform.OS === 'web') return false;
  await ensureLocalChannels();

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  return status === 'granted';
}

let pushListenersAttached = false;
let currentPushToken = null;

export function getCurrentPushToken() {
  return currentPushToken;
}

export function attachNotificationListeners() {
  if (pushListenersAttached || Platform.OS === 'web') return () => {};
  pushListenersAttached = true;

  const received = Notifications.addNotificationReceivedListener(() => {
    emitAppointmentsChanged();
  });
  const response = Notifications.addNotificationResponseReceivedListener(() => {
    emitAppointmentsChanged();
  });

  return () => {
    received.remove();
    response.remove();
    pushListenersAttached = false;
  };
}

export async function registerPushToken() {
  if (!supportsRemotePush()) {
    if (isExpoGo()) {
      console.warn(
        '[push] Push remoto no funciona en Expo Go (SDK 53+). Usá un development build.'
      );
    }
    return null;
  }
  if (!Device.isDevice) {
    console.warn('[push] Push remoto requiere un dispositivo físico');
    return null;
  }

  const granted = await ensurePermissions();
  if (!granted) return null;

  const projectId = getEasProjectId();
  try {
    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenResult?.data;
    if (!token) return null;
    currentPushToken = token;
    await api('/me/push-token', { method: 'POST', body: { token } });
    return token;
  } catch (err) {
    console.warn('[push] No se pudo registrar el token', err?.message || err);
    return null;
  }
}

export async function unregisterPushToken() {
  if (Platform.OS === 'web' || !currentPushToken) {
    currentPushToken = null;
    return;
  }
  try {
    await api('/me/push-token', {
      method: 'DELETE',
      body: { token: currentPushToken },
    });
  } catch {
    // ignore
  } finally {
    currentPushToken = null;
  }
}

export async function scheduleAppointmentReminder(appointment) {
  if (!appointment?.id) return;
  const ready = await ensurePermissions();
  if (!ready) return;

  const id = reminderId(appointment.id);
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  const startsAt = new Date(appointment.startsAt);
  const fireAt = new Date(startsAt.getTime() - LEAD_MS);
  if (Number.isNaN(fireAt.getTime()) || fireAt.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'Turno en 30 minutos',
      body: `${appointment.patient?.name || 'Paciente'} · ${formatTime(startsAt)}`,
      data: { appointmentId: String(appointment.id), type: 'reminder' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : {}),
    },
  });
}

export async function cancelAppointmentReminder(appointmentId) {
  if (!appointmentId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(
    reminderId(appointmentId)
  ).catch(() => {});
}

export async function clearAppointmentReminders() {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier?.startsWith(REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function syncUpcomingReminders() {
  if (Platform.OS === 'web') return;

  try {
    const ready = await ensurePermissions();
    if (!ready) return;

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + HORIZON_DAYS);
    to.setHours(23, 59, 59, 999);

    const data = await api(
      `/me/appointments?from=${from.toISOString()}&to=${to.toISOString()}`
    );
    const upcoming = (data || []).filter((a) => a.status === 'confirmed');
    const desired = new Set(upcoming.map((a) => reminderId(a.id)));

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          (n) =>
            n.identifier?.startsWith(REMINDER_PREFIX) &&
            !desired.has(n.identifier)
        )
        .map((n) =>
          Notifications.cancelScheduledNotificationAsync(n.identifier)
        )
    );

    for (const appointment of upcoming) {
      await scheduleAppointmentReminder(appointment);
    }
  } catch {
    // Best-effort.
  }
}
