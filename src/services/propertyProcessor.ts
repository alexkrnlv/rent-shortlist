import type { Coordinates, PropertyDistances, CenterPoint, ParsedPropertyData, CityContext, CriteriaScores, PropertyAmenities, FurnishedStatus } from '../types';
import { calculateDirectDistance } from '../utils/helpers';
import { fetchAirQualityScore, calculateLocationScore } from '../utils/criteriaScorer';

const API_BASE = '/api';

// Extended parsed data with AHP criteria
interface ParsedPropertyWithCriteria extends ParsedPropertyData {
  propertyDetails?: {
    sqm?: number;
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    floor?: number;
    amenitiesList?: string[];
  };
  criteriaScores?: {
    location?: number;
    size?: number;
    condition?: number;
    amenities?: number;
    comfort?: number;
    locationNotes?: string;
    conditionNotes?: string;
    comfortNotes?: string;
  };
  // New fields from AI parsing
  petsAllowed?: boolean | null;
  petExtraPrice?: string;
  councilTaxBand?: string;
  councilTaxEstimate?: string;
  amenities?: PropertyAmenities;
  furnished?: FurnishedStatus;
  size?: string;
}

interface ProcessedProperty extends ParsedPropertyData {
  coordinates: Coordinates | null;
  distances: PropertyDistances | null;
  criteriaScores?: CriteriaScores;
  // New fields
  petsAllowed?: boolean | null;
  petExtraPrice?: string;
  councilTaxBand?: string;
  councilTaxEstimate?: string;
  amenities?: PropertyAmenities;
  furnished?: FurnishedStatus;
  size?: string;
}

export async function processProperty(
  url: string, 
  claudeApiKey: string,
  centerPoint: CenterPoint,
  cityContext?: CityContext | null
): Promise<ProcessedProperty> {
  // Step 1: Fetch and parse the page (now includes criteria scores from AI)
  let parsedData: ParsedPropertyWithCriteria;
  
  try {
    const response = await fetch(API_BASE + '/fetch-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, claudeApiKey, city: cityContext }),
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
        body: JSON.stringify({ address: parsedData.address, city: cityContext }),
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
  let directDistance: number | null = null;
  
  if (coordinates) {
    directDistance = calculateDirectDistance(
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

  // Step 4: Fetch air quality if we have coordinates
  let airQualityScore = 5; // Default neutral
  let airQualityData: { aqi?: number; source?: string } = {};
  
  if (coordinates) {
    try {
      const aqData = await fetchAirQualityScore(coordinates.lat, coordinates.lng);
      airQualityScore = aqData.score;
      airQualityData = { aqi: aqData.aqi ?? undefined, source: aqData.source };
    } catch (error) {
      console.error('Air quality fetch error:', error);
    }
  }

  // Step 5: Build complete criteria scores
  const aiCriteriaScores = parsedData.criteriaScores;
  const propertyDetails = parsedData.propertyDetails;
  
  // Calculate location score (combines distance + AI neighborhood assessment)
  const locationScore = calculateLocationScore(directDistance, aiCriteriaScores?.location);
  
  // Build final criteria scores
  const criteriaScores: CriteriaScores = {
    // Price will be calculated later when we have all properties for comparison
    // For now, use 5 as placeholder (will be updated by AHP when advisor opens)
    price: 5,
    location: locationScore,
    size: aiCriteriaScores?.size || 5,
    condition: aiCriteriaScores?.condition || 5,
    amenities: aiCriteriaScores?.amenities || 5,
    comfort: aiCriteriaScores?.comfort || 5,
    airQuality: airQualityScore,
    
    rawData: {
      sqm: propertyDetails?.sqm,
      bedrooms: propertyDetails?.bedrooms,
      bathrooms: propertyDetails?.bathrooms,
      floor: propertyDetails?.floor,
      amenitiesList: propertyDetails?.amenitiesList,
      aqi: airQualityData.aqi,
      aqiSource: airQualityData.source,
      locationScore: aiCriteriaScores?.location,
      conditionNotes: aiCriteriaScores?.conditionNotes,
      comfortNotes: aiCriteriaScores?.comfortNotes,
    },
  };

  return {
    ...parsedData,
    coordinates,
    distances,
    criteriaScores,
    // Include new fields from parsed data
    petsAllowed: parsedData.petsAllowed,
    petExtraPrice: parsedData.petExtraPrice,
    councilTaxBand: parsedData.councilTaxBand,
    councilTaxEstimate: parsedData.councilTaxEstimate,
    amenities: parsedData.amenities,
    furnished: parsedData.furnished,
    size: parsedData.size,
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
