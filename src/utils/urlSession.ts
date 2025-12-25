import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Property, PropertyTag, CenterPoint, Filters } from '../types';

// Version for future migrations
const CURRENT_VERSION = 1;

// URL session state structure (short keys to minimize URL size)
export interface UrlSessionState {
  v: number;          // version
  p: Property[];      // properties
  t: PropertyTag[];   // tags
  c: CenterPoint;     // center point
  f: Filters;         // filters
}

// Minimum keys for a valid state
const DEFAULT_CENTER: CenterPoint = {
  name: 'Bank of England, London',
  lat: 51.5142,
  lng: -0.0885,
};

const DEFAULT_FILTERS: Filters = {
  maxDistance: null,
  minPrice: null,
  maxPrice: null,
  minRating: null,
  btrOnly: false,
  selectedTags: [],
  searchQuery: '',
  sortBy: 'createdAt',
  sortDirection: 'desc',
};

/**
 * Encode session state to a URL-safe compressed string
 */
export function encodeSessionState(state: UrlSessionState): string {
  const json = JSON.stringify(state);
  return compressToEncodedURIComponent(json);
}

/**
 * Decode a compressed URL string back to session state
 */
export function decodeSessionState(encoded: string): UrlSessionState | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    
    const state = JSON.parse(json) as UrlSessionState;
    
    // Validate basic structure
    if (typeof state.v !== 'number' || !Array.isArray(state.p)) {
      return null;
    }
    
    // Future: handle version migrations here
    if (state.v !== CURRENT_VERSION) {
      console.warn(`URL session version mismatch: expected ${CURRENT_VERSION}, got ${state.v}`);
      // For now, still try to use it
    }
    
    return state;
  } catch (error) {
    console.error('Failed to decode session state:', error);
    return null;
  }
}

/**
 * Build a complete session state from store data
 */
export function buildSessionState(
  properties: Property[],
  tags: PropertyTag[],
  centerPoint: CenterPoint,
  filters: Filters
): UrlSessionState {
  return {
    v: CURRENT_VERSION,
    p: properties,
    t: tags,
    c: centerPoint,
    f: filters,
  };
}

/**
 * Get the current URL hash (without the # prefix)
 */
export function getUrlHash(): string {
  return window.location.hash.slice(1); // Remove the # prefix
}

/**
 * Set the URL hash without triggering a navigation
 */
export function setUrlHash(hash: string): void {
  const newUrl = `${window.location.pathname}${window.location.search}#${hash}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Get the full shareable URL with current session
 */
export function getShareableUrl(): string {
  return window.location.href;
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Check if user has seen the welcome modal before
 */
export function hasSeenWelcomeModal(): boolean {
  return localStorage.getItem('rent-shortlist-welcome-seen') === 'true';
}

/**
 * Mark that user has seen the welcome modal
 */
export function markWelcomeModalSeen(): void {
  localStorage.setItem('rent-shortlist-welcome-seen', 'true');
}

/**
 * Check if URL has a session hash
 */
export function hasSessionInUrl(): boolean {
  const hash = getUrlHash();
  return hash.length > 0;
}

/**
 * Estimate the size of the encoded URL
 */
export function getEncodedSize(encoded: string): number {
  return encoded.length;
}

/**
 * Check if URL is approaching browser limits (warn at 6KB, error at 8KB)
 */
export function checkUrlLength(encoded: string): 'ok' | 'warning' | 'error' {
  const size = getEncodedSize(encoded);
  if (size > 8000) return 'error';
  if (size > 6000) return 'warning';
  return 'ok';
}

/**
 * Create an empty/default session state
 */
export function createEmptySession(): UrlSessionState {
  return {
    v: CURRENT_VERSION,
    p: [],
    t: [],
    c: DEFAULT_CENTER,
    f: DEFAULT_FILTERS,
  };
}

