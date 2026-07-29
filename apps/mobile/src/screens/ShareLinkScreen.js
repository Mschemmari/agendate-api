import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBookingLink } from '../hooks';
import { colors, spacing, typography } from '../theme';

export default function ShareLinkScreen() {
  const { url, loading, message, error, copy, share } = useBookingLink();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu link de reservas</Text>
      <Text style={styles.hint}>
        Compartilo por WhatsApp, Instagram o email. El paciente agenda solo.
      </Text>
      <View style={styles.box}>
        <Text selectable style={styles.url}>
          {url || '—'}
        </Text>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!message && <Text style={styles.ok}>{message}</Text>}
      <Pressable style={styles.btn} onPress={copy}>
        <Text style={styles.btnText}>Copiar link</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={share}>
        <Text style={styles.secondaryText}>Compartir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.bg },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.screen,
    paddingTop: spacing.top,
  },
  title: typography.title,
  hint: { ...typography.muted, marginVertical: 12 },
  box: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 16,
  },
  url: { color: colors.ink, fontWeight: '600' },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: typography.button,
  secondary: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  secondaryText: { color: colors.ink, fontWeight: '700' },
  error: { color: colors.danger, marginBottom: 8 },
  ok: { color: colors.accent, marginBottom: 8, fontWeight: '600' },
});
