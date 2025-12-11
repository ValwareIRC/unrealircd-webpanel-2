import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface ThemeColors {
  // Background colors
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  bgHover: string
  bgActive: string
  
  // Border colors
  borderPrimary: string
  borderSecondary: string
  borderAccent: string
  
  // Text colors
  textPrimary: string
  textSecondary: string
  textMuted: string
  textAccent: string
  
  // Accent colors
  accent: string
  accentHover: string
  accentMuted: string
  
  // Status colors
  success: string
  warning: string
  error: string
  info: string
  
  // Special
  gradient?: string
  glow?: string
  shadow?: string
}

export interface Theme {
  id: string
  name: string
  description: string
  category: 'modern' | 'futuristic' | 'retro' | 'classic' | 'festive'
  colors: ThemeColors
  fontFamily?: string
  borderRadius?: string
  effects?: {
    glow?: boolean
    scanlines?: boolean
    noise?: boolean
    crt?: boolean
    glassmorphism?: boolean
    neon?: boolean
  }
}

// 10 Built-in themes
export const builtInThemes: Theme[] = [
  // MODERN THEMES
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Sleek dark theme with purple accents',
    category: 'modern',
    colors: {
      bgPrimary: '#0a0a0f',
      bgSecondary: '#12121a',
      bgTertiary: '#1a1a25',
      bgHover: '#252535',
      bgActive: '#2a2a3d',
      borderPrimary: '#2d2d3d',
      borderSecondary: '#3d3d52',
      borderAccent: '#8b5cf6',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      textAccent: '#a78bfa',
      accent: '#8b5cf6',
      accentHover: '#7c3aed',
      accentMuted: '#8b5cf620',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
    },
    borderRadius: '0.75rem',
    effects: { glassmorphism: true },
  },
  {
    id: 'ocean',
    name: 'Ocean Depths',
    description: 'Deep blue modern interface',
    category: 'modern',
    colors: {
      bgPrimary: '#0c1222',
      bgSecondary: '#111a2e',
      bgTertiary: '#162236',
      bgHover: '#1e3048',
      bgActive: '#264060',
      borderPrimary: '#1e3a5f',
      borderSecondary: '#4b86ee40',
      borderAccent: '#4b86ee',
      textPrimary: '#f0f9ff',
      textSecondary: '#bae6fd',
      textMuted: '#7dd3fc',
      textAccent: '#6ba3ff',
      accent: '#4b86ee',
      accentHover: '#3a6fd4',
      accentMuted: '#4b86ee20',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#f43f5e',
      info: '#6366f1',
      gradient: 'linear-gradient(135deg, #4b86ee 0%, #8b5cf6 100%)',
    },
    borderRadius: '1rem',
    effects: { glassmorphism: true },
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    description: 'Elegant dark theme with warm accents',
    category: 'modern',
    colors: {
      bgPrimary: '#0f0a0a',
      bgSecondary: '#1a1212',
      bgTertiary: '#251a1a',
      bgHover: '#352525',
      bgActive: '#452e2e',
      borderPrimary: '#3d2828',
      borderSecondary: '#4a3535',
      borderAccent: '#f43f5e',
      textPrimary: '#fff1f2',
      textSecondary: '#fecdd3',
      textMuted: '#fb7185',
      textAccent: '#fb7185',
      accent: '#f43f5e',
      accentHover: '#e11d48',
      accentMuted: '#f43f5e20',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
    },
    borderRadius: '0.5rem',
  },

  // FUTURISTIC THEMES
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    description: 'Cyberpunk-inspired with neon glows',
    category: 'futuristic',
    colors: {
      bgPrimary: '#030304',
      bgSecondary: '#0a0a0c',
      bgTertiary: '#111114',
      bgHover: '#1a1a1f',
      bgActive: '#222228',
      borderPrimary: '#00fff920',
      borderSecondary: '#ff00ff20',
      borderAccent: '#00fff9',
      textPrimary: '#ffffff',
      textSecondary: '#00fff9',
      textMuted: '#00fff980',
      textAccent: '#ff00ff',
      accent: '#00fff9',
      accentHover: '#00cccc',
      accentMuted: '#00fff915',
      success: '#00ff88',
      warning: '#ffff00',
      error: '#ff0055',
      info: '#00aaff',
      gradient: 'linear-gradient(135deg, #00fff9 0%, #ff00ff 50%, #ffff00 100%)',
      glow: '0 0 20px #00fff940, 0 0 40px #00fff920',
    },
    fontFamily: '"Orbitron", "Rajdhani", sans-serif',
    borderRadius: '0',
    effects: { neon: true, glow: true, scanlines: true },
  },
  {
    id: 'hologram',
    name: 'Hologram',
    description: 'Translucent holographic interface',
    category: 'futuristic',
    colors: {
      bgPrimary: '#000508',
      bgSecondary: '#00101880',
      bgTertiary: '#00182080',
      bgHover: '#00253080',
      bgActive: '#00354080',
      borderPrimary: '#00ffff30',
      borderSecondary: '#00ff8830',
      borderAccent: '#00ffff',
      textPrimary: '#e0ffff',
      textSecondary: '#80ffff',
      textMuted: '#40cccc',
      textAccent: '#00ffff',
      accent: '#00ffff',
      accentHover: '#40ffff',
      accentMuted: '#00ffff15',
      success: '#00ff88',
      warning: '#ffcc00',
      error: '#ff4466',
      info: '#4488ff',
      gradient: 'linear-gradient(135deg, #00ffff40 0%, #00ff8840 100%)',
      glow: '0 0 30px #00ffff30',
    },
    borderRadius: '0.25rem',
    effects: { glassmorphism: true, glow: true },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    description: 'Digital rain aesthetic',
    category: 'futuristic',
    colors: {
      bgPrimary: '#000000',
      bgSecondary: '#001100',
      bgTertiary: '#002200',
      bgHover: '#003300',
      bgActive: '#004400',
      borderPrimary: '#00ff0030',
      borderSecondary: '#00ff0050',
      borderAccent: '#00ff00',
      textPrimary: '#00ff00',
      textSecondary: '#00cc00',
      textMuted: '#009900',
      textAccent: '#00ff00',
      accent: '#00ff00',
      accentHover: '#00cc00',
      accentMuted: '#00ff0020',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff',
      gradient: 'linear-gradient(180deg, #00ff00 0%, #003300 100%)',
      glow: '0 0 10px #00ff0060',
    },
    fontFamily: '"Fira Code", "Source Code Pro", monospace',
    borderRadius: '0',
    effects: { glow: true, scanlines: true },
  },

  // RETRO THEMES
  {
    id: 'amber-terminal',
    name: 'Amber Terminal',
    description: 'Classic amber monochrome CRT',
    category: 'retro',
    colors: {
      bgPrimary: '#0a0800',
      bgSecondary: '#141000',
      bgTertiary: '#1e1800',
      bgHover: '#282000',
      bgActive: '#322800',
      borderPrimary: '#ffb00030',
      borderSecondary: '#ffb00050',
      borderAccent: '#ffb000',
      textPrimary: '#ffb000',
      textSecondary: '#cc8800',
      textMuted: '#996600',
      textAccent: '#ffcc00',
      accent: '#ffb000',
      accentHover: '#ffcc00',
      accentMuted: '#ffb00020',
      success: '#ffcc00',
      warning: '#ff8800',
      error: '#ff4400',
      info: '#ffb000',
      glow: '0 0 8px #ffb00080',
    },
    fontFamily: '"VT323", "Courier New", monospace',
    borderRadius: '0',
    effects: { crt: true, scanlines: true, glow: true },
  },
  {
    id: 'green-phosphor',
    name: 'Green Phosphor',
    description: 'Classic green screen terminal',
    category: 'retro',
    colors: {
      bgPrimary: '#001200',
      bgSecondary: '#002400',
      bgTertiary: '#003600',
      bgHover: '#004800',
      bgActive: '#005a00',
      borderPrimary: '#33ff3330',
      borderSecondary: '#33ff3350',
      borderAccent: '#33ff33',
      textPrimary: '#33ff33',
      textSecondary: '#29cc29',
      textMuted: '#1f991f',
      textAccent: '#66ff66',
      accent: '#33ff33',
      accentHover: '#66ff66',
      accentMuted: '#33ff3320',
      success: '#66ff66',
      warning: '#ffff33',
      error: '#ff3333',
      info: '#33ffff',
      glow: '0 0 8px #33ff3380',
    },
    fontFamily: '"VT323", "Courier New", monospace',
    borderRadius: '0',
    effects: { crt: true, scanlines: true, glow: true },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    description: '80s retro-futuristic vibes',
    category: 'retro',
    colors: {
      bgPrimary: '#1a0a2e',
      bgSecondary: '#2d1b4e',
      bgTertiary: '#3d2a5e',
      bgHover: '#4d3a6e',
      bgActive: '#5d4a7e',
      borderPrimary: '#ff00ff40',
      borderSecondary: '#00ffff40',
      borderAccent: '#ff00ff',
      textPrimary: '#ffffff',
      textSecondary: '#ff71ce',
      textMuted: '#b967ff',
      textAccent: '#00ffff',
      accent: '#ff00ff',
      accentHover: '#ff55ff',
      accentMuted: '#ff00ff20',
      success: '#00ff88',
      warning: '#ffcc00',
      error: '#ff0055',
      info: '#00ffff',
      gradient: 'linear-gradient(180deg, #ff00ff 0%, #00ffff 100%)',
      glow: '0 0 20px #ff00ff40',
    },
    fontFamily: '"Audiowide", "Orbitron", sans-serif',
    borderRadius: '0',
    effects: { neon: true, glow: true },
  },

  // CLASSIC
  {
    id: 'light',
    name: 'Light Mode',
    description: 'Clean light interface',
    category: 'classic',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#f1f5f9',
      bgHover: '#e2e8f0',
      bgActive: '#cbd5e1',
      borderPrimary: '#e2e8f0',
      borderSecondary: '#cbd5e1',
      borderAccent: '#6366f1',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',
      textAccent: '#6366f1',
      accent: '#6366f1',
      accentHover: '#4f46e5',
      accentMuted: '#6366f120',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    borderRadius: '0.5rem',
  },
  {
    id: 'silver-classic',
    name: 'Silver Classic',
    description: 'Classic silver gray interface',
    category: 'classic',
    colors: {
      bgPrimary: '#c0c0c0',      // Classic 98 surface
      bgSecondary: '#dfdfdf',    // Button face
      bgTertiary: '#ffffff',     // Button highlight
      bgHover: '#000080',        // Dialog blue for selections
      bgActive: '#1084d0',       // Dialog blue light
      borderPrimary: '#808080',  // Button shadow
      borderSecondary: '#dfdfdf',
      borderAccent: '#000080',   // Navy blue
      textPrimary: '#000000',
      textSecondary: '#222222',
      textMuted: '#808080',      // Button shadow gray
      textAccent: '#0000ff',     // Link blue
      accent: '#000080',         // Dialog blue
      accentHover: '#1084d0',    // Dialog blue light
      accentMuted: '#00008020',
      success: '#008000',
      warning: '#808000',
      error: '#800000',
      info: '#000080',
      gradient: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)', // 98 title bar gradient
    },
    fontFamily: '"Pixelated MS Sans Serif", Arial, sans-serif',
    borderRadius: '0',
  },
  {
    id: 'luna-blue',
    name: 'Luna Blue',
    description: 'Classic blue rolling hills aesthetic',
    category: 'classic',
    colors: {
      bgPrimary: '#ece9d8',      // XP surface color
      bgSecondary: '#ffffff',
      bgTertiary: '#d4d0c8',
      bgHover: '#316ac5',        // XP selection blue
      bgActive: '#4a90d9',
      borderPrimary: '#919b9c',
      borderSecondary: '#aca899',
      borderAccent: '#003c74',   // XP button border
      textPrimary: '#000000',
      textSecondary: '#333333',
      textMuted: '#808080',
      textAccent: '#0046d5',     // XP link/accent
      accent: '#003c74',         // XP button border blue
      accentHover: '#0053ee',
      accentMuted: '#003c7420',
      success: '#008000',
      warning: '#e68b2c',        // XP orange tab highlight
      error: '#cc0000',
      info: '#0066cc',
      gradient: 'linear-gradient(180deg, #0997ff 0%, #0053ee 8%, #0050ee 40%, #0066ff 88%, #003dd7 100%)', // Authentic XP title bar
    },
    borderRadius: '3px',
  },
  {
    id: 'aero-glass',
    name: 'Aero Glass',
    description: 'Translucent glass with soft blur',
    category: 'classic',
    colors: {
      bgPrimary: '#1c3b5a',         // Vista dark blue base
      bgSecondary: '#2a4a6a90',     // Semi-transparent
      bgTertiary: '#3a5a7a80',
      bgHover: '#4080c0',           // Selection blue
      bgActive: '#50a0e0',
      borderPrimary: '#80b0d050',   // Frosted border
      borderSecondary: '#a0d0ff30',
      borderAccent: '#5cb0f0',      // Aero accent
      textPrimary: '#ffffff',
      textSecondary: '#e8f4ff',
      textMuted: '#a8c8e8',
      textAccent: '#88d4ff',
      accent: '#2898e8',            // Vista button blue
      accentHover: '#50b8ff',
      accentMuted: '#2898e820',
      success: '#60c060',
      warning: '#e8a830',
      error: '#e05050',
      info: '#2898e8',
      gradient: 'linear-gradient(180deg, #3a6a9a 0%, #2a4a7a 50%, #1a3a5a 100%)',
      glow: '0 8px 32px #00000040',
    },
    borderRadius: '4px',
    effects: { glassmorphism: true },
  },

  // RETRO GAMING
  {
    id: 'plumber-red',
    name: 'Plumber Red',
    description: 'Classic red and white cartridge style',
    category: 'retro',
    colors: {
      bgPrimary: '#1a1a1a',
      bgSecondary: '#2d2d2d',
      bgTertiary: '#404040',
      bgHover: '#4a4a4a',
      bgActive: '#555555',
      borderPrimary: '#e60012',
      borderSecondary: '#ff4444',
      borderAccent: '#e60012',
      textPrimary: '#ffffff',
      textSecondary: '#f0f0f0',
      textMuted: '#b0b0b0',
      textAccent: '#ff6666',
      accent: '#e60012',
      accentHover: '#ff2222',
      accentMuted: '#e6001220',
      success: '#00a000',
      warning: '#f0a000',
      error: '#e60012',
      info: '#00a0d0',
    },
    borderRadius: '0.5rem',
  },
  {
    id: 'hedgehog-blue',
    name: 'Hedgehog Blue',
    description: 'Speedy blue rings and loops',
    category: 'retro',
    colors: {
      bgPrimary: '#000820',
      bgSecondary: '#001040',
      bgTertiary: '#002060',
      bgHover: '#003080',
      bgActive: '#0040a0',
      borderPrimary: '#0066ff',
      borderSecondary: '#ffcc00',
      borderAccent: '#0066ff',
      textPrimary: '#ffffff',
      textSecondary: '#aaccff',
      textMuted: '#6699cc',
      textAccent: '#ffcc00',
      accent: '#0066ff',
      accentHover: '#3388ff',
      accentMuted: '#0066ff20',
      success: '#00cc44',
      warning: '#ffcc00',
      error: '#ff3333',
      info: '#0066ff',
      gradient: 'linear-gradient(135deg, #0066ff 0%, #00ccff 100%)',
    },
    borderRadius: '0.75rem',
  },
  {
    id: 'purple-cube',
    name: 'Purple Cube',
    description: 'Iconic purple compact console',
    category: 'retro',
    colors: {
      bgPrimary: '#1a0a2e',
      bgSecondary: '#2e1555',
      bgTertiary: '#42207c',
      bgHover: '#562ba3',
      bgActive: '#6a36ca',
      borderPrimary: '#6a36ca',
      borderSecondary: '#9966ff',
      borderAccent: '#9966ff',
      textPrimary: '#ffffff',
      textSecondary: '#d4b8ff',
      textMuted: '#a080d0',
      textAccent: '#9966ff',
      accent: '#6a36ca',
      accentHover: '#8050e0',
      accentMuted: '#6a36ca30',
      success: '#00d060',
      warning: '#ffc000',
      error: '#ff4060',
      info: '#40c0ff',
      gradient: 'linear-gradient(135deg, #6a36ca 0%, #9966ff 100%)',
    },
    borderRadius: '1rem',
  },
  {
    id: 'pro-black',
    name: 'Pro Black',
    description: 'Sleek black gaming monolith',
    category: 'modern',
    colors: {
      bgPrimary: '#000000',
      bgSecondary: '#101010',
      bgTertiary: '#1a1a1a',
      bgHover: '#252525',
      bgActive: '#303030',
      borderPrimary: '#0070d1',
      borderSecondary: '#0090ff',
      borderAccent: '#0070d1',
      textPrimary: '#ffffff',
      textSecondary: '#c0c0c0',
      textMuted: '#808080',
      textAccent: '#00aaff',
      accent: '#0070d1',
      accentHover: '#0090ff',
      accentMuted: '#0070d120',
      success: '#00c070',
      warning: '#ffa000',
      error: '#e04040',
      info: '#0070d1',
    },
    borderRadius: '0.25rem',
  },
  {
    id: 'x-green',
    name: 'X Green',
    description: 'Powerful green gaming giant',
    category: 'modern',
    colors: {
      bgPrimary: '#0a0a0a',
      bgSecondary: '#141414',
      bgTertiary: '#1e1e1e',
      bgHover: '#282828',
      bgActive: '#323232',
      borderPrimary: '#107c10',
      borderSecondary: '#10a010',
      borderAccent: '#107c10',
      textPrimary: '#ffffff',
      textSecondary: '#d0d0d0',
      textMuted: '#909090',
      textAccent: '#20cc20',
      accent: '#107c10',
      accentHover: '#10a010',
      accentMuted: '#107c1020',
      success: '#107c10',
      warning: '#f0a000',
      error: '#d02020',
      info: '#2090d0',
    },
    borderRadius: '0.125rem',
  },

  // FESTIVE THEMES
  {
    id: 'christmas-classic',
    name: 'Christmas Classic',
    description: 'Traditional red and green holiday spirit',
    category: 'festive',
    colors: {
      bgPrimary: '#0f1a0f',
      bgSecondary: '#1a2a1a',
      bgTertiary: '#253525',
      bgHover: '#2d4530',
      bgActive: '#355535',
      borderPrimary: '#2d5a2d',
      borderSecondary: '#c41e3a',
      borderAccent: '#c41e3a',
      textPrimary: '#ffffff',
      textSecondary: '#b8d4b8',
      textMuted: '#7da67d',
      textAccent: '#ff6b6b',
      accent: '#c41e3a',
      accentHover: '#a01830',
      accentMuted: '#c41e3a20',
      success: '#228b22',
      warning: '#ffd700',
      error: '#c41e3a',
      info: '#4169e1',
      gradient: 'linear-gradient(135deg, #c41e3a 0%, #228b22 100%)',
    },
    borderRadius: '0.5rem',
  },
  {
    id: 'winter-wonderland',
    name: 'Winter Wonderland',
    description: 'Frosty blues and snowy whites',
    category: 'festive',
    colors: {
      bgPrimary: '#0a1628',
      bgSecondary: '#0f2038',
      bgTertiary: '#152a48',
      bgHover: '#1a3558',
      bgActive: '#204068',
      borderPrimary: '#3a6a9a',
      borderSecondary: '#88c8ff',
      borderAccent: '#88c8ff',
      textPrimary: '#ffffff',
      textSecondary: '#c8e8ff',
      textMuted: '#88b8e8',
      textAccent: '#88c8ff',
      accent: '#4a9eff',
      accentHover: '#6ab4ff',
      accentMuted: '#4a9eff20',
      success: '#50c878',
      warning: '#ffd700',
      error: '#ff6b6b',
      info: '#4a9eff',
      gradient: 'linear-gradient(180deg, #4a9eff 0%, #88c8ff 100%)',
      glow: '0 0 20px #88c8ff30',
    },
    borderRadius: '0.75rem',
    effects: { glassmorphism: true, glow: true },
  },
  {
    id: 'candy-cane',
    name: 'Candy Cane',
    description: 'Sweet red and white stripes',
    category: 'festive',
    colors: {
      bgPrimary: '#1a0a0a',
      bgSecondary: '#2a1515',
      bgTertiary: '#3a2020',
      bgHover: '#4a2a2a',
      bgActive: '#5a3535',
      borderPrimary: '#ff4040',
      borderSecondary: '#ffffff40',
      borderAccent: '#ff4040',
      textPrimary: '#ffffff',
      textSecondary: '#ffcccc',
      textMuted: '#ff9999',
      textAccent: '#ff6060',
      accent: '#ff4040',
      accentHover: '#ff6060',
      accentMuted: '#ff404020',
      success: '#50c878',
      warning: '#ffd700',
      error: '#ff4040',
      info: '#60a0ff',
      gradient: 'linear-gradient(135deg, #ff4040 0%, #ffffff 50%, #ff4040 100%)',
    },
    borderRadius: '1rem',
  },
  {
    id: 'golden-bells',
    name: 'Golden Bells',
    description: 'Luxurious gold and warm tones',
    category: 'festive',
    colors: {
      bgPrimary: '#1a150a',
      bgSecondary: '#2a2515',
      bgTertiary: '#3a3520',
      bgHover: '#4a452a',
      bgActive: '#5a5535',
      borderPrimary: '#b8860b',
      borderSecondary: '#ffd700',
      borderAccent: '#ffd700',
      textPrimary: '#fff8dc',
      textSecondary: '#f0e68c',
      textMuted: '#daa520',
      textAccent: '#ffd700',
      accent: '#ffd700',
      accentHover: '#ffed4a',
      accentMuted: '#ffd70020',
      success: '#228b22',
      warning: '#ffa500',
      error: '#c41e3a',
      info: '#4169e1',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
      glow: '0 0 15px #ffd70040',
    },
    borderRadius: '0.5rem',
    effects: { glow: true },
  },
  {
    id: 'north-pole',
    name: 'North Pole',
    description: 'Arctic nights with aurora lights',
    category: 'festive',
    colors: {
      bgPrimary: '#050510',
      bgSecondary: '#0a0a1a',
      bgTertiary: '#101025',
      bgHover: '#151530',
      bgActive: '#1a1a3a',
      borderPrimary: '#40e0d0',
      borderSecondary: '#9370db',
      borderAccent: '#40e0d0',
      textPrimary: '#e8f8f8',
      textSecondary: '#a8e8e8',
      textMuted: '#68b8b8',
      textAccent: '#40e0d0',
      accent: '#40e0d0',
      accentHover: '#60f0e0',
      accentMuted: '#40e0d020',
      success: '#40e0d0',
      warning: '#ffd700',
      error: '#ff6b6b',
      info: '#9370db',
      gradient: 'linear-gradient(135deg, #40e0d0 0%, #9370db 50%, #ff69b4 100%)',
      glow: '0 0 30px #40e0d030',
    },
    borderRadius: '0.5rem',
    effects: { glow: true, glassmorphism: true },
  },
]

