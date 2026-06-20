const primeui = require('tailwindcss-primeui');

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  // Variantes `dark:` acompanham a classe `.app-escuro` no <html> (mesmo seletor
  // do darkModeSelector do PrimeNG), em vez do padrão `prefers-color-scheme`.
  darkMode: ['selector', '.app-escuro'],
  theme: { extend: {} },
  plugins: [primeui],
};
