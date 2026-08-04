import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useBookingLink, useNewAppointment, useWaitlist } from '../hooks';
import { colors, spacing, typography } from '../theme';
import { formatDateLabel, formatTime } from '../utils/date';
import { whatsappUrl } from '../utils/phone';

function formatPreferred(date) {
  if (!date) return 'Cualquier día';
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function NewAppointmentScreen({ navigation }) {
  const form = useNewAppointment({
    onCreated: () => navigation.navigate('Agenda'),
  });
  const link = useBookingLink();
  const waitlist = useWaitlist();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Nuevo turno</Text>
      <Text style={styles.hint}>
        Completá los datos del paciente y el horario.
      </Text>

      <Pressable
        style={styles.linkBtn}
        onPress={link.shareWhatsApp}
        disabled={link.loading || (!link.whatsappDeepLink && !link.url)}
      >
        <Ionicons name="logo-whatsapp" size={22} color={colors.accent} />
        <View style={styles.linkBtnText}>
          <Text style={styles.linkBtnTitle}>Enviar por WhatsApp</Text>
          <Text style={styles.linkBtnHint}>
            Link al bot con el mensaje ya armado
          </Text>
        </View>
        <Ionicons name="share-outline" size={18} color={colors.muted} />
      </Pressable>
      {!!link.error && <Text style={styles.error}>{link.error}</Text>}

      <Text style={styles.label}>Paciente</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor={colors.muted}
        value={form.name}
        onChangeText={form.setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={form.setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        placeholderTextColor={colors.muted}
        keyboardType="phone-pad"
        value={form.phone}
        onChangeText={form.setPhone}
      />

      <Text style={styles.label}>Horario</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.pickerBtn, styles.half]}
          onPress={() => form.openPicker('date')}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
          <Text style={styles.pickerText}>{formatDateLabel(form.when)}</Text>
        </Pressable>
        <Pressable
          style={[styles.pickerBtn, styles.half]}
          onPress={() => form.openPicker('time')}
        >
          <Ionicons name="time-outline" size={18} color={colors.accent} />
          <Text style={styles.pickerText}>{formatTime(form.when)}</Text>
        </Pressable>
      </View>

      {!!form.error && <Text style={styles.error}>{form.error}</Text>}

      <Pressable style={styles.btn} onPress={form.submit} disabled={form.loading}>
        {form.loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Guardar turno</Text>
        )}
      </Pressable>

      <View style={styles.copyBlock}>
        {!!link.url && <Text style={styles.linkUrl} selectable>{link.url}</Text>}
        <Pressable
          style={styles.copyLink}
          onPress={link.copy}
          disabled={link.loading || !link.url}
        >
          <Text style={styles.copyLinkText}>Copiar link</Text>
        </Pressable>
        {!!link.message && <Text style={styles.ok}>{link.message}</Text>}
      </View>

      <View style={styles.clientsSection}>
        <Text style={styles.sectionTitleQuiet}>Lista de espera</Text>
        <Text style={styles.sectionHint}>
          Si alguien cancela, avisamos automáticamente al primero.
        </Text>
        {waitlist.loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : waitlist.entries.length === 0 ? (
          <Text style={styles.empty}>Nadie en espera por ahora.</Text>
        ) : (
          waitlist.entries.map((entry) => (
            <View key={entry.id} style={styles.clientCard}>
              <View style={styles.waitHead}>
                <Text style={styles.clientName}>
                  #{entry.position} {entry.name}
                </Text>
                {entry.status === 'offered' && (
                  <Text style={styles.offeredBadge}>Avisar</Text>
                )}
              </View>
              <Text style={styles.clientMeta}>{entry.email}</Text>
              <Text style={styles.clientMeta}>
                {formatPreferred(entry.preferredDate)}
              </Text>
              <View style={styles.waitActions}>
                <Pressable
                  style={styles.phoneRow}
                  onPress={() => waitlist.contactWhatsApp(entry)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color={colors.accent} />
                  <Text style={styles.phone}>{entry.phone || 'WhatsApp'}</Text>
                </Pressable>
                <Pressable onPress={() => waitlist.remove(entry)}>
                  <Text style={styles.removeText}>Quitar</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
        {!!waitlist.error && <Text style={styles.error}>{waitlist.error}</Text>}
      </View>

      <View style={styles.clientsSection}>
        <Text style={styles.sectionTitle}>Tus clientes</Text>
        <Text style={styles.sectionHint}>
          Tocá uno para completar el formulario.
        </Text>
        {form.patients.length === 0 ? (
          <Text style={styles.empty}>Todavía no tenés clientes guardados.</Text>
        ) : (
          form.patients.map((p) => {
            const phone = p.phone?.trim();
            const wa = phone ? whatsappUrl(phone) : null;
            return (
              <Pressable
                key={p._id}
                style={styles.clientCard}
                onPress={() => form.fillFromPatient(p)}
              >
                <Text style={styles.clientName}>{p.name}</Text>
                <Text style={styles.clientMeta}>{p.email}</Text>
                {!!phone && (
                  <Pressable
                    style={styles.phoneRow}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      if (wa) Linking.openURL(wa);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="logo-whatsapp"
                      size={16}
                      color={colors.accent}
                    />
                    <Text style={styles.phone}>{phone}</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })
        )}
      </View>

      <Modal
        visible={Platform.OS === 'ios' && !!form.iosPicker}
        transparent
        animationType="slide"
        onRequestClose={() => form.setIosPicker(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => form.setIosPicker(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {form.iosPicker === 'date' ? 'Elegí fecha' : 'Elegí hora'}
              </Text>
              <Pressable onPress={() => form.setIosPicker(null)}>
                <Text style={styles.modalDone}>Listo</Text>
              </Pressable>
            </View>
            {!!form.iosPicker && (
              <DateTimePicker
                value={form.when}
                mode={form.iosPicker}
                display="spinner"
                onValueChange={(_e, selected) => form.onIosPickerChange(selected)}
                minimumDate={form.iosPicker === 'date' ? new Date() : undefined}
                minuteInterval={15}
                themeVariant="light"
                style={styles.iosSpinner}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.screen, paddingTop: spacing.top, paddingBottom: 40 },
  title: { ...typography.title, marginBottom: 6 },
  hint: { ...typography.muted, marginBottom: 16 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  linkBtnText: { flex: 1 },
  linkBtnTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  linkBtnHint: { fontSize: 13, color: colors.muted, marginTop: 2 },
  label: { ...typography.label, marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  half: { flex: 1 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    color: colors.ink,
    fontSize: 16,
  },
  pickerBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerText: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: typography.button,
  copyBlock: {
    marginTop: 10,
    alignItems: 'center',
    gap: 6,
  },
  linkUrl: {
    color: colors.ink,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  copyLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  copyLinkText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, marginBottom: 8 },
  ok: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  clientsSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  sectionTitleQuiet: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHint: { color: colors.muted, marginBottom: 14, fontSize: 13 },
  empty: { color: colors.muted, fontStyle: 'italic' },
  clientCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  clientName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  clientMeta: { color: colors.muted, marginTop: 2, fontSize: 13 },
  waitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  offeredBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.accentSoft || '#e2e6ec',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  waitActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  phone: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  modalDone: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  iosSpinner: { alignSelf: 'center', width: '100%', height: 200 },
});
