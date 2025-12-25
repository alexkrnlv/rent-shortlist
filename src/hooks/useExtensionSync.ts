import { useEffect, useCallback, useRef } from 'react';
import { usePropertyStore } from '../store/usePropertyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { generateId } from '../utils/helpers';
import { getApiUrl } from '../utils/api';
import type { Property } from '../types';

interface PendingProperty {
  id: string;
  url: string;
  title: string;
  address: string;
  thumbnail: string;
  price?: string;
  coordinates?: { lat: number; lng: number };
  isBTR: boolean;
  tags: string[];
  addedAt: string;
}

export function useExtensionSync() {
  const { addProperty, properties, tags } = usePropertyStore();
  const { settings } = useSettingsStore();
  const lastSyncedTags = useRef<string>('');
  const isProcessing = useRef(false);
  const processingIds = useRef<Set<string>>(new Set());
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

  // Process a single pending property
  const processProperty = useCallback(async (item: PendingProperty) => {
    // Skip if already processing
    if (processingIds.current.has(item.id)) return;
    
    // Skip if URL already in properties
    if (isUrlAlreadyAdded(item.url)) {
      // Mark as processed on server
      await fetch(`${apiUrl}/api/mark-processed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => {});
      return;
    }

    processingIds.current.add(item.id);

    try {
      // If we already have coordinates from the extension, use them directly
      let coordinates = item.coordinates;
      let distances: Property['distances'] = null;

      // Calculate distances if we have coordinates and a center point
      if (coordinates && settings.centerPoint) {
        try {
          const distResponse = await fetch(`${apiUrl}/api/distances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: coordinates,
              destination: settings.centerPoint,
            }),
          });
          
          if (distResponse.ok) {
            const distData = await distResponse.json();
            distances = {
              transit: distData.transit?.duration,
              walking: distData.walking?.duration,
              driving: distData.driving?.duration,
              direct: calculateDirectDistance(coordinates, settings.centerPoint),
            };
          }
        } catch (e) {
          console.log('Could not calculate distances:', e);
        }
      }

      if (coordinates) {
        const property: Property = {
          id: generateId(),
          url: item.url,
          name: item.title || 'Property',
          address: item.address || '',
          thumbnail: item.thumbnail,
          coordinates,
          distances,
          comment: '',
          rating: null,
          price: item.price,
          isBTR: item.isBTR,
          tags: item.tags || [],
          createdAt: item.addedAt,
        };

        addProperty(property);
        console.log('Property added from extension:', property.name);
      }

      // Mark as processed on server
      await fetch(`${apiUrl}/api/mark-processed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
    } catch (error) {
      console.error('Error processing extension property:', error);
      // Still mark as processed to avoid infinite retries
      await fetch(`${apiUrl}/api/mark-processed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => {});
    } finally {
      processingIds.current.delete(item.id);
    }
  }, [addProperty, settings.centerPoint, isUrlAlreadyAdded, apiUrl]);

  // Fetch and process all pending properties
  const processPendingProperties = useCallback(async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      const response = await fetch(`${apiUrl}/api/pending-properties`);
      if (!response.ok) {
        isProcessing.current = false;
        return;
      }

      const pending: PendingProperty[] = await response.json();

      for (const item of pending) {
        await processProperty(item);
      }
    } catch (error) {
      // Silently fail - server might not be running
    } finally {
      isProcessing.current = false;
    }
  }, [processProperty, apiUrl]);

  // Set up Server-Sent Events for real-time updates
  useEffect(() => {
    // Connect to SSE endpoint
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
            // Process the new property immediately
            processProperty(data.property);
          }
        } catch (e) {
          console.log('SSE parse error:', e);
        }
      };

      eventSource.onerror = () => {
        // Reconnect after a delay
        eventSource.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    // Initial check for pending properties
    processPendingProperties();

    // Also poll every 10 seconds as a fallback
    const interval = setInterval(processPendingProperties, 10000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(interval);
    };
  }, [processPendingProperties, processProperty, apiUrl]);
}

// Calculate direct distance in km using Haversine formula
function calculateDirectDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
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
