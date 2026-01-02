import { decompressFromEncodedURIComponent } from 'lz-string';
import type { Property, PropertyTag, CenterPoint, Filters, Project } from '../types';

// Version for future migrations (v2 adds project support)
const CURRENT_VERSION = 2;

// API base URL
const API_BASE = '/api';

// URL session state structure
export interface UrlSessionState {
  v: number;          // version
  p: Property[];      // properties
  t: PropertyTag[];   // tags
  c: CenterPoint;     // center point (legacy, kept for backwards compat)
  f: Filters;         // filters
  proj?: Project;     // project with city context (v2+)
}

// Default values - no longer London-specific
const DEFAULT_CENTER: CenterPoint = {
  name: '',
  lat: 0,
  lng: 0,
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

// ============================================
// Server-side Session API
// ============================================

interface SaveSessionResponse {
  id: string;
  url: string;
}

interface LoadSessionResponse {
  id: string;
  data: UrlSessionState;
}

/**
 * Save session to server and get a friendly short URL
 */
export async function saveSession(
  state: UrlSessionState,
  existingId?: string
): Promise<SaveSessionResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: existingId, data: state }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save session: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving session:', error);
    return null;
  }
}

/**
 * Load session from server by ID
 */
export async function loadSession(id: string): Promise<UrlSessionState | null> {
  try {
    const response = await fetch(`${API_BASE}/sessions/${id}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to load session: ${response.status}`);
    }

    const result: LoadSessionResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}

// ============================================
// URL Parsing
// ============================================

/**
 * Extract session ID from URL path (e.g., /s/sunny-flat-42)
 */
export function getSessionIdFromUrl(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/s\/([a-z0-9-]+)$/i);
  return match ? match[1] : null;
}

/**
 * Check if URL has a session (either /s/:id or legacy hash)
 */
export function hasSessionInUrl(): boolean {
  return getSessionIdFromUrl() !== null || getUrlHash().length > 0;
}

/**
 * Get the current session ID (stored in localStorage after first save)
 */
export function getCurrentSessionId(): string | null {
  return localStorage.getItem('rent-shortlist-session-id');
}

/**
 * Store the current session ID
 */
export function setCurrentSessionId(id: string): void {
  localStorage.setItem('rent-shortlist-session-id', id);
}

/**
 * Update browser URL to show the session
 */
export function updateUrlWithSession(sessionId: string): void {
  const newUrl = `/s/${sessionId}`;
  if (window.location.pathname !== newUrl) {
    window.history.replaceState(null, '', newUrl);
  }
}

/**
 * Get the full shareable URL for a session
 */
export function getShareableUrl(sessionId?: string): string {
  const id = sessionId || getCurrentSessionId();
  if (id) {
    return `${window.location.origin}/s/${id}`;
  }
  return window.location.href;
}

// ============================================
// Legacy Hash-based Support (for migration)
// ============================================

/**
 * Get the current URL hash (without the # prefix)
 */
export function getUrlHash(): string {
  return window.location.hash.slice(1);
}

/**
 * Decode legacy hash-based session
 */
export function decodeLegacySession(encoded: string): UrlSessionState | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const state = JSON.parse(json) as UrlSessionState;

    if (typeof state.v !== 'number' || !Array.isArray(state.p)) {
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to decode legacy session:', error);
    return null;
  }
}

// ============================================
// State Building
// ============================================

/**
 * Build a complete session state from store data
 */
export function buildSessionState(
  properties: Property[],
  tags: PropertyTag[],
  centerPoint: CenterPoint,
  filters: Filters,
  project?: Project | null
): UrlSessionState {
  return {
    v: CURRENT_VERSION,
    p: properties,
    t: tags,
    c: centerPoint,
    f: filters,
    proj: project || undefined,
  };
}

/**
 * Create an empty/default session state
 */
export function createEmptySession(project?: Project | null): UrlSessionState {
  const centerPoint = project?.centerPoint || DEFAULT_CENTER;
  return {
    v: CURRENT_VERSION,
    p: [],
    t: [],
    c: centerPoint,
    f: DEFAULT_FILTERS,
    proj: project || undefined,
  };
}

// ============================================
// Utilities
// ============================================

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
