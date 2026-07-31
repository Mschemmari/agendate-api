import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAvailability } from '../hooks';
import { colors, spacing, typography } from '../theme';

export default function AvailabilityScreen({ navigation }) {
  const {
    DAYS,
    sessionMode,
    setMode,
    rules,
    loading,
    saving,
    error,
    ok,
    updateRule,
    save,
  } = useAvailability({
    onSaved: () => navigation.navigate('Agenda'),
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isGroup = sessionMode === 'group';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Disponibilidad</Text>
      <Text style={styles.hint}>
        {isGroup
          ? 'Clase semanal con cupo: definí franja y lugares.'
          : 'Franja para turnos 1:1: activá los días y el horario.'}
      </Text>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, !isGroup && styles.modeBtnOn]}
          onPress={() => setMode('individual')}
        >
          <Text style={[styles.modeText, !isGroup && styles.modeTextOn]}>
            Individual
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, isGroup && styles.modeBtnOn]}
          onPress={() => setMode('group')}
        >
          <Text style={[styles.modeText, isGroup && styles.modeTextOn]}>
            Grupal
          </Text>
        </Pressable>
      </View>

      {rules.map((rule) => (
        <View key={rule.dayOfWeek} style={styles.row}>
          <Pressable
            style={[styles.day, rule.enabled && styles.dayOn]}
            onPress={() =>
              updateRule(rule.dayOfWeek, { enabled: !rule.enabled })
            }
          >
            <Text style={[styles.dayText, rule.enabled && styles.dayTextOn]}>
              {DAYS[rule.dayOfWeek]}
            </Text>
          </Pressable>
          <TextInput
            style={styles.time}
            value={rule.startTime}
            editable={rule.enabled}
            onChangeText={(startTime) =>
              updateRule(rule.dayOfWeek, { startTime })
            }
          />
          <Text style={styles.to}>a</Text>
          <TextInput
            style={styles.time}
            value={rule.endTime}
            editable={rule.enabled}
            onChangeText={(endTime) => updateRule(rule.dayOfWeek, { endTime })}
          />
          {isGroup && (
            <TextInput
              style={styles.capacity}
              value={rule.capacity}
              editable={rule.enabled}
              keyboardType="number-pad"
              placeholder="Cupo"
              placeholderTextColor={colors.muted}
              onChangeText={(capacity) =>
                updateRule(rule.dayOfWeek, { capacity })
              }
            />
          )}
        </View>
      ))}

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!ok && <Text style={styles.ok}>{ok}</Text>}

      <Pressable style={styles.btn} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Guardar</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.bg },
  container: {
    padding: spacing.screen,
    paddingTop: spacing.top,
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  title: typography.title,
  hint: { ...typography.muted, marginBottom: 16, marginTop: 6 },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  modeBtnOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modeText: { fontWeight: '700', color: colors.ink },
  modeTextOn: { color: colors.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  day: {
    width: 54,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  dayOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayText: { fontWeight: '700', color: colors.ink },
  dayTextOn: { color: colors.white },
  time: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: colors.ink,
    textAlign: 'center',
  },
  capacity: {
    width: 56,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    color: colors.ink,
    textAlign: 'center',
  },
  to: { color: colors.muted },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  btnText: typography.button,
  error: { color: colors.danger, marginTop: 8 },
  ok: { color: colors.accent, marginTop: 8, fontWeight: '600' },
});
