import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DayView, MonthView } from '../components';
import { useAgenda, useAuth } from '../hooks';
import { colors, spacing } from '../theme';

export default function AgendaScreen() {
  const { professional, logout } = useAuth();
  const agenda = useAgenda();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>Agendate</Text>
          <Text style={styles.hello}>{professional?.name}</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable style={styles.todayBtn} onPress={agenda.goToday}>
            <Text style={styles.todayText}>Hoy</Text>
          </Pressable>
          <Pressable onPress={logout}>
            <Text style={styles.link}>Salir</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.modeRow}>
        <View style={styles.segment}>
          {[
            { key: 'month', label: 'Mes' },
            { key: 'day', label: 'Día' },
          ].map((opt) => (
            <Pressable
              key={opt.key}
              style={[
                styles.segmentBtn,
                agenda.viewMode === opt.key && styles.segmentBtnOn,
              ]}
              onPress={() => agenda.switchMode(opt.key)}
            >
              <Text
                style={[
                  styles.segmentText,
                  agenda.viewMode === opt.key && styles.segmentTextOn,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.monthRow}>
        <Pressable style={styles.navBtn} onPress={() => agenda.shiftPeriod(-1)}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.monthTitle} numberOfLines={1}>
          {agenda.titleDate}
        </Text>
        <Pressable style={styles.navBtn} onPress={() => agenda.shiftPeriod(1)}>
          <Ionicons name="chevron-forward" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {!!agenda.error && <Text style={styles.error}>{agenda.error}</Text>}

      {agenda.loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : agenda.viewMode === 'month' ? (
        <MonthView agenda={agenda} />
      ) : (
        <DayView agenda={agenda} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.top },
  topBar: {
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brand: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  hello: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 2 },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  todayBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  link: { color: colors.accent, fontWeight: '600' },
  modeRow: { paddingHorizontal: spacing.xl, marginBottom: 8 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentBtnOn: { backgroundColor: colors.accent },
  segmentText: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  segmentTextOn: { color: colors.white },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    marginHorizontal: spacing.xl,
    marginBottom: 8,
  },
});
