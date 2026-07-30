export const colors = {
  bg: '#F0F1F3',
  card: '#FFFFFF',
  ink: '#1A1D23',
  muted: '#6B7280',
  accent: '#3D4F66',
  accentSoft: '#E2E6EC',
  line: '#D5D8DE',
  danger: '#a12b2b',
  white: '#fff',
  overlay: 'rgba(0,0,0,0.35)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screen: 20,
  top: 56,
};

export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const typography = {
  brand: { fontSize: 15, fontWeight: '700', color: colors.accent },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 22, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, color: colors.ink },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  button: { fontSize: 16, fontWeight: '700', color: colors.white },
};

export const calendarTheme = {
  hourStart: 7,
  hourEnd: 21,
  hourHeight: 56,
  dayLabels: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  weekdayShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};
