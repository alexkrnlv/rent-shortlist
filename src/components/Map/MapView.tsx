import { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from '@react-google-maps/api';
import { useSettingsStore } from '../../store/useSettingsStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import type { Property } from '../../types';
import { MapPin, Navigation, Train, X, ExternalLink, Car, PersonStanding, Building2 } from 'lucide-react';
import { StarRating } from '../ui/StarRating';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const lightMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

// Dark map styles - transit-friendly version that keeps transit visible
const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  // Keep transit visible and contrasting - don't override default colors
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#81d4fa' }] },
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

const getMapOptions = (isDark: boolean, isMobile: boolean): google.maps.MapOptions => ({
  disableDefaultUI: false,
  zoomControl: !isMobile,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: !isMobile,
  styles: isDark ? darkMapStyles : lightMapStyles,
  gestureHandling: 'greedy',
  keyboardShortcuts: !isMobile,
});

// Simple dot marker for properties
interface PropertyDotMarkerProps {
  property: Property;
  isSelected: boolean;
  onClick: () => void;
}

function PropertyDotMarker({ property, isSelected, onClick }: PropertyDotMarkerProps) {
  if (!property.coordinates) return null;

  // Property dots are teal/cyan, selected is darker
  const getMarkerColor = () => {
    if (isSelected) return '#0891B2'; // cyan-600
    if (property.rating && property.rating >= 4) return '#14B8A6'; // teal-500
    if (property.rating && property.rating >= 3) return '#2DD4BF'; // teal-400
    return '#5EEAD4'; // teal-300
  };

  return (
    <OverlayView
      position={property.coordinates}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        style={{
          transform: 'translate(-50%, -50%)',
          zIndex: isSelected ? 1000 : 1,
        }}
      >
        <div
          className={`
            rounded-full shadow-lg transition-transform duration-150
            ${isSelected ? 'scale-125' : 'hover:scale-110'}
          `}
          style={{
            width: isSelected ? '20px' : '16px',
            height: isSelected ? '20px' : '16px',
            backgroundColor: getMarkerColor(),
            border: `3px solid white`,
            boxShadow: isSelected 
              ? '0 0 0 3px rgba(8, 145, 178, 0.3), 0 4px 12px rgba(0,0,0,0.3)' 
              : '0 2px 6px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </OverlayView>
  );
}

// Desktop property popup (info window style)
function PropertyPopup({ property, onClose }: { property: Property; onClose: () => void }) {
  if (!property.coordinates) return null;

  return (
    <OverlayView
      position={property.coordinates}
      mapPaneName={OverlayView.FLOAT_PANE}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-[280px]"
        style={{
          transform: 'translate(-50%, -100%)',
          marginTop: '-20px',
          position: 'relative',
          zIndex: 2000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600"
          aria-label="Close popup"
        >
          <X size={16} className="text-gray-600 dark:text-gray-300" />
        </button>

        {property.thumbnail && (
          <img
            src={property.thumbnail}
            alt={property.name}
            className="w-full h-32 object-cover rounded-t-lg"
          />
        )}

        <div className="p-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 pr-6 text-sm">{property.name}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{property.address}</p>

          <div className="mb-2">
            <StarRating rating={property.rating} readonly size="sm" />
          </div>

          {property.price && (
            <p className="text-base font-bold text-primary-700 mb-3">{property.price}</p>
          )}

          {property.distances && (
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Navigation size={12} />
                <span>{property.distances.direct.toFixed(1)}km</span>
              </div>
              {property.distances.publicTransport && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Train size={12} />
                  <span>{property.distances.publicTransport.duration}</span>
                </div>
              )}
            </div>
          )}

          {property.url && (
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2 px-4 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              View Listing
            </a>
          )}
        </div>
      </div>
    </OverlayView>
  );
}

// Mobile property slide-up sheet (covers 40% of screen, covers bottom nav)
function MobilePropertySheet({ 
  property, 
  onClose,
  isVisible,
}: { 
  property: Property; 
  onClose: () => void;
  isVisible: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/20 z-50 transition-opacity duration-300
          ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 bg-white dark:bg-gray-800 
          rounded-t-3xl shadow-2xl z-50
          transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ 
          height: '40vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={20} className="text-gray-600 dark:text-gray-300" />
        </button>

        {/* Content - scrollable */}
        <div className="h-full overflow-y-auto px-4 pb-4">
          {/* Header with image and basic info */}
          <div className="flex gap-4 mb-4">
            {/* Thumbnail */}
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
              {property.thumbnail ? (
                <img src={property.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin size={32} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1">{property.name}</h3>
                {property.isBTR && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold">
                    <Building2 size={10} />
                    BTR
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{property.address}</p>
              
              <div className="mt-2">
                <StarRating rating={property.rating} readonly size="md" />
              </div>
            </div>
          </div>

          {/* Price */}
          {property.price && (
            <div className="mb-4">
              <span className="text-2xl font-bold text-primary-700 dark:text-primary-400">{property.price}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/ month</span>
            </div>
          )}

          {/* Distances */}
          {property.distances && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <Navigation size={18} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{property.distances.direct.toFixed(1)} km</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Direct</p>
                </div>
              </div>
              {property.distances.publicTransport && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Train size={18} className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{property.distances.publicTransport.duration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Transit</p>
                  </div>
                </div>
              )}
              {property.distances.walking && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
                  <PersonStanding size={18} className="text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{property.distances.walking.duration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Walking</p>
                  </div>
                </div>
              )}
              {property.distances.driving && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                  <Car size={18} className="text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{property.distances.driving.duration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Driving</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comment */}
          {property.comment && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{property.comment}"</p>
            </div>
          )}

          {/* Action button */}
          {property.url && (
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-primary-600 text-white rounded-xl text-base font-semibold active:bg-primary-700 transition-colors"
            >
              <ExternalLink size={18} />
              View Listing
            </a>
          )}
        </div>
      </div>
    </>
  );
}

export function MapView() {
  const { settings } = useSettingsStore();
  const { getFilteredProperties, selectedPropertyId, setSelectedProperty, getPropertyById } = usePropertyStore();
  const isMobile = useMobileDetect();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showTransit, setShowTransit] = useState(false);
  const [transitLayer, setTransitLayer] = useState<google.maps.TransitLayer | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Track dark mode state
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: settings.googleMapsApiKey,
    libraries: ['places'],
  });

  const filteredProperties = getFilteredProperties();
  const selectedProperty = selectedPropertyId ? getPropertyById(selectedPropertyId) : null;

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
      setMapReady(true);
    });
    const layer = new google.maps.TransitLayer();
    setTransitLayer(layer);
  }, []);

  const onUnmount = useCallback(() => {
    if (transitLayer) {
      transitLayer.setMap(null);
    }
    setMap(null);
    setMapReady(false);
  }, [transitLayer]);

  // Fit bounds when map is ready and properties exist
  useEffect(() => {
    if (map && mapReady && filteredProperties.length > 0) {
      const propertiesWithCoords = filteredProperties.filter(p => p.coordinates);
      if (propertiesWithCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        propertiesWithCoords.forEach((p) => {
          if (p.coordinates) {
            bounds.extend(p.coordinates);
          }
        });
        bounds.extend(settings.centerPoint);
        map.fitBounds(bounds, 50);
      }
    }
  }, [map, mapReady, filteredProperties.length, settings.centerPoint]);

  // Center on selected property
  useEffect(() => {
    if (map && selectedProperty?.coordinates) {
      map.panTo(selectedProperty.coordinates);
      setShowPopup(true);
    }
  }, [map, selectedPropertyId]);

  // Handle map type changes
  useEffect(() => {
    if (map) {
      map.setMapTypeId(mapType === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP);
    }
  }, [map, mapType]);

  // Handle transit layer toggle
  useEffect(() => {
    if (map && transitLayer) {
      transitLayer.setMap(showTransit ? map : null);
    }
  }, [map, transitLayer, showTransit]);

  // Apply dark mode styles to map (only for roadmap, not satellite)
  useEffect(() => {
    if (map) {
      // Don't apply custom styles to satellite view - they don't work and interfere with transit
      if (mapType === 'satellite') {
        map.setOptions({ styles: [] });
      } else {
        map.setOptions({ styles: isDarkMode ? darkMapStyles : lightMapStyles });
      }
    }
  }, [map, isDarkMode, mapType]);

  const handleMarkerClick = (propertyId: string) => {
    if (selectedPropertyId === propertyId) {
      setShowPopup(!showPopup);
    } else {
      setSelectedProperty(propertyId);
      setShowPopup(true);
    }
  };

  const handleMapClick = () => {
    setSelectedProperty(null);
    setShowPopup(false);
  };

  const handleCloseSheet = () => {
    setSelectedProperty(null);
    setShowPopup(false);
  };

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8">
          <MapPin size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Map Loading Error</h3>
          <p className="text-gray-500 dark:text-gray-400">Please check your Google Maps API key in Settings</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="spinner" />
      </div>
    );
  }

  if (!settings.googleMapsApiKey) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8">
          <MapPin size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Google Maps API Key Required</h3>
          <p className="text-gray-500 dark:text-gray-400">Please add your API key in Settings to view the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={settings.centerPoint}
        zoom={12}
        options={getMapOptions(isDarkMode, isMobile)}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
      >
        {/* Center Point Marker - Amber/Orange color */}
        <Marker
          position={settings.centerPoint}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: isMobile ? 10 : 12,
            fillColor: '#F59E0B', // amber-500
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: isMobile ? 2 : 3,
          }}
          title={settings.centerPoint.name}
        />

        {/* Property Markers - Teal dots */}
        {mapReady && filteredProperties.map((property) => (
          <PropertyDotMarker
            key={property.id}
            property={property}
            isSelected={property.id === selectedPropertyId}
            onClick={() => handleMarkerClick(property.id)}
          />
        ))}

        {/* Desktop: Property Popup */}
        {!isMobile && mapReady && selectedProperty?.coordinates && showPopup && (
          <PropertyPopup
            property={selectedProperty}
            onClose={() => setShowPopup(false)}
          />
        )}
      </GoogleMap>

      {/* Mobile: Property Sheet (covers bottom nav) */}
      {isMobile && selectedProperty && (
        <MobilePropertySheet
          property={selectedProperty}
          onClose={handleCloseSheet}
          isVisible={showPopup}
        />
      )}

      {/* Map Controls Overlay - hide when sheet is open on mobile */}
      {(!isMobile || !showPopup) && (
        <div className={`
          absolute z-10 flex flex-col gap-2
          ${isMobile 
            ? 'top-3 left-3' 
            : 'top-4 right-4'
          }
        `}>
          {/* Map Type Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setMapType('roadmap')}
              className={`
                block w-full text-sm font-medium text-left transition-colors
                ${isMobile ? 'px-3 py-2.5 min-h-[44px]' : 'px-4 py-2'}
                ${mapType === 'roadmap'
                  ? 'bg-primary-700 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
              title="Road Map"
            >
              🗺️ {isMobile ? '' : 'Map'}
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`
                block w-full text-sm font-medium text-left transition-colors border-t border-gray-200 dark:border-gray-700
                ${isMobile ? 'px-3 py-2.5 min-h-[44px]' : 'px-4 py-2'}
                ${mapType === 'satellite'
                  ? 'bg-primary-700 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
              title="Satellite View"
            >
              🛰️ {isMobile ? '' : 'Satellite'}
            </button>
          </div>

          {/* Transit Layer Toggle */}
          <button
            onClick={() => setShowTransit(!showTransit)}
            className={`
              text-sm font-medium rounded-lg shadow-lg border transition-colors
              ${isMobile ? 'px-3 py-2.5 min-h-[44px] min-w-[44px]' : 'px-4 py-2'}
              ${showTransit
                ? 'bg-primary-700 text-white border-primary-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
            title="Toggle Public Transport"
          >
            🚇 {isMobile ? '' : 'Transit'}
          </button>
        </div>
      )}
    </div>
  );
}
