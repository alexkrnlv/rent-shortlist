import type { Coordinates, PropertyDistances, CenterPoint, ParsedPropertyData } from '../types';
import { calculateDirectDistance } from '../utils/helpers';

const API_BASE = '/api';

interface ProcessedProperty extends ParsedPropertyData {
  coordinates: Coordinates | null;
  distances: PropertyDistances | null;
}

export async function processProperty(
  url: string, 
  claudeApiKey: string,
  centerPoint: CenterPoint
): Promise<ProcessedProperty> {
  // Step 1: Fetch and parse the page
  let parsedData: ParsedPropertyData;
  
  try {
    const response = await fetch(API_BASE + '/fetch-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, claudeApiKey }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch property');
    }
    
    parsedData = await response.json();
  } catch (error) {
    console.error('Error fetching property:', error);
    // Return minimal data if fetch fails
    parsedData = {
      name: extractNameFromUrl(url),
      address: '',
    };
  }

  // Step 2: Geocode the address if we have one
  let coordinates: Coordinates | null = null;
  
  if (parsedData.address) {
    try {
      const geoResponse = await fetch(API_BASE + '/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: parsedData.address }),
      });
      
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        if (geoData.lat && geoData.lng) {
          coordinates = { lat: geoData.lat, lng: geoData.lng };
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  }

  // Step 3: Calculate distances if we have coordinates
  let distances: PropertyDistances | null = null;
  
  if (coordinates) {
    const directDistance = calculateDirectDistance(
      coordinates.lat,
      coordinates.lng,
      centerPoint.lat,
      centerPoint.lng
    );

    try {
      const distResponse = await fetch(API_BASE + '/distances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: coordinates,
          destination: centerPoint,
        }),
      });

      if (distResponse.ok) {
        const distData = await distResponse.json();
        distances = {
          direct: directDistance,
          publicTransport: distData.transit || null,
          walking: distData.walking || null,
          driving: distData.driving || null,
        };
      } else {
        distances = {
          direct: directDistance,
          publicTransport: null,
          walking: null,
          driving: null,
        };
      }
    } catch (error) {
      console.error('Distance calculation error:', error);
      distances = {
        direct: directDistance,
        publicTransport: null,
        walking: null,
        driving: null,
      };
    }
  }

  return {
    ...parsedData,
    coordinates,
    distances,
  };
}

function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Try to extract property ID or name from path
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.match(/^\d+$/)) {
        return hostname + ' #' + lastPart;
      }
      return lastPart.replace(/-/g, ' ').substring(0, 50);
    }
    
    return hostname;
  } catch {
    return 'Property';
  }
}
