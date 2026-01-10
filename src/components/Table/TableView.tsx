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
  PawPrint,
  Home,
  Dumbbell,
  Waves,
  ParkingCircle,
  Ruler,
  Receipt,
} from 'lucide-react';
import { usePropertyStore } from '../../store/usePropertyStore';
import { StarRating } from '../ui/StarRating';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { generateId } from '../../utils/helpers';
import type { Property, SortField, PropertyTag, PropertyAmenities, FurnishedStatus } from '../../types';

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
          className="w-full text-sm px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800">
          <Check size={14} />
        </button>
        <button onClick={handleCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded flex items-center gap-1 group ${className}`}
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
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Plus size={10} />
          </button>
          
          {showPicker && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[120px]">
              {availableTags.filter(t => !propertyTags.includes(t.id)).length === 0 ? (
                <p className="text-[10px] text-gray-400 px-1">All tags applied</p>
              ) : (
                availableTags.filter(t => !propertyTags.includes(t.id)).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => { onToggle(tag.id); setShowPicker(false); }}
                    className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300"
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
          className="w-full text-xs px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
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
      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
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

// Pets Cell Component
interface PetsCellProps {
  petsAllowed: boolean | null | undefined;
  petExtraPrice: string | undefined;
  onUpdate: (petsAllowed: boolean | null, petExtraPrice?: string) => void;
}

function PetsCell({ petsAllowed, petExtraPrice, onUpdate }: PetsCellProps) {
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [priceValue, setPriceValue] = useState(petExtraPrice || '');

  const handleToggle = () => {
    if (petsAllowed === true) {
      onUpdate(false);
      setShowPriceInput(false);
    } else if (petsAllowed === false) {
      onUpdate(null);
    } else {
      onUpdate(true);
    }
  };

  const handleSavePrice = () => {
    onUpdate(true, priceValue);
    setShowPriceInput(false);
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
          petsAllowed === true
            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
            : petsAllowed === false
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
        title={petsAllowed === true ? 'Pets allowed' : petsAllowed === false ? 'No pets' : 'Unknown'}
      >
        <PawPrint size={10} />
        {petsAllowed === true ? 'Yes' : petsAllowed === false ? 'No' : '?'}
      </button>
      
      {petsAllowed === true && (
        showPriceInput ? (
          <div className="flex items-center gap-0.5">
            <input
              type="text"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder="£50/mo"
              className="w-14 text-[10px] px-1 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePrice();
                if (e.key === 'Escape') setShowPriceInput(false);
              }}
            />
            <button onClick={handleSavePrice} className="text-green-600"><Check size={10} /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowPriceInput(true)}
            className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
          >
            {petExtraPrice || '+£?'}
          </button>
        )
      )}
    </div>
  );
}

// Council Tax Cell Component
interface CouncilTaxCellProps {
  band: string | undefined;
  estimate: string | undefined;
  onUpdate: (band?: string, estimate?: string) => void;
}

const COUNCIL_TAX_BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function CouncilTaxCell({ band, estimate, onUpdate }: CouncilTaxCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBand, setEditBand] = useState(band || '');
  const [editEstimate, setEditEstimate] = useState(estimate || '');

  const handleSave = () => {
    onUpdate(editBand || undefined, editEstimate || undefined);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <select
            value={editBand}
            onChange={(e) => setEditBand(e.target.value)}
            className="text-[10px] px-1 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
          >
            <option value="">Band</option>
            {COUNCIL_TAX_BANDS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input
            type="text"
            value={editEstimate}
            onChange={(e) => setEditEstimate(e.target.value)}
            placeholder="£1,500/yr"
            className="w-16 text-[10px] px-1 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
          />
        </div>
        <div className="flex gap-0.5">
          <button onClick={handleSave} className="text-green-600"><Check size={10} /></button>
          <button onClick={() => setIsEditing(false)} className="text-gray-400"><X size={10} /></button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className="flex items-center gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded group"
    >
      <Receipt size={10} className="text-gray-400" />
      {band ? (
        <span className="text-gray-700 dark:text-gray-300">
          <span className="font-medium">Band {band}</span>
          {estimate && <span className="text-gray-500 dark:text-gray-400 ml-1 text-[10px]">{estimate}</span>}
        </span>
      ) : (
        <span className="text-gray-400 text-[10px]">Add tax</span>
      )}
      <Edit2 size={8} className="opacity-0 group-hover:opacity-100 text-gray-400" />
    </button>
  );
}

// Amenities Cell Component
interface AmenitiesCellProps {
  amenities: PropertyAmenities | undefined;
  onUpdate: (amenities: PropertyAmenities) => void;
}

function AmenitiesCell({ amenities, onUpdate }: AmenitiesCellProps) {
  const current: PropertyAmenities = amenities || { gym: false, swimmingPool: false, parking: false };

  const toggleAmenity = (key: keyof PropertyAmenities) => {
    onUpdate({ ...current, [key]: !current[key] });
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => toggleAmenity('gym')}
        className={`p-1 rounded transition-colors ${
          current.gym
            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
        }`}
        title="Gym"
      >
        <Dumbbell size={12} />
      </button>
      <button
        onClick={() => toggleAmenity('swimmingPool')}
        className={`p-1 rounded transition-colors ${
          current.swimmingPool
            ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
        }`}
        title="Swimming Pool"
      >
        <Waves size={12} />
      </button>
      <button
        onClick={() => toggleAmenity('parking')}
        className={`p-1 rounded transition-colors ${
          current.parking
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
        }`}
        title="Parking"
      >
        <ParkingCircle size={12} />
      </button>
    </div>
  );
}

// Furnished Cell Component
interface FurnishedCellProps {
  furnished: FurnishedStatus;
  onUpdate: (furnished: FurnishedStatus) => void;
}

const FURNISHED_OPTIONS: { value: FurnishedStatus; label: string; shortLabel: string }[] = [
  { value: null, label: 'Unknown', shortLabel: '?' },
  { value: 'furnished', label: 'Furnished', shortLabel: 'Furn' },
  { value: 'unfurnished', label: 'Unfurnished', shortLabel: 'Unfurn' },
  { value: 'part-furnished', label: 'Part Furnished', shortLabel: 'Part' },
];

function FurnishedCell({ furnished, onUpdate }: FurnishedCellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const current = FURNISHED_OPTIONS.find(o => o.value === furnished) || FURNISHED_OPTIONS[0];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
          furnished === 'furnished'
            ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
            : furnished === 'unfurnished'
              ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
              : furnished === 'part-furnished'
                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        <Home size={10} />
        {current.shortLabel}
      </button>
      
      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px]">
          {FURNISHED_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => { onUpdate(option.value); setShowDropdown(false); }}
              className={`w-full px-2 py-1 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 ${
                option.value === furnished ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Size Cell Component
interface SizeCellProps {
  size: string | undefined;
  onSave: (size: string) => void;
}

function SizeCell({ size, onSave }: SizeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(size || '');

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="45 sqm"
          className="w-16 text-[10px] px-1 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <button onClick={handleSave} className="text-green-600"><Check size={10} /></button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className="flex items-center gap-0.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded group"
    >
      <Ruler size={10} className="text-gray-400" />
      {size ? (
        <span className="text-gray-700 dark:text-gray-300">{size}</span>
      ) : (
        <span className="text-gray-400 text-[10px]">Add</span>
      )}
      <Edit2 size={8} className="opacity-0 group-hover:opacity-100 text-gray-400" />
    </button>
  );
}

interface TableViewProps {
  onShowOnMap?: (propertyId: string) => void;
}

export function TableView({ onShowOnMap }: TableViewProps) {
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
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

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
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
            <MapPin size={32} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Properties Found</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Add some properties to see them in the comparison table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full md:h-full flex flex-col md:overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Search & Filter Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search properties..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters({ searchQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{properties.length}</span> properties
          </div>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 animate-slideUp">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Sort */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ sortBy: e.target.value as SortField })}
                    className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="rating">Rating</option>
                    <option value="distance">Distance</option>
                    <option value="price">Price</option>
                    <option value="createdAt">Date Added</option>
                    <option value="name">Name</option>
                  </select>
                  <button
                    onClick={() => setFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {filters.sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              
              {/* BTR Only */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={filters.btrOnly}
                    onChange={(e) => setFilters({ btrOnly: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 dark:bg-gray-700"
                  />
                  <Building2 size={14} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">BTR only</span>
                </label>
              </div>
              
              {/* Min Rating */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
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
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Max Distance: {filters.maxDistance ? filters.maxDistance + ' km' : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={filters.maxDistance || 0}
                  onChange={(e) => setFilters({ maxDistance: parseInt(e.target.value) || null })}
                  className="w-full accent-primary-600"
                />
              </div>
              
              {/* Price Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Min £</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice || ''}
                    onChange={(e) => setFilters({ minPrice: parseInt(e.target.value) || null })}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max £</label>
                  <input
                    type="number"
                    placeholder="Any"
                    value={filters.maxPrice || ''}
                    onChange={(e) => setFilters({ maxPrice: parseInt(e.target.value) || null })}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              {/* Tags Filter */}
              <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
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
                          ? 'border-gray-800 dark:border-gray-200 shadow-sm'
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
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
                        className="w-16 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-0.5">
                        {TAG_COLORS.slice(0, 4).map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewTagColor(color)}
                            className={`w-3 h-3 rounded-full ${newTagColor === color ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button onClick={handleAddTag} className="text-green-600"><Plus size={12} /></button>
                      <button onClick={() => setShowTagInput(false)} className="text-gray-400 dark:hover:text-gray-300"><X size={12} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
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
            <Filter size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No matching properties</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters</p>
            <Button variant="secondary" onClick={resetFilters}>
              <RotateCcw size={14} className="mr-1.5" />
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      {properties.length > 0 && (
        <div className="hidden md:block flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse min-w-[1400px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white text-xs">
                {/* Link - First */}
                <th className="py-2.5 px-2 text-center font-medium w-10">
                  <ExternalLink size={14} className="mx-auto opacity-70" />
                </th>
                {/* Thumbnail */}
                <th className="py-2.5 px-2 text-left font-medium w-12"></th>
                {/* Property */}
                <th
                  className="py-2.5 px-3 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors min-w-[180px]"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1.5">Property <SortIcon field="name" /></div>
                </th>
                {/* Price */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-24"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1.5">Price <SortIcon field="price" /></div>
                </th>
                {/* Size */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-20"
                  onClick={() => handleSort('size')}
                >
                  <div className="flex items-center gap-1"><Ruler size={12} /> Size <SortIcon field="size" /></div>
                </th>
                {/* Furnished */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-16"
                  onClick={() => handleSort('furnished')}
                >
                  <div className="flex items-center gap-1"><Home size={12} /> Furn <SortIcon field="furnished" /></div>
                </th>
                {/* Pets */}
                <th className="py-2.5 px-2 text-left font-medium w-24">
                  <div className="flex items-center gap-1"><PawPrint size={12} /> Pets</div>
                </th>
                {/* Council Tax */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-28"
                  onClick={() => handleSort('councilTaxBand')}
                >
                  <div className="flex items-center gap-1"><Receipt size={12} /> Tax <SortIcon field="councilTaxBand" /></div>
                </th>
                {/* Rating */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-24"
                  onClick={() => handleSort('rating')}
                >
                  <div className="flex items-center gap-1.5">Rating <SortIcon field="rating" /></div>
                </th>
                {/* Distance */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-20"
                  onClick={() => handleSort('distance')}
                >
                  <div className="flex items-center gap-1"><Navigation size={12} /> Dist <SortIcon field="distance" /></div>
                </th>
                {/* Transit */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-20"
                  onClick={() => handleSort('publicTransport')}
                >
                  <div className="flex items-center gap-1"><Train size={12} /> <SortIcon field="publicTransport" /></div>
                </th>
                {/* Walk */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-20"
                  onClick={() => handleSort('walking')}
                >
                  <div className="flex items-center gap-1"><PersonStanding size={12} /> <SortIcon field="walking" /></div>
                </th>
                {/* Drive */}
                <th
                  className="py-2.5 px-2 text-left font-medium cursor-pointer group hover:bg-white/5 transition-colors w-20"
                  onClick={() => handleSort('driving')}
                >
                  <div className="flex items-center gap-1"><Car size={12} /> <SortIcon field="driving" /></div>
                </th>
                {/* Amenities */}
                <th className="py-2.5 px-2 text-left font-medium w-24">
                  <div className="flex items-center gap-1"><Dumbbell size={12} /> Amenities</div>
                </th>
                {/* Tags */}
                <th className="py-2.5 px-2 text-left font-medium w-28">
                  <div className="flex items-center gap-1"><Tag size={12} /> Tags</div>
                </th>
                {/* Notes */}
                <th className="py-2.5 px-2 text-left font-medium min-w-[120px]">
                  <div className="flex items-center gap-1"><MessageSquare size={12} /> Notes</div>
                </th>
                {/* Delete - Last */}
                <th className="py-2.5 px-2 text-center font-medium w-10">
                  <Trash2 size={12} className="mx-auto opacity-70" />
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {properties.map((property, index) => (
                <tr
                  key={property.id}
                  onClick={() => handleRowClick(property)}
                  className={`
                    border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors
                    ${selectedPropertyId === property.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-l-primary-500'
                      : index % 2 === 0
                        ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                        : 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-750'
                    }
                  `}
                >
                  {/* Link */}
                  <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    {property.url ? (
                      <a
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-md transition-colors"
                        title="View listing"
                      >
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Thumbnail */}
                  <td className="py-1.5 px-2">
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {property.thumbnail ? (
                        <img src={property.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin size={14} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Property Name & Address */}
                  <td className="py-1.5 px-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[160px]">
                          {property.name || 'Untitled'}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProperty(property.id, { isBTR: !property.isBTR });
                          }}
                          className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold transition-colors ${
                            property.isBTR
                              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={property.isBTR ? 'Build to Rent' : 'Mark as BTR'}
                        >
                          <Building2 size={9} />
                          BTR
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                        {property.address || '—'}
                      </p>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                    <EditableCell
                      value={property.price || ''}
                      onSave={(value) => updateProperty(property.id, { price: value })}
                      placeholder="—"
                      className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm"
                    />
                  </td>

                  {/* Size */}
                  <td className="py-1.5 px-2">
                    <SizeCell
                      size={property.size}
                      onSave={(size) => updateProperty(property.id, { size })}
                    />
                  </td>

                  {/* Furnished */}
                  <td className="py-1.5 px-2">
                    <FurnishedCell
                      furnished={property.furnished || null}
                      onUpdate={(furnished) => updateProperty(property.id, { furnished })}
                    />
                  </td>

                  {/* Pets */}
                  <td className="py-1.5 px-2">
                    <PetsCell
                      petsAllowed={property.petsAllowed}
                      petExtraPrice={property.petExtraPrice}
                      onUpdate={(petsAllowed, petExtraPrice) => 
                        updateProperty(property.id, { petsAllowed, petExtraPrice })
                      }
                    />
                  </td>

                  {/* Council Tax */}
                  <td className="py-1.5 px-2">
                    <CouncilTaxCell
                      band={property.councilTaxBand}
                      estimate={property.councilTaxEstimate}
                      onUpdate={(councilTaxBand, councilTaxEstimate) => 
                        updateProperty(property.id, { councilTaxBand, councilTaxEstimate })
                      }
                    />
                  </td>

                  {/* Rating */}
                  <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                    <StarRating
                      rating={property.rating}
                      onChange={(rating) => updateProperty(property.id, { rating })}
                      size="sm"
                    />
                  </td>

                  {/* Distance */}
                  <td className="py-1.5 px-2">
                    {property.distances ? (
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {property.distances.direct.toFixed(1)} km
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Transit */}
                  <td className="py-1.5 px-2">
                    {property.distances?.publicTransport ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium whitespace-nowrap">
                        {property.distances.publicTransport.duration}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Walk */}
                  <td className="py-1.5 px-2">
                    {property.distances?.walking ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px] font-medium whitespace-nowrap">
                        {property.distances.walking.duration}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Drive */}
                  <td className="py-1.5 px-2">
                    {property.distances?.driving ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-[10px] font-medium whitespace-nowrap">
                        {property.distances.driving.duration}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Amenities */}
                  <td className="py-1.5 px-2">
                    <AmenitiesCell
                      amenities={property.amenities}
                      onUpdate={(amenities) => updateProperty(property.id, { amenities })}
                    />
                  </td>

                  {/* Tags */}
                  <td className="py-1.5 px-2">
                    <TagPicker
                      propertyTags={property.tags || []}
                      availableTags={tags}
                      onToggle={(tagId) => handleTagToggle(property.id, tagId)}
                    />
                  </td>

                  {/* Notes */}
                  <td className="py-1.5 px-2">
                    <CommentCell
                      comment={property.comment || ''}
                      onSave={(comment) => updateProperty(property.id, { comment })}
                    />
                  </td>

                  {/* Delete */}
                  <td className="py-1.5 px-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPropertyToDelete(property);
                      }}
                      className="inline-flex items-center justify-center w-7 h-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Remove property"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {properties.length > 0 && (
        <div className="md:hidden p-4 space-y-3 pb-8">
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => handleRowClick(property)}
              className={`
                bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition-all duration-200
                ${selectedPropertyId === property.id
                  ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }
              `}
            >
              {/* Card Header */}
              <div className="flex items-start gap-3 p-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                  {property.thumbnail ? (
                    <img src={property.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin size={24} className="text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{property.name || 'Untitled'}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProperty(property.id, { isBTR: !property.isBTR });
                          }}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            property.isBTR ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                          }`}
                        >
                          <Building2 size={10} />
                          BTR
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{property.address}</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <EditableCell
                        value={property.price || ''}
                        onSave={(value) => updateProperty(property.id, { price: value })}
                        placeholder="Price"
                        className="font-bold text-primary-700 dark:text-primary-400 shrink-0"
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
                className={`border-t border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
                  expandedRow === property.id ? 'max-h-[500px]' : 'max-h-0'
                }`}
              >
                <div className="p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
                  {/* Distance & Transport */}
                  {property.distances && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Navigation size={14} className="text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {property.distances.direct.toFixed(1)} km direct
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {property.distances.publicTransport && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                            <Train size={12} /> {property.distances.publicTransport.duration}
                          </span>
                        )}
                        {property.distances.walking && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs">
                            <PersonStanding size={12} /> {property.distances.walking.duration}
                          </span>
                        )}
                        {property.distances.driving && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs">
                            <Car size={12} /> {property.distances.driving.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Property Details Grid */}
                  <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                    {/* Size */}
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Size</label>
                      <SizeCell
                        size={property.size}
                        onSave={(size) => updateProperty(property.id, { size })}
                      />
                    </div>

                    {/* Furnished */}
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Furnished</label>
                      <FurnishedCell
                        furnished={property.furnished || null}
                        onUpdate={(furnished) => updateProperty(property.id, { furnished })}
                      />
                    </div>

                    {/* Pets */}
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Pets</label>
                      <PetsCell
                        petsAllowed={property.petsAllowed}
                        petExtraPrice={property.petExtraPrice}
                        onUpdate={(petsAllowed, petExtraPrice) => 
                          updateProperty(property.id, { petsAllowed, petExtraPrice })
                        }
                      />
                    </div>

                    {/* Council Tax */}
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Council Tax</label>
                      <CouncilTaxCell
                        band={property.councilTaxBand}
                        estimate={property.councilTaxEstimate}
                        onUpdate={(councilTaxBand, councilTaxEstimate) => 
                          updateProperty(property.id, { councilTaxBand, councilTaxEstimate })
                        }
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Amenities</label>
                    <AmenitiesCell
                      amenities={property.amenities}
                      onUpdate={(amenities) => updateProperty(property.id, { amenities })}
                    />
                  </div>

                  {/* Tags */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Tags</label>
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
                    {/* Show on Map button */}
                    {onShowOnMap && property.coordinates && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowOnMap(property.id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                      >
                        <MapPin size={14} /> Show on Map
                      </button>
                    )}
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
                        setPropertyToDelete(property);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expand Toggle */}
              <button
                onClick={(e) => toggleRowExpand(e, property.id)}
                className="w-full py-2 px-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
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

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={propertyToDelete !== null}
        onClose={() => setPropertyToDelete(null)}
        onConfirm={() => {
          if (propertyToDelete) {
            removeProperty(propertyToDelete.id);
            setPropertyToDelete(null);
          }
        }}
        title="Delete Property?"
        message={`"${propertyToDelete?.name || 'This property'}" will be moved to trash. You can restore it later.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
