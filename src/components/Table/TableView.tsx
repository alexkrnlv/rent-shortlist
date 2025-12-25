import { useState } from 'react';
import {
  ExternalLink,
  Navigation,
  Train,
  PersonStanding,
  Car,
  Star,
  Building2,
  MapPin,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import { usePropertyStore } from '../../store/usePropertyStore';
import type { Property, SortField } from '../../types';

interface TableViewProps {
  onPropertySelect?: (id: string) => void;
}

export function TableView({ onPropertySelect }: TableViewProps) {
  const { getFilteredProperties, selectedPropertyId, setSelectedProperty, tags, filters, setFilters } = usePropertyStore();
  const properties = getFilteredProperties();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (filters.sortBy === field) {
      setFilters({
        sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setFilters({
        sortBy: field,
        sortDirection: 'desc',
      });
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (filters.sortBy !== field) {
      return <ArrowUpDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return filters.sortDirection === 'asc' ? (
      <ChevronUp size={14} className="text-primary-600" />
    ) : (
      <ChevronDown size={14} className="text-primary-600" />
    );
  };

  const getTagById = (tagId: string) => tags.find((t) => t.id === tagId);

  const handleRowClick = (property: Property) => {
    setSelectedProperty(property.id);
    if (onPropertySelect) {
      onPropertySelect(property.id);
    }
  };

  const toggleRowExpand = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    setExpandedRow(expandedRow === propertyId ? null : propertyId);
  };

  if (properties.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-2xl flex items-center justify-center">
            <MapPin size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Properties Found</h3>
          <p className="text-gray-500 max-w-sm">
            Add some properties to see them in the comparison table, or adjust your filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Desktop Table */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <th className="py-4 px-4 text-left font-semibold text-sm w-16">
                  <span className="sr-only">Image</span>
                </th>
                <th
                  className="py-4 px-4 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Property
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="py-4 px-4 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Price
                    <SortIcon field="price" />
                  </div>
                </th>
                <th
                  className="py-4 px-4 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('rating')}
                >
                  <div className="flex items-center gap-2">
                    Rating
                    <SortIcon field="rating" />
                  </div>
                </th>
                <th
                  className="py-4 px-4 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('distance')}
                >
                  <div className="flex items-center gap-2">
                    Distance
                    <SortIcon field="distance" />
                  </div>
                </th>
                <th className="py-4 px-4 text-left font-semibold text-sm">Transport</th>
                <th className="py-4 px-4 text-left font-semibold text-sm">Tags</th>
                <th className="py-4 px-4 text-center font-semibold text-sm w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property, index) => (
                <tr
                  key={property.id}
                  onClick={() => handleRowClick(property)}
                  className={`
                    border-b border-gray-100 cursor-pointer transition-all duration-200
                    ${selectedPropertyId === property.id
                      ? 'bg-primary-50 border-l-4 border-l-primary-500'
                      : index % 2 === 0
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-gray-50/50 hover:bg-gray-100/80'
                    }
                  `}
                >
                  {/* Thumbnail */}
                  <td className="py-3 px-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                      {property.thumbnail ? (
                        <img
                          src={property.thumbnail}
                          alt={property.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin size={20} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Property Name & Address */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate text-sm">
                            {property.name || 'Untitled'}
                          </p>
                          {property.isBTR && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase shrink-0">
                              <Building2 size={10} />
                              BTR
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{property.address}</p>
                        {property.comment && (
                          <p className="text-xs text-gray-400 italic truncate mt-1">
                            "{property.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4">
                    {property.price ? (
                      <span className="font-bold text-primary-700 text-base">{property.price}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>

                  {/* Rating */}
                  <td className="py-3 px-4">
                    {property.rating ? (
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={
                                star <= property.rating!
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-transparent text-gray-300'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-600 ml-1">
                          {property.rating}/5
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Not rated</span>
                    )}
                  </td>

                  {/* Distance */}
                  <td className="py-3 px-4">
                    {property.distances ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Navigation size={14} className="text-gray-500" />
                        <span className="font-medium text-gray-700">
                          {property.distances.direct.toFixed(1)} km
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>

                  {/* Transport Times */}
                  <td className="py-3 px-4">
                    {property.distances ? (
                      <div className="flex flex-wrap gap-2">
                        {property.distances.publicTransport && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                            <Train size={12} />
                            {property.distances.publicTransport.duration}
                          </span>
                        )}
                        {property.distances.walking && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                            <PersonStanding size={12} />
                            {property.distances.walking.duration}
                          </span>
                        )}
                        {property.distances.driving && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">
                            <Car size={12} />
                            {property.distances.driving.duration}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>

                  {/* Tags */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(property.tags || []).map((tagId) => {
                        const tag = getTagById(tagId);
                        if (!tag) return null;
                        return (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        );
                      })}
                      {(!property.tags || property.tags.length === 0) && (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      {property.url && (
                        <a
                          href={property.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View listing"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with count */}
        <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{properties.length}</span>{' '}
            {properties.length === 1 ? 'property' : 'properties'}
          </p>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 overflow-auto p-4 space-y-3">
        {properties.map((property) => (
          <div
            key={property.id}
            onClick={() => handleRowClick(property)}
            className={`
              bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200
              ${selectedPropertyId === property.id
                ? 'border-primary-500 ring-2 ring-primary-100'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            {/* Card Header */}
            <div className="flex items-start gap-3 p-4">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {property.thumbnail ? (
                  <img
                    src={property.thumbnail}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin size={24} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {property.name || 'Untitled'}
                      </h3>
                      {property.isBTR && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                          <Building2 size={10} />
                          BTR
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{property.address}</p>
                  </div>
                  {property.price && (
                    <span className="font-bold text-primary-700 shrink-0">{property.price}</span>
                  )}
                </div>

                {/* Rating */}
                {property.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={
                          star <= property.rating!
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-gray-300'
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Details */}
            <div
              className={`border-t border-gray-100 overflow-hidden transition-all duration-300 ${
                expandedRow === property.id ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div className="p-4 space-y-3 bg-gray-50/50">
                {/* Distance & Transport */}
                {property.distances && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Navigation size={14} className="text-gray-500" />
                      <span className="font-medium text-gray-700">
                        {property.distances.direct.toFixed(1)} km direct
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {property.distances.publicTransport && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                          <Train size={12} />
                          {property.distances.publicTransport.duration}
                        </span>
                      )}
                      {property.distances.walking && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                          <PersonStanding size={12} />
                          {property.distances.walking.duration}
                        </span>
                      )}
                      {property.distances.driving && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">
                          <Car size={12} />
                          {property.distances.driving.duration}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {property.tags && property.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {property.tags.map((tagId) => {
                      const tag = getTagById(tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: tag.color + '20',
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Comment */}
                {property.comment && (
                  <p className="text-xs text-gray-600 italic">"{property.comment}"</p>
                )}

                {/* View Listing */}
                {property.url && (
                  <a
                    href={property.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center gap-2 w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    <ExternalLink size={14} />
                    View Listing
                  </a>
                )}
              </div>
            </div>

            {/* Expand Toggle */}
            <button
              onClick={(e) => toggleRowExpand(e, property.id)}
              className="w-full py-2 px-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
            >
              {expandedRow === property.id ? (
                <>
                  <ChevronUp size={14} />
                  Hide details
                </>
              ) : (
                <>
                  <Eye size={14} />
                  View details
                </>
              )}
            </button>
          </div>
        ))}

        {/* Footer */}
        <div className="py-4 text-center text-sm text-gray-500">
          {properties.length} {properties.length === 1 ? 'property' : 'properties'}
        </div>
      </div>
    </div>
  );
}

