import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarTheme, colors } from '../theme';
import {
  addDays,
  eventBlockStyle,
  formatHour,
  formatTime,
  sameDay,
} from '../utils/date';
import { whatsappUrl } from '../utils/phone';

const { hourStart, hourEnd, hourHeight, dayLabels } = calendarTheme;

function buildHours() {
  const list = [];
  for (let h = hourStart; h <= hourEnd; h += 1) list.push(h);
  return list;
}

export default function DayView({ agenda }) {
  const hours = buildHours();
  const timelineHeight = (hourEnd - hourStart + 1) * hourHeight;

  return (
    <View style={styles.root}>
      <View style={styles.strip}>
        {Array.from({ length: 7 }, (_, i) =>
          addDays(agenda.selectedDay, i - 3)
        ).map((day) => {
          const selected = sameDay(day, agenda.selectedDay);
          const isToday = sameDay(day, new Date());
          return (
            <Pressable
              key={day.toISOString()}
              style={[styles.stripCell, selected && styles.stripCellOn]}
              onPress={() => agenda.selectDay(day)}
            >
              <Text
                style={[styles.stripLetter, selected && styles.stripLetterOn]}
              >
                {dayLabels[day.getDay()]}
              </Text>
              <View
                style={[
                  styles.numWrap,
                  selected && styles.numWrapOn,
                  isToday && !selected && styles.numToday,
                ]}
              >
                <Text
                  style={[
                    styles.num,
                    selected && styles.numOn,
                    isToday && !selected && styles.numTodayText,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={agenda.refreshing}
            onRefresh={agenda.refresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={[styles.timeline, { height: timelineHeight }]}>
          {hours.map((h) => (
            <View
              key={h}
              style={[styles.hourRow, { top: (h - hourStart) * hourHeight }]}
            >
              <Text style={styles.hourLabel}>{formatHour(h)}</Text>
              <View style={styles.hourLine} />
            </View>
          ))}

          {agenda.dayAppointments.map((appt) => {
            const pos = eventBlockStyle(appt, hourStart, hourHeight);
            const phone = appt.patient?.phone?.trim();
            const wa = phone ? whatsappUrl(phone) : null;
            return (
              <Pressable
                key={appt.id}
                style={[styles.event, pos]}
                onPress={() => agenda.cancelAppt(appt)}
              >
                <View style={styles.eventHeader}>
                  <Text style={[styles.eventTime, { flex: 1 }]} numberOfLines={1}>
                    {formatTime(appt.startsAt)} – {formatTime(appt.endsAt)}
                  </Text>
                  {!!wa && (
                    <Pressable
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        Linking.openURL(wa);
                      }}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="logo-whatsapp"
                        size={16}
                        color={colors.accent}
                      />
                    </Pressable>
                  )}
                </View>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {appt.patient?.name || 'Paciente'}
                </Text>
                {pos.height > 44 && (
                  <Text style={styles.eventMeta} numberOfLines={1}>
                    {phone || appt.patient?.email || ''}
                    {appt.source === 'link' ? ' · Link' : ''}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {agenda.dayAppointments.length === 0 && (
            <View style={styles.emptyOverlay}>
              <Text style={styles.empty}>Sin turnos este día</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  strip: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 14,
  },
  stripCellOn: { backgroundColor: colors.card },
  stripLetter: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
  },
  stripLetterOn: { color: colors.accent },
  numWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numWrapOn: { backgroundColor: colors.accent },
  numToday: { borderWidth: 1.5, borderColor: colors.accent },
  num: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  numOn: { color: colors.white },
  numTodayText: { color: colors.accent },
  timelineScroll: { flex: 1, backgroundColor: colors.card },
  timeline: { marginHorizontal: 8, position: 'relative' },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: hourHeight,
    flexDirection: 'row',
  },
  hourLabel: {
    width: 52,
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
    marginTop: -5,
    paddingLeft: 6,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  event: {
    position: 'absolute',
    left: 56,
    right: 8,
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: { fontSize: 11, fontWeight: '700', color: colors.accent },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  eventMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  emptyOverlay: {
    position: 'absolute',
    left: 56,
    right: 0,
    top: 80,
    alignItems: 'center',
  },
  empty: { color: colors.muted, fontWeight: '500' },
});
