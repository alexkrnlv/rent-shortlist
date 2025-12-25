import { useEffect, useRef, useCallback, useState } from 'react';
import { usePropertyStore } from '../store/usePropertyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  saveSession,
  loadSession,
  buildSessionState,
  getSessionIdFromUrl,
  getCurrentSessionId,
  setCurrentSessionId,
  updateUrlWithSession,
  getUrlHash,
  decodeLegacySession,
  type UrlSessionState,
} from '../utils/urlSession';

interface UseUrlSessionReturn {
  sessionId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

/**
 * Hook to sync app state with server-side sessions
 * - Loads session from URL on mount if present
 * - Auto-saves changes to the server
 * - Updates URL with friendly session ID
 */
export function useUrlSession(): UseUrlSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedHashRef = useRef<string>('');

  // Get store states
  const properties = usePropertyStore((state) => state.properties);
  const tags = usePropertyStore((state) => state.tags);
  const filters = usePropertyStore((state) => state.filters);
  const centerPoint = useSettingsStore((state) => state.settings.centerPoint);

  // Store setters
  const propertyStore = usePropertyStore;
  const settingsStore = useSettingsStore;

  // Apply session state to stores
  const applySessionToStores = useCallback((session: UrlSessionState) => {
    propertyStore.setState({
      properties: session.p || [],
      tags: session.t || [],
      filters: session.f,
      selectedPropertyId: null,
    });

    if (session.c) {
      settingsStore.getState().setCenterPoint(session.c);
    }
  }, [propertyStore, settingsStore]);

  // Save current state to server
  const saveToServer = useCallback(async () => {
    const state = buildSessionState(properties, tags, centerPoint, filters);
    const stateHash = JSON.stringify(state);
    
    // Skip if nothing changed
    if (stateHash === lastSavedHashRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      const currentId = sessionId || getCurrentSessionId();
      const result = await saveSession(state, currentId || undefined);
      
      if (result) {
        setSessionId(result.id);
        setCurrentSessionId(result.id);
        updateUrlWithSession(result.id);
        lastSavedHashRef.current = stateHash;
        setError(null);
      }
    } catch (err) {
      console.error('Failed to save session:', err);
      setError('Failed to save session');
    } finally {
      setIsSaving(false);
    }
  }, [properties, tags, centerPoint, filters, sessionId]);

  // Initialize: load session from URL or localStorage
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
      setIsLoading(true);
      
      try {
        // Check for session ID in URL path (/s/:id)
        const urlSessionId = getSessionIdFromUrl();
        
        if (urlSessionId) {
          // Load from server
          const session = await loadSession(urlSessionId);
          if (session) {
            applySessionToStores(session);
            setSessionId(urlSessionId);
            setCurrentSessionId(urlSessionId);
            lastSavedHashRef.current = JSON.stringify(session);
          } else {
            setError('Session not found');
          }
        } else {
          // Check for legacy hash-based session
          const hash = getUrlHash();
          if (hash) {
            const legacySession = decodeLegacySession(hash);
            if (legacySession) {
              applySessionToStores(legacySession);
              // Migrate to server-side session
              const result = await saveSession(legacySession);
              if (result) {
                setSessionId(result.id);
                setCurrentSessionId(result.id);
                updateUrlWithSession(result.id);
                lastSavedHashRef.current = JSON.stringify(legacySession);
              }
            }
          } else {
            // Check for existing session ID in localStorage
            const existingId = getCurrentSessionId();
            if (existingId) {
              const session = await loadSession(existingId);
              if (session) {
                applySessionToStores(session);
                setSessionId(existingId);
                updateUrlWithSession(existingId);
                lastSavedHashRef.current = JSON.stringify(session);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error initializing session:', err);
        setError('Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [applySessionToStores]);

  // Auto-save on state changes (debounced)
  useEffect(() => {
    // Skip during initial load
    if (!isInitializedRef.current || isLoading) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(() => {
      saveToServer();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [properties, tags, centerPoint, filters, saveToServer, isLoading]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = async () => {
      const urlSessionId = getSessionIdFromUrl();
      if (urlSessionId && urlSessionId !== sessionId) {
        const session = await loadSession(urlSessionId);
        if (session) {
          applySessionToStores(session);
          setSessionId(urlSessionId);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [sessionId, applySessionToStores]);

  return {
    sessionId,
    isLoading,
    isSaving,
    error,
  };
}
