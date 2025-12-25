import { useEffect, useCallback, useRef } from 'react';
import { usePropertyStore, PendingProperty } from '../store/usePropertyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { generateId } from '../utils/helpers';
import { getApiUrl } from '../utils/api';
import type { Property } from '../types';

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
  const { 
    addProperty, 
    properties, 
    tags,
    pendingProperties,
    addPendingProperty,
    updatePendingProperty,
    removePendingProperty,
  } = usePropertyStore();
  const { settings } = useSettingsStore();
  const lastSyncedTags = useRef<string>('');
  const addedUrls = useRef<Set<string>>(new Set());
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
      }).catch(() => {});
    }
  }, [tags, apiUrl]);

  // Normalize URL for comparison
  const normalizeUrl = useCallback((url: string) => {
    return url.replace(/\/$/, '').split('?')[0].split('#')[0];
  }, []);

  // Check if URL already exists
  const isUrlAlreadyAdded = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    // Check in regular properties
    const inProperties = properties.some(p => normalizeUrl(p.url) === normalized);
    // Check in pending properties
    const inPending = pendingProperties.some(p => normalizeUrl(p.url) === normalized);
    // Check in our local cache
    const inCache = addedUrls.current.has(normalized);
    return inProperties || inPending || inCache;
  }, [properties, pendingProperties, normalizeUrl]);

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

  // Handle new property from extension - add to pending
  const handlePropertyAdded = useCallback((serverProp: ServerProperty) => {
    console.log('🔔 New property from extension:', serverProp.url);
    
    // Skip if already exists
    if (isUrlAlreadyAdded(serverProp.url)) {
      console.log('   Already exists, skipping');
      return;
    }

    // Add to local cache
    addedUrls.current.add(normalizeUrl(serverProp.url));

    // Add to pending properties (shows as greyed-out card in sidebar)
    const pending: PendingProperty = {
      id: serverProp.id,
      url: serverProp.url,
      status: 'processing',
      addedAt: serverProp.addedAt,
    };
    addPendingProperty(pending);

  }, [isUrlAlreadyAdded, normalizeUrl, addPendingProperty]);

  // Handle property updated - move from pending to real
  const handlePropertyUpdated = useCallback(async (serverProp: ServerProperty) => {
    console.log('🔔 Property updated:', serverProp.processingStatus, serverProp.title);
    
    if (serverProp.processingStatus === 'completed' && serverProp.coordinates) {
      // Remove from pending
      removePendingProperty(serverProp.id);

      // Check if already in real properties
      if (properties.some(p => normalizeUrl(p.url) === normalizeUrl(serverProp.url))) {
        console.log('   Already in properties, skipping');
        return;
      }

      // Calculate distances
      const distances = await calculateDistances(serverProp.coordinates);

      // Add to real properties
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

      // Mark as processed on server
      fetch(`${apiUrl}/api/mark-processed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serverProp.id }),
      }).catch(() => {});

    } else if (serverProp.processingStatus === 'failed') {
      // Update pending property to show error
      updatePendingProperty(serverProp.id, {
        status: 'failed',
        error: serverProp.error || 'Processing failed',
      });
    }
  }, [properties, normalizeUrl, calculateDistances, addProperty, removePendingProperty, updatePendingProperty, apiUrl]);

  // Sync any pending completed properties on load
  const syncPendingProperties = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/pending-properties`);
      if (!response.ok) return;

      const pending: ServerProperty[] = await response.json();
      
      for (const prop of pending) {
        if (prop.processingStatus === 'completed' && prop.coordinates) {
          await handlePropertyUpdated(prop);
        } else if (prop.processingStatus === 'processing' || prop.processingStatus === 'pending') {
          // Add to pending if not already there
          if (!pendingProperties.some(p => p.id === prop.id)) {
            handlePropertyAdded(prop);
          }
        }
      }
    } catch (error) {
      // Silently fail
    }
  }, [handlePropertyUpdated, handlePropertyAdded, pendingProperties, apiUrl]);

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
            // Update status if we have this pending property
            if (data.status === 'failed') {
              updatePendingProperty(data.propertyId, {
                status: 'failed',
                error: data.error || 'Processing failed',
              });
            }
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

    // Initial sync
    syncPendingProperties();

    // Poll every 15 seconds as fallback
    const interval = setInterval(syncPendingProperties, 15000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(interval);
    };
  }, [handlePropertyAdded, handlePropertyUpdated, updatePendingProperty, syncPendingProperties, apiUrl]);
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
