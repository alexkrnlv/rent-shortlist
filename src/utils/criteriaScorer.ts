// ============================================
// Criteria Scorer & Normalizer
// Converts raw property data to 1-10 scores
// ============================================

import type { Property, CriteriaScores } from '../types';

const API_BASE = '/api';

// ============================================
// Price Normalization (Inverse - cheaper is better)
// ============================================

/**
 * Extract numeric price from string like "£1,500 pcm"
 */
export function extractNumericPrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  
  // Remove currency symbols and commas, extract number
  const match = priceStr.replace(/[,\s]/g, '').match(/\d+/);
  if (!match) return null;
  
  return parseInt(match[0], 10);
}

/**
 * Normalize price to 1-10 scale (inverse - lower price = higher score)
 * Uses min-max normalization within the property set
 */
export function normalizePriceScore(
  price: number,
  minPrice: number,
  maxPrice: number
): number {
  if (maxPrice === minPrice) return 5; // All same price
  
  // Inverse normalization: lowest price gets 10, highest gets 1
  const normalized = 1 - (price - minPrice) / (maxPrice - minPrice);
  return Math.round(1 + normalized * 9); // Scale to 1-10
}

/**
 * Calculate price scores for all properties
 */
export function calculatePriceScores(properties: Property[]): Map<string, number> {
  const scores = new Map<string, number>();
  
  // Extract all prices
  const prices: { id: string; price: number }[] = [];
  for (const property of properties) {
    const price = extractNumericPrice(property.price);
    if (price !== null) {
      prices.push({ id: property.id, price });
    }
  }
  
  if (prices.length === 0) {
    // No valid prices, return neutral scores
    for (const property of properties) {
      scores.set(property.id, 5);
    }
    return scores;
  }
  
  const minPrice = Math.min(...prices.map(p => p.price));
  const maxPrice = Math.max(...prices.map(p => p.price));
  
  for (const { id, price } of prices) {
    scores.set(id, normalizePriceScore(price, minPrice, maxPrice));
  }
  
  // Properties without valid price get neutral score
  for (const property of properties) {
    if (!scores.has(property.id)) {
      scores.set(property.id, 5);
    }
  }
  
  return scores;
}

// ============================================
// Location Score
// Combines distance and AI neighborhood assessment
// ============================================

/**
 * Normalize distance to 1-10 score
 * Uses inverse logarithmic scale (closer is better)
 */
export function normalizeDistanceScore(distanceKm: number): number {
  // 0-1 km = 10, 1-2 km = 9, 2-4 km = 8, 4-8 km = 7, etc.
  if (distanceKm <= 0.5) return 10;
  if (distanceKm <= 1) return 9;
  if (distanceKm <= 2) return 8;
  if (distanceKm <= 4) return 7;
  if (distanceKm <= 6) return 6;
  if (distanceKm <= 10) return 5;
  if (distanceKm <= 15) return 4;
  if (distanceKm <= 25) return 3;
  if (distanceKm <= 40) return 2;
  return 1;
}

/**
 * Calculate combined location score
 * 50% distance + 50% AI neighborhood assessment
 */
export function calculateLocationScore(
  distanceKm: number | null,
  aiLocationScore: number | undefined
): number {
  const distanceScore = distanceKm !== null 
    ? normalizeDistanceScore(distanceKm) 
    : 5;
  
  const neighborhoodScore = aiLocationScore || 5;
  
  return Math.round((distanceScore + neighborhoodScore) / 2);
}

// ============================================
// Air Quality
// ============================================

interface AirQualityResponse {
  aqi: number | null;
  score: number;
  source: string;
}

/**
 * Fetch air quality score for coordinates
 */
export async function fetchAirQualityScore(
  lat: number,
  lng: number
): Promise<AirQualityResponse> {
  try {
    const response = await fetch(`${API_BASE}/air-quality`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch air quality');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Air quality fetch error:', error);
    return { aqi: null, score: 5, source: 'error' };
  }
}

// ============================================
// Complete Property Scoring
// ============================================

/**
 * Build complete CriteriaScores for a property
 * Combines AI scores with calculated scores
 */
export function buildCriteriaScores(
  property: Property,
  priceScore: number,
  airQualityData?: { aqi: number | null; score: number; source: string }
): CriteriaScores {
  const existing = property.criteriaScores;
  
  // Calculate location score from distance + AI assessment
  const distanceKm = property.distances?.direct || null;
  const locationScore = calculateLocationScore(
    distanceKm,
    existing?.location
  );
  
  return {
    price: priceScore,
    location: locationScore,
    size: existing?.size || 5,
    condition: existing?.condition || 5,
    amenities: existing?.amenities || 5,
    comfort: existing?.comfort || 5,
    airQuality: airQualityData?.score || 5,
    
    rawData: {
      sqm: existing?.rawData?.sqm,
      bedrooms: existing?.rawData?.bedrooms,
      bathrooms: existing?.rawData?.bathrooms,
      floor: existing?.rawData?.floor,
      yearBuilt: existing?.rawData?.yearBuilt,
      amenitiesList: existing?.rawData?.amenitiesList,
      aqi: airQualityData?.aqi ?? undefined,
      aqiSource: airQualityData?.source,
      locationScore: existing?.location,
      conditionNotes: existing?.rawData?.conditionNotes,
      comfortNotes: existing?.rawData?.comfortNotes,
    },
  };
}

/**
 * Calculate and update criteria scores for all properties
 * Returns properties with updated criteriaScores
 */
export async function calculateAllCriteriaScores(
  properties: Property[]
): Promise<Property[]> {
  // Calculate relative price scores
  const priceScores = calculatePriceScores(properties);
  
  // Fetch air quality for each property with coordinates
  const airQualityPromises = properties.map(async (property) => {
    if (!property.coordinates) {
      return { propertyId: property.id, data: undefined };
    }
    
    const data = await fetchAirQualityScore(
      property.coordinates.lat,
      property.coordinates.lng
    );
    
    return { propertyId: property.id, data };
  });
  
  const airQualityResults = await Promise.all(airQualityPromises);
  const airQualityMap = new Map(
    airQualityResults.map(r => [r.propertyId, r.data])
  );
  
  // Build complete criteria scores
  return properties.map(property => ({
    ...property,
    criteriaScores: buildCriteriaScores(
      property,
      priceScores.get(property.id) || 5,
      airQualityMap.get(property.id)
    ),
  }));
}

/**
 * Check if property has complete criteria scores
 */
export function hasCompleteCriteriaScores(property: Property): boolean {
  if (!property.criteriaScores) return false;
  
  const scores = property.criteriaScores;
  return (
    scores.price !== undefined &&
    scores.location !== undefined &&
    scores.size !== undefined &&
    scores.condition !== undefined &&
    scores.amenities !== undefined &&
    scores.comfort !== undefined &&
    scores.airQuality !== undefined
  );
}

/**
 * Count properties with criteria scores
 */
export function countPropertiesWithScores(properties: Property[]): number {
  return properties.filter(p => p.criteriaScores).length;
}

