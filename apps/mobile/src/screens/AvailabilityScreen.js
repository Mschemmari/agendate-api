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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Disponibilidad</Text>
      <Text style={styles.hint}>Activá los días y definí franja horaria.</Text>

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
