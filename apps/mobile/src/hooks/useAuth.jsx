import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api';
import {
  attachNotificationListeners,
  clearAppointmentReminders,
  registerPushToken,
  syncUpcomingReminders,
  unregisterPushToken,
} from '../notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [professional, setProfessional] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => attachNotificationListeners(), []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const me = await api('/me');
        setProfessional(me);
      } catch {
        await setToken(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!professional) return undefined;
    registerPushToken();
    syncUpcomingReminders();
    return undefined;
  }, [professional]);

  const value = useMemo(
    () => ({
      professional,
      booting,
      async login(email, password) {
        const data = await api('/auth/login', {
          method: 'POST',
          body: { email, password },
          token: null,
        });
        await setToken(data.token);
        setProfessional(data.professional);
        return data;
      },
      async register(name, email, password, { durationMinutes, price } = {}) {
        const data = await api('/auth/register', {
          method: 'POST',
          body: {
            name,
            email,
            password,
            durationMinutes,
            price,
            sessionMode: 'individual',
          },
          token: null,
        });
        await setToken(data.token);
        setProfessional(data.professional);
        return data;
      },
      async logout() {
        await unregisterPushToken();
        await clearAppointmentReminders();
        await setToken(null);
        setProfessional(null);
      },
      async refreshMe() {
        const me = await api('/me');
        setProfessional(me);
        return me;
      },
    }),
    [professional, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
