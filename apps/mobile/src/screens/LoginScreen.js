import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../hooks';
import { colors, spacing, typography } from '../theme';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        const duration = Number(durationMinutes);
        const hourlyPrice = Number(String(price).replace(',', '.'));
        if (!Number.isFinite(duration) || duration < 5) {
          throw new Error('La duración debe ser al menos 5 minutos');
        }
        if (!Number.isFinite(hourlyPrice) || hourlyPrice < 0 || price === '') {
          throw new Error('Ingresá el valor de la hora');
        }
        await register(name.trim(), email.trim(), password, {
          durationMinutes: duration,
          price: hourlyPrice,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>Agendate</Text>
      <Text style={styles.title}>
        {mode === 'login' ? 'Ingresá a tu agenda' : 'Creá tu cuenta'}
      </Text>
      <Text style={styles.subtitle}>
        Gestioná turnos y compartí tu link de reservas.
      </Text>

      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder="Nombre de profesional o empresa"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {mode === 'register' && (
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Valor de la hora</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 15000"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Duración (minutos)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 45"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
            />
          </View>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.btn} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>
            {mode === 'login' ? 'Entrar' : 'Registrarme'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switch}>
          {mode === 'login'
            ? '¿No tenés cuenta? Registrate'
            : '¿Ya tenés cuenta? Ingresá'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xxl,
    justifyContent: 'center',
  },
  brand: { ...typography.brand, fontSize: 22, marginBottom: 8 },
  title: { ...typography.title, fontSize: 28, marginBottom: 8 },
  subtitle: { ...typography.muted, marginBottom: 24 },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    color: colors.ink,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: typography.button,
  switch: {
    textAlign: 'center',
    color: colors.accent,
    marginTop: 18,
    fontWeight: '600',
  },
  error: { color: colors.danger, marginBottom: 8 },
});
