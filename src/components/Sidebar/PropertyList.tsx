import { usePropertyStore } from '../../store/usePropertyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PropertyCard } from './PropertyCard';
import { PendingPropertyCard } from './PendingPropertyCard';
import { MapPin } from 'lucide-react';

export function PropertyList() {
  const { getFilteredProperties, selectedPropertyId, setSelectedProperty, updateProperty, removeProperty, tags, addTagToProperty, removeTagFromProperty, pendingProperties, removePendingProperty } = usePropertyStore();
  const { settings } = useSettingsStore();
  const properties = getFilteredProperties();

  const handleTagToggle = (propertyId: string, tagId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property?.tags?.includes(tagId)) {
      removeTagFromProperty(propertyId, tagId);
    } else {
      addTagToProperty(propertyId, tagId);
    }
  };

  const handleAddressChange = async (propertyId: string, newAddress: string) => {
    // First update the address text
    updateProperty(propertyId, { address: newAddress });

    // Then try to geocode and update coordinates
    if (newAddress) {
      try {
        const response = await fetch('http://localhost:3001/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: newAddress }),
        });

        if (response.ok) {
          const coordinates = await response.json();

          // Calculate distances
          let distances = null;
          if (coordinates && settings.centerPoint) {
            const distResponse = await fetch('http://localhost:3001/api/distances', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                origin: coordinates,
                destination: settings.centerPoint,
              }),
            });

            if (distResponse.ok) {
              const distData = await distResponse.json();
              const R = 6371;
              const dLat = ((settings.centerPoint.lat - coordinates.lat) * Math.PI) / 180;
              const dLng = ((settings.centerPoint.lng - coordinates.lng) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((coordinates.lat * Math.PI) / 180) *
                Math.cos((settings.centerPoint.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const directDistance = R * c;

              distances = {
                direct: directDistance,
                publicTransport: distData.transit,
                walking: distData.walking,
                driving: distData.driving,
              };
            }
          }

          updateProperty(propertyId, {
            coordinates,
            distances,
          });
        }
      } catch (error) {
        console.error('Failed to geocode address:', error);
      }
    }
  };

  const hasPending = pendingProperties.length > 0;
  const hasProperties = properties.length > 0;

  if (!hasPending && !hasProperties) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No properties yet</h3>
          <p className="text-sm text-gray-500">Click "Add Property" to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
      {/* Pending properties (being processed) - shown first */}
      {pendingProperties.map((pending) => (
        <PendingPropertyCard
          key={pending.id}
          pending={pending}
          onDismiss={() => removePendingProperty(pending.id)}
        />
      ))}
      
      {/* Regular properties */}
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isSelected={property.id === selectedPropertyId}
          availableTags={tags}
          onClick={() => setSelectedProperty(property.id === selectedPropertyId ? null : property.id)}
          onRemove={() => removeProperty(property.id)}
          onCommentChange={(comment) => updateProperty(property.id, { comment })}
          onRatingChange={(rating) => updateProperty(property.id, { rating: rating || null })}
          onPriceChange={(price) => updateProperty(property.id, { price: price || undefined })}
          onAddressChange={(address) => handleAddressChange(property.id, address)}
          onBTRChange={(isBTR) => updateProperty(property.id, { isBTR })}
          onTagToggle={(tagId) => handleTagToggle(property.id, tagId)}
        />
      ))}
    </div>
  );
}
