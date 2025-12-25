import { ExternalLink, MapPin, Trash2, MessageSquare, Navigation, Train, PersonStanding, Car, Edit2, Check, X, Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Property, PropertyTag } from '../../types';
import { Card } from '../ui/Card';
import { StarRating } from '../ui/StarRating';

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
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
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

  return (
    <Card selected={isSelected} onClick={onClick} className="overflow-hidden">
      <div className="flex">
        {/* Thumbnail */}
        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 relative">
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

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{property.name || 'Untitled Property'}</h3>
              {/* Editable Address */}
              {isEditingAddress ? (
                <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="flex-1 text-xs px-1.5 py-0.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Enter address"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddressSave(); if (e.key === 'Escape') setIsEditingAddress(false); }}
                  />
                  <button onClick={handleAddressSave} className="p-0.5 text-green-600 hover:text-green-800">
                    <Check size={12} />
                  </button>
                  <button onClick={() => { setAddress(property.address || ''); setIsEditingAddress(false); }} className="p-0.5 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <p
                  className="text-xs text-gray-500 truncate cursor-pointer hover:text-gray-700 flex items-center gap-1 group"
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
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                property.isBTR
                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={property.isBTR ? 'Build to Rent - Click to remove' : 'Click to mark as Build to Rent'}
            >
              <Building2 size={12} className="inline mr-0.5" />
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
                  className="w-24 text-sm px-2 py-0.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., £1,500"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSave(); if (e.key === 'Escape') setIsEditingPrice(false); }}
                />
                <button onClick={handlePriceSave} className="p-0.5 text-green-600 hover:text-green-800">
                  <Check size={14} />
                </button>
                <button onClick={() => { setPrice(property.price || ''); setIsEditingPrice(false); }} className="p-0.5 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span
                className="font-bold text-primary-700 cursor-pointer hover:text-primary-800 flex items-center gap-1 group"
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
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
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
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <Plus size={10} />
                  Tag
                </button>

                {/* Tag picker dropdown */}
                {showTagPicker && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[120px]">
                    {availableTags.filter(t => !propertyTags.includes(t.id)).length === 0 ? (
                      <p className="text-[10px] text-gray-400 px-1">All tags applied</p>
                    ) : (
                      availableTags.filter(t => !propertyTags.includes(t.id)).map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => { onTagToggle(tag.id); setShowTagPicker(false); }}
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
          </div>
        </div>
      </div>

      {/* Comment section */}
      <div className="px-3 pb-3 border-t border-gray-100 mt-2 pt-2">
        {isEditingComment ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommentSave(); }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleCommentSave(); }}
              className="text-xs text-primary-600 font-medium"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {property.comment ? (
              <p
                className="text-xs text-gray-600 flex-1 truncate cursor-pointer hover:text-gray-900"
                onClick={(e) => { e.stopPropagation(); setIsEditingComment(true); }}
              >
                <MessageSquare size={12} className="inline mr-1" />
                {property.comment}
              </p>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditingComment(true); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                <MessageSquare size={12} className="inline mr-1" />
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-medium transition-colors"
                  title="Open listing"
                >
                  <ExternalLink size={14} />
                  View listing
                </a>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove property"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
