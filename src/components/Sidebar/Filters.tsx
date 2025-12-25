import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, ArrowUpDown, Building2, Tag, Plus, X, SlidersHorizontal } from 'lucide-react';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import type { SortField } from '../../types';
import { generateId } from '../../utils/helpers';

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
];

export function Filters() {
  const isMobile = useMobileDetect();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const { filters, setFilters, resetFilters, tags, addTag, removeTag } = usePropertyStore();
  
  const hasActiveFilters = filters.btrOnly || filters.minRating || filters.maxDistance || 
    filters.minPrice || filters.maxPrice || (filters.selectedTags && filters.selectedTags.length > 0);

  const toggleSortDirection = () => {
    setFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' });
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      addTag({
        id: generateId(),
        name: newTagName.trim(),
        color: newTagColor,
      });
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

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full px-4 flex items-center justify-between text-sm font-medium 
          text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
          transition-colors active:bg-gray-100 dark:active:bg-gray-700
          ${isMobile ? 'py-3.5 min-h-[52px]' : 'py-2'}
        `}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={isMobile ? 18 : 16} className="text-gray-500 dark:text-gray-400" />
          <span>Filters & Sort</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-primary-500 rounded-full" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={isMobile ? 20 : 16} /> : <ChevronDown size={isMobile ? 20 : 16} />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-slideUp">
          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sort By</label>
            <div className="flex gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ sortBy: e.target.value as SortField })}
                className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 md:py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] md:min-h-0"
              >
                <option value="rating">Rating</option>
                <option value="distance">Distance</option>
                <option value="price">Price</option>
                <option value="createdAt">Date Added</option>
                <option value="name">Name</option>
              </select>
              <button
                onClick={toggleSortDirection}
                className={`px-4 py-3 md:px-3 md:py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 min-w-[60px] min-h-[44px] md:min-w-0 md:min-h-0 ${
                  filters.sortDirection === 'desc' ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown size={16} className="md:w-3.5 md:h-3.5" />
                {filters.sortDirection === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
          </div>

          {/* BTR Filter */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.btrOnly}
                onChange={(e) => setFilters({ btrOnly: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 dark:bg-gray-700"
              />
              <Building2 size={14} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show BTR only</span>
            </label>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
              <Tag size={12} />
              Tags
            </label>

            {/* Existing Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-pointer
                    transition-all border-2
                    ${(filters.selectedTags || []).includes(tag.id)
                      ? 'border-gray-800 shadow-sm'
                      : 'border-transparent hover:border-gray-300'
                    }
                  `}
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  onClick={() => toggleTagFilter(tag.id)}
                >
                  <span className="font-medium">{tag.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag.id);
                    }}
                    className="hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {/* Add Tag Button/Input */}
              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Tag name"
                    className="w-20 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    autoFocus
                  />
                  <div className="flex gap-0.5">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        aria-label={`Select ${color} color`}
                        className={`w-4 h-4 rounded-full ${newTagColor === color ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddTag}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setShowTagInput(false);
                      setNewTagName('');
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Plus size={10} />
                  Add tag
                </button>
              )}
            </div>
          </div>

          {/* Min Rating Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Min Rating: {filters.minRating ? `${filters.minRating}+ stars` : 'Any'}
            </label>
            <StarRating
              rating={filters.minRating}
              onChange={(rating) => setFilters({ minRating: rating || null })}
              size="sm"
            />
          </div>

          {/* Distance Filter */}
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
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Min Price</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minPrice || ''}
                onChange={(e) => setFilters({ minPrice: parseInt(e.target.value) || null })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 md:py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] md:min-h-0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Price</label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters({ maxPrice: parseInt(e.target.value) || null })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 md:py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] md:min-h-0"
              />
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full min-h-[44px] md:min-h-0">
            <RotateCcw size={16} className="mr-1.5 md:w-3.5 md:h-3.5" />
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
