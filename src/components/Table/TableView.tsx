import { useState } from 'react';
import {
  ExternalLink,
  Navigation,
  Train,
  PersonStanding,
  Car,
  Building2,
  MapPin,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Eye,
  Search,
  X,
  Filter,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  Plus,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { usePropertyStore } from '../../store/usePropertyStore';
import { StarRating } from '../ui/StarRating';
import { Button } from '../ui/Button';
import { generateId } from '../../utils/helpers';
import type { Property, SortField, PropertyTag } from '../../types';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

// Editable Cell Component
interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function EditableCell({ value, onSave, placeholder = 'Add...', className = '' }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full text-sm px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800">
          <Check size={14} />
        </button>
        <button onClick={handleCancel} className="p-1 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className={`cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded flex items-center gap-1 group ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
      <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
    </span>
  );
}

// Tag Picker Component
interface TagPickerProps {
  propertyTags: string[];
  availableTags: PropertyTag[];
  onToggle: (tagId: string) => void;
}

function TagPicker({ propertyTags, availableTags, onToggle }: TagPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-wrap gap-1 items-center" onClick={(e) => e.stopPropagation()}>
      {propertyTags.map((tagId) => {
        const tag = availableTags.find(t => t.id === tagId);
        if (!tag) return null;
        return (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80"
            style={{ backgroundColor: tag.color + '25', color: tag.color }}
            onClick={() => onToggle(tag.id)}
            title="Click to remove"
          >
            {tag.name}
            <X size={10} />
          </span>
        );
      })}
      
      {availableTags.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <Plus size={10} />
          </button>
          
          {showPicker && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[120px]">
              {availableTags.filter(t => !propertyTags.includes(t.id)).length === 0 ? (
                <p className="text-[10px] text-gray-400 px-1">All tags applied</p>
              ) : (
                availableTags.filter(t => !propertyTags.includes(t.id)).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => { onToggle(tag.id); setShowPicker(false); }}
                    className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs hover:bg-gray-50 text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      
      {availableTags.length === 0 && propertyTags.length === 0 && (
        <span className="text-gray-400 text-xs">—</span>
      )}
    </div>
  );
}

// Comment Cell Component
interface CommentCellProps {
  comment: string;
  onSave: (comment: string) => void;
}

function CommentCell({ comment, onSave }: CommentCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Add comment..."
          className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800">
          <Check size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
    >
      <MessageSquare size={12} />
      {comment ? (
        <span className="truncate max-w-[150px] italic">"{comment}"</span>
      ) : (
        <span className="text-gray-400">Add note</span>
      )}
    </button>
  );
}

export function TableView() {
  const {
    getFilteredProperties,
    selectedPropertyId,
    setSelectedProperty,
    tags,
    filters,
    setFilters,
    resetFilters,
    updateProperty,
    removeProperty,
    addTag,
    addTagToProperty,
    removeTagFromProperty,
  } = usePropertyStore();
  
  const properties = getFilteredProperties();
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const handleSort = (field: SortField) => {
    if (filters.sortBy === field) {
      setFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilters({ sortBy: field, sortDirection: 'desc' });
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (filters.sortBy !== field) {
      return <ArrowUpDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return filters.sortDirection === 'asc' ? (
      <ChevronUp size={14} className="text-blue-300" />
    ) : (
      <ChevronDown size={14} className="text-blue-300" />
    );
  };

  const handleRowClick = (property: Property) => {
    setSelectedProperty(property.id);
  };

  const toggleRowExpand = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    setExpandedRow(expandedRow === propertyId ? null : propertyId);
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      addTag({ id: generateId(), name: newTagName.trim(), color: newTagColor });
      setNewTagName('');
      setShowTagInput(false);
    }
  };

  const toggleTagFilter = (tagId: string) => {
    const currentTags = filters.selectedTags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    setFilters({ selectedTags: newTags });
  };

  const handleTagToggle = (propertyId: string, tagId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property?.tags?.includes(tagId)) {
      removeTagFromProperty(propertyId, tagId);
    } else {
      addTagToProperty(propertyId, tagId);
    }
  };

  const hasActiveFilters = filters.searchQuery || filters.btrOnly || filters.maxDistance || 
    filters.minPrice || filters.maxPrice || filters.minRating || 
    (filters.selectedTags && filters.selectedTags.length > 0);

  if (properties.length === 0 && !hasActiveFilters) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-2xl flex items-center justify-center">
            <MapPin size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Properties Found</h3>
          <p className="text-gray-500 max-w-sm">
            Add some properties to see them in the comparison table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Search & Filter Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters({ searchQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter size={16} className="mr-1.5" />
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw size={14} className="mr-1" />
              Reset
            </Button>
          )}
          
          {/* Property Count */}
          <div className="hidden sm:block text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{properties.length}</span> properties
          </div>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50 animate-slideUp">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Sort */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ sortBy: e.target.value as SortField })}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="rating">Rating</option>
                    <option value="distance">Distance</option>
                    <option value="price">Price</option>
                    <option value="createdAt">Date Added</option>
                    <option value="name">Name</option>
                  </select>
                  <button
                    onClick={() => setFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    {filters.sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              
              {/* BTR Only */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer h-9 px-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={filters.btrOnly}
                    onChange={(e) => setFilters({ btrOnly: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Building2 size={14} className="text-purple-600" />
                  <span className="text-sm text-gray-700">BTR only</span>
                </label>
              </div>
              
              {/* Min Rating */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Min Rating: {filters.minRating ? `${filters.minRating}+` : 'Any'}
                </label>
                <StarRating
                  rating={filters.minRating}
                  onChange={(rating) => setFilters({ minRating: rating || null })}
                  size="sm"
                />
              </div>
              
              {/* Max Distance */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Max Distance: {filters.maxDistance ? filters.maxDistance + ' km' : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={filters.maxDistance || 0}
                  onChange={(e) => setFilters({ maxDistance: parseInt(e.target.value) || null })}
                  className="w-full"
                />
              </div>
              
              {/* Price Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min £</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice || ''}
                    onChange={(e) => setFilters({ minPrice: parseInt(e.target.value) || null })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max £</label>
                  <input
                    type="number"
                    placeholder="Any"
                    value={filters.maxPrice || ''}
                    onChange={(e) => setFilters({ maxPrice: parseInt(e.target.value) || null })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              {/* Tags Filter */}
              <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Tag size={12} /> Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border-2
                        ${(filters.selectedTags || []).includes(tag.id)
                          ? 'border-gray-800 shadow-sm'
                          : 'border-transparent hover:border-gray-300'
                        }
                      `}
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                    </button>
                  ))}
                  
                  {showTagInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Name"
                        className="w-16 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-0.5">
                        {TAG_COLORS.slice(0, 4).map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewTagColor(color)}
                            className={`w-3 h-3 rounded-full ${newTagColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button onClick={handleAddTag} className="text-green-600"><Plus size={12} /></button>
                      <button onClick={() => setShowTagInput(false)} className="text-gray-400"><X size={12} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <Plus size={10} /> Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No results message */}
      {properties.length === 0 && hasActiveFilters && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <Filter size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No matching properties</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters</p>
            <Button variant="secondary" onClick={resetFilters}>
              <RotateCcw size={14} className="mr-1.5" />
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      {properties.length > 0 && (
        <div className="hidden md:flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                  <th className="py-3 px-3 text-left font-semibold text-sm w-14"></th>
                  <th
                    className="py-3 px-3 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors min-w-[200px]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">Property <SortIcon field="name" /></div>
                  </th>
                  <th
                    className="py-3 px-3 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors w-28"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-2">Price <SortIcon field="price" /></div>
                  </th>
                  <th
                    className="py-3 px-3 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors w-32"
                    onClick={() => handleSort('rating')}
                  >
                    <div className="flex items-center gap-2">Rating <SortIcon field="rating" /></div>
                  </th>
                  <th
                    className="py-3 px-3 text-left font-semibold text-sm cursor-pointer group hover:bg-white/5 transition-colors w-24"
                    onClick={() => handleSort('distance')}
                  >
                    <div className="flex items-center gap-2">Distance <SortIcon field="distance" /></div>
                  </th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">Transport</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm w-32">Tags</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">Notes</th>
                  <th className="py-3 px-3 text-center font-semibold text-sm w-24">Actions</th>
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
                    <td className="py-2 px-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                        {property.thumbnail ? (
                          <img src={property.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin size={16} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Property Name & Address */}
                    <td className="py-2 px-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm truncate max-w-[180px]">
                              {property.name || 'Untitled'}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateProperty(property.id, { isBTR: !property.isBTR });
                              }}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                property.isBTR
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={property.isBTR ? 'Click to unmark BTR' : 'Click to mark as BTR'}
                            >
                              <Building2 size={10} />
                              BTR
                            </button>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={property.address}
                              onSave={(value) => updateProperty(property.id, { address: value })}
                              placeholder="Add address"
                              className="text-xs text-gray-500 max-w-[200px] truncate"
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      <EditableCell
                        value={property.price || ''}
                        onSave={(value) => updateProperty(property.id, { price: value })}
                        placeholder="Add price"
                        className="font-bold text-primary-700"
                      />
                    </td>

                    {/* Rating */}
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      <StarRating
                        rating={property.rating}
                        onChange={(rating) => updateProperty(property.id, { rating })}
                        size="sm"
                      />
                    </td>

                    {/* Distance */}
                    <td className="py-2 px-3">
                      {property.distances ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Navigation size={12} className="text-gray-500" />
                          <span className="font-medium text-gray-700">
                            {property.distances.direct.toFixed(1)} km
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>

                    {/* Transport Times */}
                    <td className="py-2 px-3">
                      {property.distances ? (
                        <div className="flex flex-wrap gap-1">
                          {property.distances.publicTransport && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                              <Train size={10} />
                              {property.distances.publicTransport.duration}
                            </span>
                          )}
                          {property.distances.walking && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]">
                              <PersonStanding size={10} />
                              {property.distances.walking.duration}
                            </span>
                          )}
                          {property.distances.driving && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px]">
                              <Car size={10} />
                              {property.distances.driving.duration}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="py-2 px-3">
                      <TagPicker
                        propertyTags={property.tags || []}
                        availableTags={tags}
                        onToggle={(tagId) => handleTagToggle(property.id, tagId)}
                      />
                    </td>

                    {/* Notes/Comment */}
                    <td className="py-2 px-3">
                      <CommentCell
                        comment={property.comment || ''}
                        onSave={(comment) => updateProperty(property.id, { comment })}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {property.url && (
                          <a
                            href={property.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View listing"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProperty(property.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove property"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      {properties.length > 0 && (
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
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {property.thumbnail ? (
                    <img src={property.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">{property.name || 'Untitled'}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProperty(property.id, { isBTR: !property.isBTR });
                          }}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            property.isBTR ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Building2 size={10} />
                          BTR
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{property.address}</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <EditableCell
                        value={property.price || ''}
                        onSave={(value) => updateProperty(property.id, { price: value })}
                        placeholder="Price"
                        className="font-bold text-primary-700 shrink-0"
                      />
                    </div>
                  </div>

                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <StarRating
                      rating={property.rating}
                      onChange={(rating) => updateProperty(property.id, { rating })}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* Expandable Details */}
              <div
                className={`border-t border-gray-100 overflow-hidden transition-all duration-300 ${
                  expandedRow === property.id ? 'max-h-[500px]' : 'max-h-0'
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
                            <Train size={12} /> {property.distances.publicTransport.duration}
                          </span>
                        )}
                        {property.distances.walking && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                            <PersonStanding size={12} /> {property.distances.walking.duration}
                          </span>
                        )}
                        {property.distances.driving && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">
                            <Car size={12} /> {property.distances.driving.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs text-gray-500 mb-1 block">Tags</label>
                    <TagPicker
                      propertyTags={property.tags || []}
                      availableTags={tags}
                      onToggle={(tagId) => handleTagToggle(property.id, tagId)}
                    />
                  </div>

                  {/* Comment */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <CommentCell
                      comment={property.comment || ''}
                      onSave={(comment) => updateProperty(property.id, { comment })}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {property.url && (
                      <a
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        <ExternalLink size={14} /> View Listing
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProperty(property.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expand Toggle */}
              <button
                onClick={(e) => toggleRowExpand(e, property.id)}
                className="w-full py-2 px-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
              >
                {expandedRow === property.id ? (
                  <><ChevronUp size={14} /> Hide details</>
                ) : (
                  <><Eye size={14} /> View details</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
