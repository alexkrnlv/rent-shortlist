export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceInfo {
  distance: string;
  duration: string;
}

export interface PropertyDistances {
  direct: number;
  publicTransport: DistanceInfo | null;
  walking: DistanceInfo | null;
  driving: DistanceInfo | null;
}

export interface PropertyTag {
  id: string;
  name: string;
  color: string; // hex color
}

// Amenities that can be toggled for a property
export interface PropertyAmenities {
  gym: boolean;
  swimmingPool: boolean;
  parking: boolean;
  concierge?: boolean;
  rooftop?: boolean;
  garden?: boolean;
}

// Furnished status options
export type FurnishedStatus = 'furnished' | 'unfurnished' | 'part-furnished' | null;

export interface Property {
  id: string;
  url: string;
  name: string;
  address: string;
  price?: string;
  thumbnail?: string;
  images?: string[];
  coordinates: Coordinates | null;
  distances: PropertyDistances | null;
  comment: string;
  rating: number | null; // 1-5 stars
  isBTR: boolean; // Build to Rent
  tags: string[]; // array of tag IDs
  createdAt: string;
  // AHP Advisor - AI-assessed criteria scores
  criteriaScores?: CriteriaScores;
  
  // New fields
  petsAllowed?: boolean | null; // null = unknown
  petExtraPrice?: string; // Extra monthly cost for pets (e.g., "£50/month")
  councilTaxBand?: string; // A-H
  councilTaxEstimate?: string; // Estimated annual council tax (e.g., "£1,500/year")
  amenities?: PropertyAmenities;
  furnished?: FurnishedStatus;
  size?: string; // e.g., "45 sqm", "485 sqft", "2 bed"
}

export interface CenterPoint {
  name: string;
  lat: number;
  lng: number;
}

// City/Location context for geocoding and map bounds
export interface CityContext {
  name: string;           // Display name (e.g., "London, UK")
  country: string;        // Country code (e.g., "GB")
  countryName: string;    // Full country name (e.g., "United Kingdom")
  lat: number;            // City center latitude
  lng: number;            // City center longitude
  bounds?: {              // Optional map bounds
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// Project contains all data for a single property search project
export interface Project {
  city: CityContext;
  centerPoint: CenterPoint;  // Where to calculate distances to (e.g., office location)
}

export interface Settings {
  project: Project | null;  // Current project with city and center point
  // Legacy: centerPoint moved to project.centerPoint
  centerPoint: CenterPoint; // Kept for backwards compatibility
  googleMapsApiKey: string;
  claudeApiKey: string;
  themeMode: ThemeMode;
}

export type SortField = 'rating' | 'distance' | 'price' | 'createdAt' | 'name' | 'publicTransport' | 'walking' | 'driving' | 'size' | 'councilTaxBand' | 'furnished';
export type SortDirection = 'asc' | 'desc';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Filters {
  maxDistance: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  btrOnly: boolean;
  selectedTags: string[]; // array of tag IDs to filter by
  searchQuery: string;
  sortBy: SortField;
  sortDirection: SortDirection;
}

export interface ParsedPropertyData {
  name: string;
  address: string;
  thumbnail?: string;
  images?: string[];
  price?: string;
  isBTR?: boolean;
  // New parsed fields
  petsAllowed?: boolean | null;
  petExtraPrice?: string;
  councilTaxBand?: string;
  councilTaxEstimate?: string;
  amenities?: PropertyAmenities;
  furnished?: FurnishedStatus;
  size?: string;
}

// ============================================
// AHP Advisor - Criteria Scores
// ============================================

// Raw data extracted from property listing for transparency
export interface CriteriaRawData {
  sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  yearBuilt?: number;
  amenitiesList?: string[];
  aqi?: number;           // Raw AQI value (0-500)
  aqiSource?: string;     // Data source (OpenAQ, WAQI, etc.)
  locationScore?: number; // AI-assessed neighborhood quality
  conditionNotes?: string; // AI notes on condition
  comfortNotes?: string;   // AI notes on comfort factors
}

// Normalized scores for each criterion (1-10 scale)
export interface CriteriaScores {
  price: number;      // 1-10, inverse (cheaper = higher score)
  location: number;   // 1-10, distance + neighborhood quality
  size: number;       // 1-10, sqm/bedrooms normalized
  condition: number;  // 1-10, AI assessment of renovation state
  amenities: number;  // 1-10, count of amenities normalized
  comfort: number;    // 1-10, AI assessment (light, noise, view)
  airQuality: number; // 1-10, AQI normalized

  // Raw extracted data for transparency and debugging
  rawData?: CriteriaRawData;
}
