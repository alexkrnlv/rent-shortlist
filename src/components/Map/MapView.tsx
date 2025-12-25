import { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from '@react-google-maps/api';
import { useSettingsStore } from '../../store/useSettingsStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import type { Property } from '../../types';
import { MapPin, Navigation, Car, PersonStanding, Train, X } from 'lucide-react';
import { StarRating } from '../ui/StarRating';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const lightMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

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
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

const getMapOptions = (isDark: boolean, isMobile: boolean): google.maps.MapOptions => ({
  disableDefaultUI: false,
  zoomControl: !isMobile, // Hide on mobile - use pinch instead
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: !isMobile, // Hide on mobile
  styles: isDark ? darkMapStyles : lightMapStyles,
  // Cooperative mode requires two fingers to pan on mobile
  gestureHandling: isMobile ? 'cooperative' : 'greedy',
  // Disable keyboard shortcuts on mobile
  keyboardShortcuts: !isMobile,
});

interface PropertyMarkerProps {
  property: Property;
  isSelected: boolean;
  onClick: () => void;
}

function PropertyMarker({ property, isSelected, onClick }: PropertyMarkerProps) {
  if (!property.coordinates) return null;

  // Determine border color based on rating
  const getRatingBorderColor = () => {
    if (!property.rating) return isSelected ? '#1E40AF' : 'white';
    if (property.rating >= 4) return '#22C55E'; // green for 4-5 stars
    if (property.rating >= 3) return '#F59E0B'; // amber for 3 stars
    return isSelected ? '#1E40AF' : 'white';
  };

  return (
    <OverlayView
      position={property.coordinates}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        className="property-marker cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        style={{
          transform: 'translate(-50%, -100%)',
          zIndex: isSelected ? 1000 : 1,
          position: 'relative',
        }}
      >
        <div className={`relative ${isSelected ? 'scale-110' : ''} transition-transform`}>
          {property.thumbnail ? (
            <img
              src={property.thumbnail}
              alt={property.name}
              className="w-12 h-12 rounded-lg object-cover shadow-lg"
              style={{
                borderColor: getRatingBorderColor(),
                borderWidth: property.rating && property.rating >= 3 ? '4px' : '3px',
                borderStyle: 'solid',
              }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 shadow-lg"
              style={{
                borderColor: getRatingBorderColor(),
                borderWidth: property.rating && property.rating >= 3 ? '4px' : '3px',
                borderStyle: 'solid',
              }}
            >
              <MapPin size={20} className="text-blue-700" />
            </div>
          )}
          {/* Rating badge */}
          {property.rating && property.rating > 0 && (
            <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full w-5 h-5 flex items-center justify-center shadow-md">
              <span className="text-[10px] font-bold text-white">{property.rating}</span>
            </div>
          )}
          {/* BTR badge */}
          {property.isBTR && (
            <div className="absolute -bottom-1 -left-1 bg-purple-600 text-white text-[8px] font-bold px-1 py-0.5 rounded shadow-md">
              BTR
            </div>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-md text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
            {property.price || property.name.substring(0, 15)}
          </div>
        </div>
      </div>
    </OverlayView>
  );
}

// Custom info popup component instead of InfoWindow
function PropertyPopup({ property, onClose }: { property: Property; onClose: () => void }) {
  if (!property.coordinates) return null;

  return (
    <OverlayView
      position={property.coordinates}
      mapPaneName={OverlayView.FLOAT_PANE}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-[calc(100vw-2rem)] max-w-[320px] min-w-[240px] md:min-w-[280px]"
        style={{
          transform: 'translate(-50%, -100%)',
          marginTop: '-70px',
          position: 'relative',
          zIndex: 2000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 md:p-1 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
          aria-label="Close popup"
        >
          <X size={18} className="text-gray-600 dark:text-gray-300 md:w-4 md:h-4" />
        </button>

        {property.thumbnail && (
          <img
            src={property.thumbnail}
            alt={property.name}
            className="w-full h-32 object-cover rounded-t-lg"
          />
        )}

        <div className="p-3 md:p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 pr-8 md:pr-6 flex-1 text-sm md:text-base">{property.name}</h3>
            {property.isBTR && (
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded flex-shrink-0">
                BTR
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">{property.address}</p>

          {/* Rating */}
          <div className="mb-2">
            <StarRating rating={property.rating} readonly size="sm" />
          </div>

          {property.price && (
            <p className="text-base md:text-lg font-bold text-primary-700 mb-3">{property.price}</p>
          )}

          {property.distances && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Navigation size={12} className="md:w-3.5 md:h-3.5" />
                <span>{property.distances.direct.toFixed(1)}km direct</span>
              </div>
              {property.distances.publicTransport && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Train size={12} className="md:w-3.5 md:h-3.5" />
                  <span>{property.distances.publicTransport.duration}</span>
                </div>
              )}
              {property.distances.walking && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <PersonStanding size={12} className="md:w-3.5 md:h-3.5" />
                  <span>{property.distances.walking.duration}</span>
                </div>
              )}
              {property.distances.driving && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Car size={12} className="md:w-3.5 md:h-3.5" />
                  <span>{property.distances.driving.duration}</span>
                </div>
              )}
            </div>
          )}

          {property.url && (
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 md:py-2 px-4 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors min-h-[44px] md:min-h-0 flex items-center justify-center"
            >
              View Listing
            </a>
          )}
        </div>
      </div>
    </OverlayView>
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
    
    // Watch for class changes on html element
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
    // Wait for tiles to load before showing markers
    google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
      setMapReady(true);
    });
    // Initialize transit layer
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

  // Apply dark mode styles to map
  useEffect(() => {
    if (map) {
      map.setOptions({ styles: isDarkMode ? darkMapStyles : lightMapStyles });
    }
  }, [map, isDarkMode]);

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
        {/* Center Point Marker */}
        <Marker
          position={settings.centerPoint}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: isMobile ? 10 : 12,
            fillColor: '#F59E0B',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: isMobile ? 2 : 3,
          }}
          title={settings.centerPoint.name}
        />

        {/* Property Markers - only render when map is ready */}
        {mapReady && filteredProperties.map((property) => (
          <PropertyMarker
            key={property.id}
            property={property}
            isSelected={property.id === selectedPropertyId}
            onClick={() => handleMarkerClick(property.id)}
          />
        ))}

        {/* Property Popup */}
        {mapReady && selectedProperty?.coordinates && showPopup && (
          <PropertyPopup
            property={selectedProperty}
            onClose={() => setShowPopup(false)}
          />
        )}
      </GoogleMap>

      {/* Map Controls Overlay - repositioned for mobile */}
      <div className={`
        absolute z-10 flex flex-col gap-2
        ${isMobile 
          ? 'bottom-[calc(15vh+80px)] left-3' 
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

      {/* Mobile gesture hint - shows briefly on first load */}
      {isMobile && mapReady && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none gesture-hint">
          <div className="px-3 py-1.5 bg-black/70 text-white text-xs rounded-full backdrop-blur-sm">
            Use two fingers to move map
          </div>
        </div>
      )}
    </div>
  );
}
