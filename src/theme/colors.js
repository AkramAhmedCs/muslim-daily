// Theme colors for Muslim Daily app
// Light and Dark mode palettes with Islamic-inspired colors

export const lightTheme = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  primary: '#1B5E20',      // Islamic green
  primaryLight: '#4CAF50',
  text: '#212121',
  textSecondary: '#757575',
  arabicText: '#1A1A1A',
  accent: '#81C784',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  card: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.1)',
};

export const darkTheme = {
  background: '#0D1117',
  surface: '#161B22',
  primary: '#238636',
  primaryLight: '#3FB950',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  arabicText: '#FFFFFF',
  accent: '#3FB950',
  border: '#30363D',
  success: '#3FB950',
  warning: '#D29922',
  card: '#21262D',
  shadow: 'rgba(0,0,0,0.3)',
};

// Ramadan Theme — Soft gold on deep navy (dark-only, eye-friendly for long reading)
export const ramadanDarkTheme = {
  background: '#141420',     // Slightly lifted navy — less harsh than pure black
  surface: '#1C1C2E',       // Soft navy surface
  primary: '#B09650',       // Muted, warm gold — easy on the eyes
  primaryLight: '#C4AA6A',  // Gentle light gold
  text: '#E0DCD0',          // Soft warm gray — not bright white, not too yellow
  textSecondary: 'rgba(224,220,208,0.55)', // Subdued secondary text
  arabicText: '#E8E4D8',    // Slightly brighter for Arabic legibility
  accent: '#C4AA6A',        // Soft gold accent
  border: 'rgba(176,150,80,0.15)',  // Very subtle gold-tinted border
  success: '#B09650',
  warning: '#C4AA6A',
  card: '#1A1A2C',          // Barely different from surface for soft layering
  shadow: 'rgba(0,0,0,0.3)',
};
