// constants/theme.ts

export const theme = {
  colors: {
    // ── Fundos ──────────────────────────────────────
    bg:       '#F5F2ED',   // off-white quente (fundo principal)
    bgPanel:  '#EDE9E3',   // painel levemente mais escuro
    bgCard:   '#FAF8F5',   // cards e tabelas
    white:    '#FFFFFF',

    // ── Tipografia ───────────────────────────────────
    ink:       '#1A1A1A',  // texto principal
    inkMid:    '#4A4540',  // texto secundário
    inkLight:  '#8A8070',  // labels, hints
    inkXLight: '#C4BAB0',  // placeholders

    // ── Bordas ───────────────────────────────────────
    border:   '#E3DDD6',
    borderDk: '#CEC7BE',

    // ── Accent APduo ─────────────────────────────────
    // Extraído do logo horizontal colorido:
    // letras em preto + detalhe bege/dourado suave
    accent:   '#1A1A1A',   // cor primária de ação (botões, destaques)
    accentBg: '#EDE9E3',   // fundo de elementos com accent

    // ── Semânticas ───────────────────────────────────
    success: '#5A7A5A',
    danger:  '#B85450',
    warning: '#A07840',
  },

  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  radius: {
    xs:  4,
    sm:  8,
    md:  12,
    lg:  16,
    xl:  24,
    full: 999,
  },

  font: {
    serif:       'CormorantGaramond_400Regular',
    serifLight:  'CormorantGaramond_300Light',
    serifMedium: 'CormorantGaramond_500Medium',
    sans:        'DMSans_400Regular',
    sansMedium:  'DMSans_500Medium',
  },
} as const