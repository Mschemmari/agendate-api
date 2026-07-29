import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { formatTime } from '../utils/date';
import { whatsappUrl } from '../utils/phone';

export default function AppointmentCard({ appointment, onPress }) {
  const phone = appointment.patient?.phone?.trim();
  const wa = phone ? whatsappUrl(phone) : null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <Text style={styles.time}>
          {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
        </Text>
        <Text style={styles.name}>{appointment.patient?.name}</Text>
        <Text style={styles.meta}>
          {appointment.patient?.email}
          {appointment.source === 'link' ? ' · Link' : ''}
        </Text>
        {!!phone && (
          <Pressable
            style={styles.phoneRow}
            onPress={(e) => {
              e?.stopPropagation?.();
              if (wa) Linking.openURL(wa);
            }}
            hitSlop={8}
          >
            <Ionicons name="logo-whatsapp" size={16} color={colors.accent} />
            <Text style={styles.phone}>{phone}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accent: { width: 4, backgroundColor: colors.accent },
  body: { flex: 1, paddingBottom: 4 },
  time: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 12,
    marginHorizontal: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginHorizontal: 12,
    marginTop: 2,
  },
  meta: {
    color: colors.muted,
    marginHorizontal: 12,
    marginTop: 2,
    fontSize: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  phone: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
});
