import {defineTheme} from '@astryxdesign/core/theme';

export const magazineTheme = defineTheme({
  name: 'editorial-magazine',
  tokens: {
    '--color-accent': '#B45F35', // Clay accent
    '--color-background-body': '#F7F4EC', // Cream body background
    '--color-background-surface': '#FFFDF9', // Very light off-white surface
    '--color-text-primary': '#10140F', // Deep ink primary text
    '--color-text-secondary': '#6D715F', // Muted secondary text
    '--color-border': '#D8D0BC', // Stone border color
    '--radius-container': '12px',
    '--radius-element': '6px',
  },
});

export const sportsTheme = defineTheme({
  name: 'sports-command-center',
  tokens: {
    '--color-accent': '#A7FF00', // Neon Lime accent
    '--color-background-body': '#0B0E0C', // Dark body background
    '--color-background-surface': '#0F1F16', // Pitch Green surface
    '--color-text-primary': '#FFFFFF', // White text
    '--color-text-secondary': '#8A9E92', // Muted sage text
    '--color-border': '#1F2E24', // Subtle forest border
    '--radius-container': '8px',
    '--radius-element': '4px',
  },
});

export const communityTheme = defineTheme({
  name: 'fan-community-arena',
  tokens: {
    '--color-accent': '#7C3AED', // Violet accent
    '--color-background-body': '#0D0E15', // Dark deep purple-blue body
    '--color-background-surface': '#151726', // Deep indigo surface
    '--color-text-primary': '#FFFFFF', // White text
    '--color-text-secondary': '#9298B8', // Slate blue text
    '--color-border': '#272A40', // Muted purple-slate border
    '--radius-container': '16px',
    '--radius-element': '8px',
  },
});
