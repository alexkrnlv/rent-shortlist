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
  needsProcessing?: boolean;
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

  // Fetch and parse property details from URL
  const fetchPropertyDetails = useCallback(async (url: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/fetch-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch property');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching property details:', error);
      return null;
    }
  }, [apiUrl]);

  // Geocode an address
  const geocodeAddress = useCallback(async (address: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      if (data.lat && data.lng) {
        return { lat: data.lat, lng: data.lng };
      }
      return null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
    }
  }, [apiUrl]);

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
    console.log('Processing property from extension:', item.url);

    // Show processing toast
    showToast({
      type: 'processing',
      title: 'Processing Property',
      message: item.title || 'Fetching property details...',
    });

    try {
      let propertyData = {
        name: item.title || 'Property',
        address: item.address || '',
        thumbnail: item.thumbnail || '',
        price: item.price || '',
        isBTR: item.isBTR || false,
      };
      let coordinates = item.coordinates;

      // If property needs processing (from simplified extension), fetch details
      if (item.needsProcessing || !item.address) {
        console.log('Fetching property details from URL...');
        const fetchedData = await fetchPropertyDetails(item.url);
        
        if (fetchedData) {
          propertyData = {
            name: fetchedData.name || propertyData.name,
            address: fetchedData.address || propertyData.address,
            thumbnail: fetchedData.thumbnail || propertyData.thumbnail,
            price: fetchedData.price || propertyData.price,
            isBTR: fetchedData.isBTR || propertyData.isBTR,
          };
          console.log('Fetched property details:', propertyData.name, propertyData.address);
        }
      }

      // Geocode if we don't have coordinates but have an address
      if (!coordinates && propertyData.address) {
        console.log('Geocoding address:', propertyData.address);
        coordinates = await geocodeAddress(propertyData.address);
      }

      // If we still don't have coordinates, try geocoding the title/name
      if (!coordinates && propertyData.name) {
        // Extract potential location from name
        const locationMatch = propertyData.name.match(/,?\s*([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d?[A-Z]{0,2})/i);
        if (locationMatch) {
          console.log('Trying to geocode from name:', locationMatch[0]);
          coordinates = await geocodeAddress(locationMatch[0] + ', London');
        }
      }

      // Calculate distances if we have coordinates
      let distances: Property['distances'] = null;
      if (coordinates) {
        distances = await calculateDistances(coordinates);
      }

      // Create and add property even if we don't have coordinates
      // User can fix it later in the app
      const property: Property = {
        id: generateId(),
        url: item.url,
        name: propertyData.name,
        address: propertyData.address,
        thumbnail: propertyData.thumbnail,
        coordinates: coordinates || { lat: 51.5074, lng: -0.1278 }, // Default to London center if no coords
        distances,
        comment: coordinates ? '' : '⚠️ Location needs verification',
        rating: null,
        price: propertyData.price,
        isBTR: propertyData.isBTR,
        tags: item.tags || [],
        createdAt: item.addedAt,
      };

      addProperty(property);
      console.log('✅ Property added:', property.name, coordinates ? '' : '(needs location)');

      // Show success toast
      showToast({
        type: 'success',
        title: 'Property Added!',
        message: property.name || property.address || 'Added to your shortlist',
      });

      // Mark as processed on server
      await fetch(`${apiUrl}/api/mark-processed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
    } catch (error) {
      console.error('Error processing extension property:', error);
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Processing Failed',
        message: 'Could not process property. Try adding it manually.',
      });
      
      // Still mark as processed to avoid infinite retries
      await fetch(`${apiUrl}/api/mark-processed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => {});
    } finally {
      processingIds.current.delete(item.id);
    }
  }, [addProperty, isUrlAlreadyAdded, fetchPropertyDetails, geocodeAddress, calculateDistances, apiUrl]);

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
            console.log('🔔 SSE: New property received from extension');
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
