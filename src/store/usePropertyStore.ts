import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Property, Filters, PropertyTag } from '../types';

interface PropertyState {
  properties: Property[];
  tags: PropertyTag[];
  filters: Filters;
  selectedPropertyId: string | null;
  addProperty: (property: Property) => void;
  addProperties: (properties: Property[]) => void;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  removeProperty: (id: string) => void;
  clearAllProperties: () => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  setSelectedProperty: (id: string | null) => void;
  getFilteredProperties: () => Property[];
  getPropertyById: (id: string) => Property | undefined;
  // Tag management
  addTag: (tag: PropertyTag) => void;
  updateTag: (id: string, updates: Partial<PropertyTag>) => void;
  removeTag: (id: string) => void;
  addTagToProperty: (propertyId: string, tagId: string) => void;
  removeTagFromProperty: (propertyId: string, tagId: string) => void;
}

const DEFAULT_FILTERS: Filters = {
  maxDistance: null,
  minPrice: null,
  maxPrice: null,
  minRating: null,
  btrOnly: false,
  selectedTags: [],
  searchQuery: '',
  sortBy: 'createdAt',
  sortDirection: 'desc',
};

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set, get) => ({
      properties: [],
      tags: [],
      filters: DEFAULT_FILTERS,
      selectedPropertyId: null,
      addProperty: (property: Property) =>
        set((state) => ({ properties: [...state.properties, { ...property, tags: property.tags || [] }] })),
      addProperties: (properties: Property[]) =>
        set((state) => ({ properties: [...state.properties, ...properties.map(p => ({ ...p, tags: p.tags || [] }))] })),
      updateProperty: (id: string, updates: Partial<Property>) =>
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      removeProperty: (id: string) =>
        set((state) => ({
          properties: state.properties.filter((p) => p.id !== id),
          selectedPropertyId: state.selectedPropertyId === id ? null : state.selectedPropertyId,
        })),
      clearAllProperties: () => set({ properties: [], selectedPropertyId: null }),
      setFilters: (filters: Partial<Filters>) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
      setSelectedProperty: (id: string | null) => set({ selectedPropertyId: id }),
      getFilteredProperties: () => {
        const { properties, filters } = get();

        // Filter
        const filtered = properties.filter((property) => {
          // Only show properties with coordinates
          if (!property.coordinates) return false;

          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const matchesSearch =
              property.name.toLowerCase().includes(query) ||
              property.address.toLowerCase().includes(query) ||
              property.comment?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
          }
          if (filters.btrOnly && !property.isBTR) return false;
          if (filters.maxDistance && property.distances?.direct) {
            if (property.distances.direct > filters.maxDistance) return false;
          }
          if (filters.minRating && (property.rating === null || property.rating < filters.minRating)) {
            return false;
          }
          if (property.price) {
            const priceNum = parseInt(property.price.replace(/[^0-9]/g, ''), 10);
            if (filters.minPrice && priceNum < filters.minPrice) return false;
            if (filters.maxPrice && priceNum > filters.maxPrice) return false;
          }
          // Filter by tags
          if (filters.selectedTags && filters.selectedTags.length > 0) {
            const propertyTags = property.tags || [];
            const hasMatchingTag = filters.selectedTags.some(tagId => propertyTags.includes(tagId));
            if (!hasMatchingTag) return false;
          }
          return true;
        });

        // Sort
        const sorted = [...filtered].sort((a, b) => {
          const dir = filters.sortDirection === 'asc' ? 1 : -1;

          switch (filters.sortBy) {
            case 'rating':
              const ratingA = a.rating ?? 0;
              const ratingB = b.rating ?? 0;
              return (ratingA - ratingB) * dir;
            case 'distance':
              const distA = a.distances?.direct ?? Infinity;
              const distB = b.distances?.direct ?? Infinity;
              return (distA - distB) * dir;
            case 'price':
              const priceA = parseInt(a.price?.replace(/[^0-9]/g, '') || '0', 10);
              const priceB = parseInt(b.price?.replace(/[^0-9]/g, '') || '0', 10);
              return (priceA - priceB) * dir;
            case 'name':
              return a.name.localeCompare(b.name) * dir;
            case 'createdAt':
            default:
              return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
          }
        });

        return sorted;
      },
      getPropertyById: (id: string) => get().properties.find((p) => p.id === id),
      // Tag management
      addTag: (tag: PropertyTag) =>
        set((state) => ({ tags: [...state.tags, tag] })),
      updateTag: (id: string, updates: Partial<PropertyTag>) =>
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      removeTag: (id: string) =>
        set((state) => ({
          tags: state.tags.filter((t) => t.id !== id),
          // Also remove tag from all properties
          properties: state.properties.map((p) => ({
            ...p,
            tags: (p.tags || []).filter((tagId) => tagId !== id),
          })),
          // Remove from filters if selected
          filters: {
            ...state.filters,
            selectedTags: state.filters.selectedTags.filter((tagId) => tagId !== id),
          },
        })),
      addTagToProperty: (propertyId: string, tagId: string) =>
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === propertyId
              ? { ...p, tags: [...new Set([...(p.tags || []), tagId])] }
              : p
          ),
        })),
      removeTagFromProperty: (propertyId: string, tagId: string) =>
        set((state) => ({
          properties: state.properties.map((p) =>
            p.id === propertyId
              ? { ...p, tags: (p.tags || []).filter((id) => id !== tagId) }
              : p
          ),
        })),
    }),
    { name: 'rent-shortlist-properties' }
  )
);
