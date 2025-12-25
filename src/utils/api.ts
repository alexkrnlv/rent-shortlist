// Get the API URL based on environment
export function getApiUrl(): string {
  // In development, API runs on port 3001
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  // In production, API is on the same origin
  return window.location.origin;
}

