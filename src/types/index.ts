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

export type SortField = 'rating' | 'distance' | 'price' | 'createdAt' | 'name' | 'publicTransport' | 'walking' | 'driving';
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
}
