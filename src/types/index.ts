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

export interface Settings {
  centerPoint: CenterPoint;
  googleMapsApiKey: string;
  claudeApiKey: string;
}

export type SortField = 'rating' | 'distance' | 'price' | 'createdAt' | 'name' | 'publicTransport' | 'walking' | 'driving';
export type SortDirection = 'asc' | 'desc';

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
