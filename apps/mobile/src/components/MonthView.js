import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppointmentCard from './AppointmentCard';
import { calendarTheme, colors } from '../theme';
import { sameDay } from '../utils/date';

const { weekdayShort } = calendarTheme;

export default function MonthView({ agenda }) {
  return (
    <ScrollView
      style={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={agenda.refreshing}
          onRefresh={agenda.refresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.weekHeader}>
        {weekdayShort.map((label) => (
          <Text key={label} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {agenda.monthCells.map((day) => {
          const inMonth = day.getMonth() === agenda.monthAnchor.getMonth();
          const selected = sameDay(day, agenda.selectedDay);
          const isToday = sameDay(day, new Date());
          const count = agenda.countByDayKey[day.toISOString()] || 0;

          return (
            <Pressable
              key={day.toISOString()}
              style={[
                styles.cell,
                selected && styles.cellSelected,
                !inMonth && styles.cellMuted,
              ]}
              onPress={() => agenda.selectDay(day)}
            >
              <Text
                style={[
                  styles.dayNum,
                  !inMonth && styles.dayMuted,
                  selected && styles.daySelected,
                  isToday && !selected && styles.dayToday,
                ]}
              >
                {day.getDate()}
              </Text>
              {count > 0 && (
                <View style={styles.events}>
                  <View style={styles.pill} />
                  {count > 1 && (
                    <Text
                      style={[
                        styles.count,
                        selected && styles.countSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        <Text style={styles.listTitle}>
          {agenda.selectedDay.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        {agenda.dayAppointments.length === 0 ? (
          <Text style={styles.empty}>Sin turnos este día</Text>
        ) : (
          agenda.dayAppointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onPress={() => agenda.cancelAppt(appt)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  cell: {
    width: '14.28%',
    paddingTop: 6,
    paddingBottom: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  cellSelected: { backgroundColor: colors.card },
  cellMuted: { opacity: 0.45 },
  dayNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  dayMuted: { color: colors.muted },
  daySelected: { color: colors.accent },
  dayToday: { color: colors.accent },
  events: { alignItems: 'center', gap: 1, minHeight: 10 },
  pill: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  count: { fontSize: 10, fontWeight: '700', color: colors.muted },
  countSelected: { color: colors.accent },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  empty: { color: colors.muted, fontWeight: '500' },
});
