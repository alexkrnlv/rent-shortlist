import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, CenterPoint, ThemeMode } from '../types';

const DEFAULT_CENTER: CenterPoint = {
  name: 'Bank of England, London',
  lat: 51.5142,
  lng: -0.0885,
};

interface SettingsState {
  settings: Settings;
  setGoogleMapsApiKey: (key: string) => void;
  setClaudeApiKey: (key: string) => void;
  setCenterPoint: (center: CenterPoint) => void;
  setThemeMode: (mode: ThemeMode) => void;
  hasRequiredKeys: () => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        centerPoint: DEFAULT_CENTER,
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        claudeApiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
        themeMode: 'auto',
      },
      setGoogleMapsApiKey: (key: string) =>
        set((state) => ({
          settings: { ...state.settings, googleMapsApiKey: key },
        })),
      setClaudeApiKey: (key: string) =>
        set((state) => ({
          settings: { ...state.settings, claudeApiKey: key },
        })),
      setCenterPoint: (center: CenterPoint) =>
        set((state) => ({
          settings: { ...state.settings, centerPoint: center },
        })),
      setThemeMode: (mode: ThemeMode) =>
        set((state) => ({
          settings: { ...state.settings, themeMode: mode },
        })),
      hasRequiredKeys: () => {
        const { settings } = get();
        return !!settings.googleMapsApiKey;
      },
    }),
    { name: 'rent-shortlist-settings' }
  )
);
