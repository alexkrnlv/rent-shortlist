import { useEffect, useCallback, useRef } from 'react';
import { usePropertyStore } from '../store/usePropertyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { generateId } from '../utils/helpers';
import { getApiUrl } from '../utils/api';
import type { Property } from '../types';

// Toast notification callback type
type ToastCallback = (toast: {
  type: 'success' | 'error' | 'info' | 'processing';
  title: string;
  message?: string;
  duration?: number;
}) => void;

// Global toast callback - set by the component that renders toasts
let globalToastCallback: ToastCallback | null = null;

export function setToastCallback(callback: ToastCallback | null) {
  globalToastCallback = callback;
}

function showToast(toast: Parameters<ToastCallback>[0]) {
  if (globalToastCallback) {
    globalToastCallback(toast);
  }
}

// Server-processed property from extension
interface ServerProperty {
  id: string;
  url: string;
  title: string;
  address: string;
  thumbnail: string;
  price?: string;
  coordinates?: { lat: number; lng: number } | null;
  isBTR: boolean;
  tags: string[];
  addedAt: string;
  processed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export function useExtensionSync() {
  const { addProperty, properties, tags } = usePropertyStore();
  const { settings } = useSettingsStore();
  const lastSyncedTags = useRef<string>('');
  const addedIds = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  const apiUrl = getApiUrl();

  // Sync tags to server whenever they change
  useEffect(() => {
    const tagsJson = JSON.stringify(tags);
    if (tagsJson !== lastSyncedTags.current) {
      lastSyncedTags.current = tagsJson;
      fetch(`${apiUrl}/api/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      }).catch(() => {
        // Silently fail if server not running
      });
    }
  }, [tags, apiUrl]);

  // Check if URL already exists in properties
  const isUrlAlreadyAdded = useCallback((url: string) => {
    const normalizedUrl = url.replace(/\/$/, '').split('?')[0];
    return properties.some(p => {
      const pUrl = p.url.replace(/\/$/, '').split('?')[0];
      return pUrl === normalizedUrl;
    });
  }, [properties]);

  // Calculate distances from property to center point
  const calculateDistances = useCallback(async (
    coordinates: { lat: number; lng: number }
  ): Promise<Property['distances']> => {
    if (!settings.centerPoint) return null;

    try {
      const response = await fetch(`${apiUrl}/api/distances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: coordinates,
          destination: settings.centerPoint,
        }),
      });
      
      if (!response.ok) return null;
      
      const distData = await response.json();
      return {
        direct: calculateDirectDistance(coordinates, settings.centerPoint),
        publicTransport: distData.transit ? { distance: distData.transit.distance, duration: distData.transit.duration } : null,
        walking: distData.walking ? { distance: distData.walking.distance, duration: distData.walking.duration } : null,
        driving: distData.driving ? { distance: distData.driving.distance, duration: distData.driving.duration } : null,
      };
    } catch (e) {
      console.log('Could not calculate distances:', e);
      return null;
    }
  }, [settings.centerPoint, apiUrl]);

  // Add a completed property to the store
  const addCompletedProperty = useCallback(async (serverProp: ServerProperty) => {
    // Skip if already added to prevent duplicates
    if (addedIds.current.has(serverProp.id)) {
      return;
    }
    
    // Skip if URL already in properties
    if (isUrlAlreadyAdded(serverProp.url)) {
      console.log('Property URL already exists, skipping:', serverProp.url);
      // Mark as processed on server
      fetch(`${apiUrl}/api/mark-processed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serverProp.id }),
      }).catch(() => {});
      return;
    }

    // Only add properties that have been processed with coordinates
    if (!serverProp.coordinates) {
      console.log('Property has no coordinates, skipping:', serverProp.url);
      return;
    }

    addedIds.current.add(serverProp.id);

    // Calculate distances if we have a center point
    const distances = await calculateDistances(serverProp.coordinates);

    // Create property for the store
    const property: Property = {
      id: generateId(),
      url: serverProp.url,
      name: serverProp.title || 'Property',
      address: serverProp.address || '',
      thumbnail: serverProp.thumbnail || '',
      coordinates: serverProp.coordinates,
      distances,
      comment: '',
      rating: null,
      price: serverProp.price,
      isBTR: serverProp.isBTR || false,
      tags: serverProp.tags || [],
      createdAt: serverProp.addedAt,
    };

    addProperty(property);
    console.log('✅ Property added to store:', property.name);

    // Show success toast
    showToast({
      type: 'success',
      title: 'Property Added!',
      message: property.name || property.address || 'Added to your shortlist',
    });

    // Mark as processed on server
    fetch(`${apiUrl}/api/mark-processed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: serverProp.id }),
    }).catch(() => {});

  }, [addProperty, isUrlAlreadyAdded, calculateDistances, apiUrl]);

  // Handle property-added event (new property from extension)
  const handlePropertyAdded = useCallback((serverProp: ServerProperty) => {
    console.log('🔔 New property from extension:', serverProp.url);
    
    // Show processing toast
    showToast({
      type: 'processing',
      title: 'Processing Property',
      message: 'AI is parsing the listing...',
      duration: 10000, // Longer duration for processing
    });

    // If already completed with coordinates, add immediately
    if (serverProp.processingStatus === 'completed' && serverProp.coordinates) {
      addCompletedProperty(serverProp);
    }
    // Otherwise, wait for property-updated event
  }, [addCompletedProperty]);

  // Handle property-updated event (server finished processing)
  const handlePropertyUpdated = useCallback((serverProp: ServerProperty) => {
    console.log('🔔 Property updated:', serverProp.processingStatus, serverProp.title);
    
    if (serverProp.processingStatus === 'completed' && serverProp.coordinates) {
      addCompletedProperty(serverProp);
    } else if (serverProp.processingStatus === 'failed') {
      showToast({
        type: 'error',
        title: 'Processing Failed',
        message: serverProp.error || 'Could not parse property details',
      });
    }
  }, [addCompletedProperty]);

  // Fetch and process any pending completed properties
  const syncPendingProperties = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/pending-properties`);
      if (!response.ok) return;

      const pending: ServerProperty[] = await response.json();
      
      // Add any completed properties that we haven't added yet
      for (const prop of pending) {
        if (prop.processingStatus === 'completed' && prop.coordinates) {
          await addCompletedProperty(prop);
        }
      }
    } catch (error) {
      // Silently fail
    }
  }, [addCompletedProperty, apiUrl]);

  // Set up Server-Sent Events for real-time updates
  useEffect(() => {
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${apiUrl}/api/events`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'property-added') {
            handlePropertyAdded(data.property);
          } else if (data.type === 'property-updated') {
            handlePropertyUpdated(data.property);
          } else if (data.type === 'property-processing') {
            // Just a status update, could show in UI
            console.log('Property processing status:', data.propertyId, data.status);
          }
        } catch (e) {
          console.log('SSE parse error:', e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    // Initial sync of any pending completed properties
    syncPendingProperties();

    // Poll every 30 seconds as a fallback
    const interval = setInterval(syncPendingProperties, 30000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(interval);
    };
  }, [handlePropertyAdded, handlePropertyUpdated, syncPendingProperties, apiUrl]);
}

// Calculate direct distance in km using Haversine formula
function calculateDirectDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
