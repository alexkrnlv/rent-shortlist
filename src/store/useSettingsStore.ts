import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, CenterPoint, ThemeMode, Project, CityContext } from '../types';

const DEFAULT_CENTER: CenterPoint = {
  name: '',
  lat: 0,
  lng: 0,
};

// Popular cities with their geocoding context
export const POPULAR_CITIES: CityContext[] = [
  { name: 'London', country: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', country: 'GB', countryName: 'United Kingdom', lat: 53.4808, lng: -2.2426 },
  { name: 'Birmingham', country: 'GB', countryName: 'United Kingdom', lat: 52.4862, lng: -1.8904 },
  { name: 'Edinburgh', country: 'GB', countryName: 'United Kingdom', lat: 55.9533, lng: -3.1883 },
  { name: 'Glasgow', country: 'GB', countryName: 'United Kingdom', lat: 55.8642, lng: -4.2518 },
  { name: 'Bristol', country: 'GB', countryName: 'United Kingdom', lat: 51.4545, lng: -2.5879 },
  { name: 'Leeds', country: 'GB', countryName: 'United Kingdom', lat: 53.8008, lng: -1.5491 },
  { name: 'Liverpool', country: 'GB', countryName: 'United Kingdom', lat: 53.4084, lng: -2.9916 },
  { name: 'Newcastle', country: 'GB', countryName: 'United Kingdom', lat: 54.9783, lng: -1.6178 },
  { name: 'Cambridge', country: 'GB', countryName: 'United Kingdom', lat: 52.2053, lng: 0.1218 },
  { name: 'Oxford', country: 'GB', countryName: 'United Kingdom', lat: 51.7520, lng: -1.2577 },
  { name: 'New York', country: 'US', countryName: 'United States', lat: 40.7128, lng: -74.0060 },
  { name: 'San Francisco', country: 'US', countryName: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Los Angeles', country: 'US', countryName: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', country: 'US', countryName: 'United States', lat: 41.8781, lng: -87.6298 },
  { name: 'Boston', country: 'US', countryName: 'United States', lat: 42.3601, lng: -71.0589 },
  { name: 'Seattle', country: 'US', countryName: 'United States', lat: 47.6062, lng: -122.3321 },
  { name: 'Austin', country: 'US', countryName: 'United States', lat: 30.2672, lng: -97.7431 },
  { name: 'Denver', country: 'US', countryName: 'United States', lat: 39.7392, lng: -104.9903 },
  { name: 'Toronto', country: 'CA', countryName: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'CA', countryName: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Sydney', country: 'AU', countryName: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'AU', countryName: 'Australia', lat: -37.8136, lng: 144.9631 },
  { name: 'Paris', country: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'DE', countryName: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Amsterdam', country: 'NL', countryName: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Dublin', country: 'IE', countryName: 'Ireland', lat: 53.3498, lng: -6.2603 },
  { name: 'Singapore', country: 'SG', countryName: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Hong Kong', country: 'HK', countryName: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Tokyo', country: 'JP', countryName: 'Japan', lat: 35.6762, lng: 139.6503 },
];

interface SettingsState {
  settings: Settings;
  setGoogleMapsApiKey: (key: string) => void;
  setClaudeApiKey: (key: string) => void;
  setCenterPoint: (center: CenterPoint) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setProject: (project: Project) => void;
  setCity: (city: CityContext) => void;
  hasRequiredKeys: () => boolean;
  hasProject: () => boolean;
  getEffectiveCenterPoint: () => CenterPoint;
  getCityContext: () => CityContext | null;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        project: null,
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
        set((state) => {
          // If we have a project, update it there too
          if (state.settings.project) {
            return {
              settings: {
                ...state.settings,
                centerPoint: center,
                project: {
                  ...state.settings.project,
                  centerPoint: center,
                },
              },
            };
          }
          return {
            settings: { ...state.settings, centerPoint: center },
          };
        }),
      setThemeMode: (mode: ThemeMode) =>
        set((state) => ({
          settings: { ...state.settings, themeMode: mode },
        })),
      setProject: (project: Project) =>
        set((state) => ({
          settings: {
            ...state.settings,
            project,
            centerPoint: project.centerPoint, // Keep in sync
          },
        })),
      setCity: (city: CityContext) =>
        set((state) => {
          // Create a default center point at city center when city is set
          const newCenterPoint: CenterPoint = {
            name: `City Center, ${city.name}`,
            lat: city.lat,
            lng: city.lng,
          };
          const newProject: Project = {
            city,
            centerPoint: state.settings.project?.centerPoint || newCenterPoint,
          };
          // If no existing center point or it's at default (0,0), use city center
          if (!state.settings.project?.centerPoint?.lat) {
            newProject.centerPoint = newCenterPoint;
          }
          return {
            settings: {
              ...state.settings,
              project: newProject,
              centerPoint: newProject.centerPoint,
            },
          };
        }),
      hasRequiredKeys: () => {
        const { settings } = get();
        return !!settings.googleMapsApiKey;
      },
      hasProject: () => {
        const { settings } = get();
        return !!settings.project?.city;
      },
      getEffectiveCenterPoint: () => {
        const { settings } = get();
        // Return project center point if available, otherwise legacy center point
        if (settings.project?.centerPoint?.lat) {
          return settings.project.centerPoint;
        }
        // If legacy center point is set (non-zero), use it
        if (settings.centerPoint?.lat) {
          return settings.centerPoint;
        }
        // No center point set
        return DEFAULT_CENTER;
      },
      getCityContext: () => {
        const { settings } = get();
        return settings.project?.city || null;
      },
    }),
    { name: 'rent-shortlist-settings' }
  )
);
