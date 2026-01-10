import { ExternalLink, MapPin, Trash2, MessageSquare, Navigation, Train, PersonStanding, Car, Edit2, Check, X, Building2, Plus, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Property, PropertyTag } from '../../types';
import { Card } from '../ui/Card';
import { StarRating } from '../ui/StarRating';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useMobileDetect } from '../../hooks/useMobileDetect';

interface PropertyCardProps {
  property: Property;
  isSelected: boolean;
  availableTags: PropertyTag[];
  onClick: () => void;
  onRemove: () => void;
  onCommentChange: (comment: string) => void;
  onRatingChange: (rating: number) => void;
  onPriceChange: (price: string) => void;
  onAddressChange: (address: string) => void;
  onBTRChange: (isBTR: boolean) => void;
  onTagToggle: (tagId: string) => void;
}

export function PropertyCard({
  property,
  isSelected,
  availableTags,
  onClick,
  onRemove,
  onCommentChange,
  onRatingChange,
  onPriceChange,
  onAddressChange,
  onBTRChange,
  onTagToggle,
}: PropertyCardProps) {
  const isMobile = useMobileDetect();
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comment, setComment] = useState(property.comment || '');
  const [price, setPrice] = useState(property.price || '');
  const [address, setAddress] = useState(property.address || '');

  const propertyTags = property.tags || [];

  const handleCommentSave = () => {
    onCommentChange(comment);
    setIsEditingComment(false);
  };

  const handlePriceSave = () => {
    onPriceChange(price);
    setIsEditingPrice(false);
  };

  const handleAddressSave = () => {
    onAddressChange(address);
    setIsEditingAddress(false);
  };

  const handleMobileExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Mobile compact card layout for bottom sheet
  if (isMobile) {
    return (
      <Card selected={isSelected} onClick={onClick} className="overflow-hidden touch-feedback">
        {/* Main row - always visible */}
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
            {property.thumbnail ? (
              <img
                src={property.thumbnail}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin size={24} className="text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </div>

          {/* Quick info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                  {property.name || 'Untitled Property'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                  {property.address || 'No address'}
                </p>
              </div>
              {property.isBTR && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold flex-shrink-0">
                  BTR
                </span>
              )}
            </div>

            {/* Price and rating row */}
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold text-primary-700 dark:text-primary-400 text-sm">
                {property.price || '—'}
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                <StarRating rating={property.rating} onChange={onRatingChange} size="sm" />
              </div>
            </div>
          </div>

          {/* Expand/collapse button */}
          <button
            onClick={handleMobileExpand}
            className="w-10 h-10 flex items-center justify-center text-gray-400 flex-shrink-0"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight 
              size={20} 
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
            />
          </button>
        </div>

        {/* Expandable details */}
        <div 
          className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[400px]' : 'max-h-0'}`}
        >
          <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            {/* Distances */}
            {property.distances && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                  <Navigation size={14} /> {property.distances.direct.toFixed(1)}km
                </span>
                {property.distances.publicTransport && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                    <Train size={14} /> {property.distances.publicTransport.duration}
                  </span>
                )}
                {property.distances.walking && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs">
                    <PersonStanding size={14} /> {property.distances.walking.duration}
                  </span>
                )}
                {property.distances.driving && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-xs">
                    <Car size={14} /> {property.distances.driving.duration}
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            {(propertyTags.length > 0 || availableTags.length > 0) && (
              <div className="flex flex-wrap gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                {propertyTags.map((tagId) => {
                  const tag = availableTags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onTagToggle(tag.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium min-h-[36px]"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                      <X size={12} />
                    </button>
                  );
                })}
                {availableTags.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowTagPicker(!showTagPicker)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 min-h-[36px]"
                    >
                      <Plus size={14} /> Tag
                    </button>
                    {showTagPicker && (
                      <div className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 min-w-[140px]">
                        {availableTags.filter(t => !propertyTags.includes(t.id)).length === 0 ? (
                          <p className="text-xs text-gray-400 px-2 py-1">All tags applied</p>
                        ) : (
                          availableTags.filter(t => !propertyTags.includes(t.id)).map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => { onTagToggle(tag.id); setShowTagPicker(false); }}
                              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                            >
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                              <span className="text-gray-700 dark:text-gray-300">{tag.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            <div onClick={(e) => e.stopPropagation()}>
              {isEditingComment ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 text-sm px-3 py-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCommentSave(); }}
                  />
                  <button
                    onClick={handleCommentSave}
                    className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium min-h-[44px]"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingComment(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-left min-h-[44px]"
                >
                  <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                  <span className={property.comment ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                    {property.comment || 'Add a note...'}
                  </span>
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {property.url && (
                <a
                  href={property.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium min-h-[48px] active:bg-primary-700"
                >
                  <ExternalLink size={18} />
                  View Listing
                </a>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onBTRChange(!property.isBTR); }}
                className={`px-4 py-3 rounded-xl text-sm font-medium min-h-[48px] flex items-center justify-center gap-1.5 ${
                  property.isBTR
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Building2 size={16} />
                BTR
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                aria-label="Remove property"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={onRemove}
          title="Delete Property?"
          message={`"${property.name || 'This property'}" will be moved to trash. You can restore it later.`}
          confirmText="Move to Trash"
          cancelText="Cancel"
          variant="danger"
        />
      </Card>
    );
  }

  // Desktop layout (unchanged)
  return (
    <Card selected={isSelected} onClick={onClick} className="overflow-hidden">
      <div className="flex">
        {/* Thumbnail */}
        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative">
          {property.thumbnail ? (
            <img
              src={property.thumbnail}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{property.name || 'Untitled Property'}</h3>
              {/* Editable Address */}
              {isEditingAddress ? (
                <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="flex-1 text-xs px-1.5 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Enter address"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddressSave(); if (e.key === 'Escape') setIsEditingAddress(false); }}
                  />
                  <button onClick={handleAddressSave} className="p-2 md:p-0.5 text-green-600 hover:text-green-800 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center">
                    <Check size={14} className="md:w-3 md:h-3" />
                  </button>
                  <button onClick={() => { setAddress(property.address || ''); setIsEditingAddress(false); }} className="p-2 md:p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center">
                    <X size={14} className="md:w-3 md:h-3" />
                  </button>
                </div>
              ) : (
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 truncate cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 group"
                  onClick={(e) => { e.stopPropagation(); setIsEditingAddress(true); }}
                  title="Click to edit address"
                >
                  {property.address || 'Click to add address'}
                  <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              )}
            </div>
            {/* BTR Toggle Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onBTRChange(!property.isBTR); }}
              className={`px-3 py-2 md:px-2 md:py-0.5 rounded-full text-xs font-medium transition-colors min-h-[44px] md:min-h-0 flex items-center justify-center ${
                property.isBTR
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={property.isBTR ? 'Build to Rent - Click to remove' : 'Click to mark as Build to Rent'}
            >
              <Building2 size={14} className="inline mr-1 md:mr-0.5 md:w-3 md:h-3" />
              BTR
            </button>
          </div>

          {/* Rating */}
          <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
            <StarRating
              rating={property.rating}
              onChange={onRatingChange}
              size="sm"
            />
          </div>

          {/* Editable Price */}
          <div className="mt-1.5 flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
            {isEditingPrice ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-24 text-sm px-2 py-0.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., £1,500"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSave(); if (e.key === 'Escape') setIsEditingPrice(false); }}
                />
                <button onClick={handlePriceSave} className="p-2 md:p-0.5 text-green-600 hover:text-green-800 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center">
                  <Check size={16} className="md:w-3.5 md:h-3.5" />
                </button>
                <button onClick={() => { setPrice(property.price || ''); setIsEditingPrice(false); }} className="p-2 md:p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center">
                  <X size={16} className="md:w-3.5 md:h-3.5" />
                </button>
              </div>
            ) : (
              <span
                className="font-bold text-primary-700 dark:text-primary-400 cursor-pointer hover:text-primary-800 dark:hover:text-primary-300 flex items-center gap-1 group"
                onClick={() => setIsEditingPrice(true)}
                title="Click to edit price"
              >
                {property.price || 'Add price'}
                <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
          </div>

          {/* Distances */}
          {property.distances && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Navigation size={12} /> {property.distances.direct.toFixed(1)}km
              </span>
              {property.distances.publicTransport && (
                <span className="flex items-center gap-1">
                  <Train size={12} /> {property.distances.publicTransport.duration}
                </span>
              )}
              {property.distances.walking && (
                <span className="flex items-center gap-1">
                  <PersonStanding size={12} /> {property.distances.walking.duration}
                </span>
              )}
              {property.distances.driving && (
                <span className="flex items-center gap-1">
                  <Car size={12} /> {property.distances.driving.duration}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1 items-center" onClick={(e) => e.stopPropagation()}>
            {/* Show applied tags */}
            {propertyTags.map((tagId) => {
              const tag = availableTags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: tag.color + '25', color: tag.color }}
                  onClick={() => onTagToggle(tag.id)}
                  title="Click to remove"
                >
                  {tag.name}
                  <X size={10} />
                </span>
              );
            })}

            {/* Add tag button */}
            {availableTags.length > 0 && (
              <div className="relative">
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="inline-flex items-center gap-0.5 px-3 py-2 md:px-1.5 md:py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[44px] md:min-h-0"
              >
                <Plus size={12} className="md:w-2.5 md:h-2.5" />
                Tag
              </button>

                {/* Tag picker dropdown */}
                {showTagPicker && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[120px]">
                    {availableTags.filter(t => !propertyTags.includes(t.id)).length === 0 ? (
                      <p className="text-[10px] text-gray-400 px-1">All tags applied</p>
                    ) : (
                      availableTags.filter(t => !propertyTags.includes(t.id)).map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => { onTagToggle(tag.id); setShowTagPicker(false); }}
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
          </div>
        </div>
      </div>

      {/* Comment section */}
      <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
        {isEditingComment ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-xs px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommentSave(); }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleCommentSave(); }}
              className="text-xs text-primary-600 dark:text-primary-400 font-medium px-4 py-2 md:px-0 md:py-0 min-h-[44px] md:min-h-0 flex items-center justify-center"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {property.comment ? (
              <p
                className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate cursor-pointer hover:text-gray-900 dark:hover:text-gray-200"
                onClick={(e) => { e.stopPropagation(); setIsEditingComment(true); }}
              >
                <MessageSquare size={12} className="inline mr-1" />
                {property.comment}
              </p>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditingComment(true); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-2 md:px-0 md:py-0 min-h-[44px] md:min-h-0 flex items-center"
              >
                <MessageSquare size={14} className="inline mr-1 md:w-3 md:h-3" />
                Add comment
              </button>
            )}
            <div className="flex items-center gap-2 ml-2">
              {property.url && (
                <a
                  href={property.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-4 py-3 md:px-3 md:py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg text-xs font-medium transition-colors min-h-[44px] md:min-h-0"
                  title="Open listing"
                >
                  <ExternalLink size={16} className="md:w-3.5 md:h-3.5" />
                  View listing
                </a>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="p-3 md:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                title="Remove property"
                aria-label="Remove property"
              >
                <Trash2 size={18} className="md:w-3.5 md:h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={onRemove}
        title="Delete Property?"
        message={`"${property.name || 'This property'}" will be moved to trash. You can restore it later.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        variant="danger"
      />
    </Card>
  );
}
