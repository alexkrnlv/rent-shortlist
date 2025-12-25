import { useEffect, useRef, useCallback } from 'react';
import { usePropertyStore } from '../store/usePropertyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  encodeSessionState,
  decodeSessionState,
  buildSessionState,
  getUrlHash,
  setUrlHash,
  hasSessionInUrl,
  checkUrlLength,
  type UrlSessionState,
} from '../utils/urlSession';

interface UseUrlSessionReturn {
  isLoadedFromUrl: boolean;
  syncToUrl: () => void;
  urlStatus: 'ok' | 'warning' | 'error';
}

/**
 * Hook to sync app state with URL hash
 * - Loads state from URL on mount if present
 * - Auto-syncs state changes to URL
 */
export function useUrlSession(): UseUrlSessionReturn {
  const isInitializedRef = useRef(false);
  const isLoadedFromUrlRef = useRef(false);
  const urlStatusRef = useRef<'ok' | 'warning' | 'error'>('ok');
  
  // Get store states and actions
  const properties = usePropertyStore((state) => state.properties);
  const tags = usePropertyStore((state) => state.tags);
  const filters = usePropertyStore((state) => state.filters);
  const centerPoint = useSettingsStore((state) => state.settings.centerPoint);
  
  // Store setters - we need direct access to set state
  const propertyStore = usePropertyStore;
  const settingsStore = useSettingsStore;

  // Load state from URL
  const loadFromUrl = useCallback(() => {
    if (!hasSessionInUrl()) {
      return false;
    }

    const hash = getUrlHash();
    const sessionState = decodeSessionState(hash);
    
    if (!sessionState) {
      console.warn('Failed to decode session from URL, starting fresh');
      return false;
    }

    // Apply the loaded state to stores
    applySessionToStores(sessionState);
    return true;
  }, []);

  // Apply decoded session state to stores
  const applySessionToStores = (session: UrlSessionState) => {
    // Clear and set properties
    propertyStore.setState({
      properties: session.p || [],
      tags: session.t || [],
      filters: session.f,
      selectedPropertyId: null,
    });

    // Set center point
    if (session.c) {
      settingsStore.getState().setCenterPoint(session.c);
    }
  };

  // Sync current state to URL
  const syncToUrl = useCallback(() => {
    const state = buildSessionState(properties, tags, centerPoint, filters);
    const encoded = encodeSessionState(state);
    
    // Check URL length
    const status = checkUrlLength(encoded);
    urlStatusRef.current = status;
    
    if (status === 'error') {
      console.warn('URL too long! Some data may not be saved properly.');
    }
    
    setUrlHash(encoded);
  }, [properties, tags, centerPoint, filters]);

  // Initialize: load from URL on first mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Try to load from URL
    const loadedFromUrl = loadFromUrl();
    isLoadedFromUrlRef.current = loadedFromUrl;

    // If we didn't load from URL, sync current state to URL
    if (!loadedFromUrl) {
      // Small delay to ensure stores are hydrated from localStorage
      const timer = setTimeout(() => {
        syncToUrl();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loadFromUrl, syncToUrl]);

  // Auto-sync state changes to URL (debounced)
  useEffect(() => {
    // Skip first render to avoid double-sync on init
    if (!isInitializedRef.current) return;

    // Debounce URL updates
    const timer = setTimeout(() => {
      syncToUrl();
    }, 300);

    return () => clearTimeout(timer);
  }, [properties, tags, centerPoint, filters, syncToUrl]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (hasSessionInUrl()) {
        loadFromUrl();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadFromUrl]);

  return {
    isLoadedFromUrl: isLoadedFromUrlRef.current,
    syncToUrl,
    urlStatus: urlStatusRef.current,
  };
}