interface ThemeContextType {
  theme: Theme
  setTheme: (themeId: string) => void
  customColors: Partial<ThemeColors> | null
  setCustomColors: (colors: Partial<ThemeColors> | null) => void
  availableThemes: Theme[]
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function applyTheme(theme: Theme, customColors?: Partial<ThemeColors> | null) {
  const colors = { ...theme.colors, ...customColors }
  const root = document.documentElement
  
  // Apply CSS variables
  root.style.setProperty('--bg-primary', colors.bgPrimary)
  root.style.setProperty('--bg-secondary', colors.bgSecondary)
  root.style.setProperty('--bg-tertiary', colors.bgTertiary)
  root.style.setProperty('--bg-hover', colors.bgHover)
  root.style.setProperty('--bg-active', colors.bgActive)
  
  root.style.setProperty('--border-primary', colors.borderPrimary)
  root.style.setProperty('--border-secondary', colors.borderSecondary)
  root.style.setProperty('--border-accent', colors.borderAccent)
  
  root.style.setProperty('--text-primary', colors.textPrimary)
  root.style.setProperty('--text-secondary', colors.textSecondary)
  root.style.setProperty('--text-muted', colors.textMuted)
  root.style.setProperty('--text-accent', colors.textAccent)
  
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-hover', colors.accentHover)
  root.style.setProperty('--accent-muted', colors.accentMuted)
  
  root.style.setProperty('--success', colors.success)
  root.style.setProperty('--warning', colors.warning)
  root.style.setProperty('--error', colors.error)
  root.style.setProperty('--info', colors.info)
  
  if (colors.gradient) {
    root.style.setProperty('--gradient', colors.gradient)
  }
  if (colors.glow) {
    root.style.setProperty('--glow', colors.glow)
  }
  
  // Font family
  if (theme.fontFamily) {
    root.style.setProperty('--font-family', theme.fontFamily)
  } else {
    root.style.setProperty('--font-family', '"Inter", system-ui, sans-serif')
  }
  
  // Border radius
  root.style.setProperty('--radius', theme.borderRadius || '0.5rem')
  
  // Apply effect classes to body
  const body = document.body
  body.classList.remove('effect-scanlines', 'effect-crt', 'effect-noise', 'effect-glow', 'effect-neon', 'effect-glassmorphism')
  
  if (theme.effects?.scanlines) body.classList.add('effect-scanlines')
  if (theme.effects?.crt) body.classList.add('effect-crt')
  if (theme.effects?.noise) body.classList.add('effect-noise')
  if (theme.effects?.glow) body.classList.add('effect-glow')
  if (theme.effects?.neon) body.classList.add('effect-neon')
  if (theme.effects?.glassmorphism) body.classList.add('effect-glassmorphism')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('theme') || 'ocean'
  })
  
  const [customColors, setCustomColors] = useState<Partial<ThemeColors> | null>(() => {
    const saved = localStorage.getItem('customColors')
    return saved ? JSON.parse(saved) : null
  })
  
  const theme = builtInThemes.find(t => t.id === themeId) || builtInThemes[0]
  
  useEffect(() => {
    applyTheme(theme, customColors)
    localStorage.setItem('theme', themeId)
  }, [theme, themeId, customColors])
  
  useEffect(() => {
    if (customColors) {
      localStorage.setItem('customColors', JSON.stringify(customColors))
    } else {
      localStorage.removeItem('customColors')
    }
  }, [customColors])
  
  const setTheme = (newThemeId: string) => {
    setThemeId(newThemeId)
    setCustomColors(null) // Reset custom colors when changing themes
  }
  
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        customColors,
        setCustomColors,
        availableThemes: builtInThemes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
