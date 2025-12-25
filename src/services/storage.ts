// Storage keys
const PROPERTIES_KEY = 'rent-shortlist-properties';
const SETTINGS_KEY = 'rent-shortlist-settings';

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading from storage:', error);
  }
  return defaultValue;
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(PROPERTIES_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}
