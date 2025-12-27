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

// ===========================================
// DESKTOP: Image marker with preview and name
// ===========================================
interface DesktopPropertyMarkerProps {
  property: Property;
  isSelected: boolean;
  onClick: () => void;
}

function DesktopPropertyMarker({ property, isSelected, onClick }: DesktopPropertyMarkerProps) {
  if (!property.coordinates) return null;

  const getRatingBorderColor = () => {
    if (!property.rating) return isSelected ? '#1E40AF' : 'white';
    if (property.rating >= 4) return '#22C55E';
    if (property.rating >= 3) return '#F59E0B';
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
          {property.rating && property.rating > 0 && (
            <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full w-5 h-5 flex items-center justify-center shadow-md">
              <span className="text-[10px] font-bold text-white">{property.rating}</span>
            </div>
          )}
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

// ===========================================
// MOBILE: Simple colored dot marker
// ===========================================
interface MobileDotMarkerProps {
  property: Property;
  isSelected: boolean;
  onClick: () => void;
}

function MobileDotMarker({ property, isSelected, onClick }: MobileDotMarkerProps) {
  if (!property.coordinates) return null;

  // Use coral/rose colors - stands out better on map
  const getMarkerColor = () => {
    if (isSelected) return '#E11D48'; // rose-600
    if (property.rating && property.rating >= 4) return '#F43F5E'; // rose-500
    if (property.rating && property.rating >= 3) return '#FB7185'; // rose-400
    return '#FDA4AF'; // rose-300
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
            ${isSelected ? 'scale-150' : 'hover:scale-125'}
          `}
          style={{
            width: isSelected ? '22px' : '16px',
            height: isSelected ? '22px' : '16px',
            backgroundColor: getMarkerColor(),
            border: `3px solid white`,
            boxShadow: isSelected 
              ? '0 0 0 4px rgba(225, 29, 72, 0.3), 0 4px 12px rgba(0,0,0,0.4)' 
              : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </OverlayView>
  );
}

// ===========================================
// DESKTOP: Property popup (info window style)
// ===========================================
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
          marginTop: '-70px',
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
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 pr-6 text-sm flex-1">{property.name}</h3>
            {property.isBTR && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold shrink-0">
                <Building2 size={10} />
                BTR
              </span>
            )}
          </div>
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

// ===========================================
// MOBILE: Full slide-up sheet (covers bottom nav)
// ===========================================
function MobilePropertySheet({ 
  property, 
  onClose,
  isVisible,
}: { 
  property: Property; 
  onClose: () => void;
  isVisible: boolean;
}) {
  // Handle drag to close
  const handleDragClose = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop - z-[100] to be above everything including bottom nav */}
      <div
        className={`
          fixed inset-0 bg-black/30 z-[100] transition-opacity duration-300 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />
      
      {/* Sheet - z-[101] above backdrop */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 bg-white dark:bg-gray-800 
          rounded-t-3xl shadow-2xl z-[101]
          transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ 
          height: '45vh',
          minHeight: '300px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle - tap or drag to close */}
        <button 
          onClick={handleDragClose}
          className="w-full flex justify-center pt-3 pb-2 active:bg-gray-50 dark:active:bg-gray-700 rounded-t-3xl transition-colors"
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </button>

        {/* Close button - positioned away from BTR badge */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <X size={20} className="text-gray-600 dark:text-gray-300" />
        </button>

        {/* Content - scrollable */}
        <div 
          className="overflow-y-auto px-5 pb-8"
          style={{ 
            height: 'calc(100% - 40px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Header with image and basic info */}
          <div className="flex gap-4 mb-4">
            {/* Thumbnail */}
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 shadow-md">
              {property.thumbnail ? (
                <img src={property.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin size={32} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Info - BTR badge moved below name, not next to X */}
            <div className="flex-1 min-w-0 pt-1 pr-10">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-2 mb-1">{property.name}</h3>
              {property.isBTR && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs font-bold mb-1">
                  <Building2 size={12} />
                  BTR
                </span>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{property.address}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-4">
            <StarRating rating={property.rating} readonly size="lg" />
          </div>

          {/* Price */}
          {property.price && (
            <div className="mb-5">
              <span className="text-3xl font-bold text-primary-700 dark:text-primary-400">{property.price}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">/ month</span>
            </div>
          )}

          {/* Distances */}
          {property.distances && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <Navigation size={20} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{property.distances.direct.toFixed(1)} km</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Direct distance</p>
                </div>
              </div>
              {property.distances.publicTransport && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Train size={20} className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{property.distances.publicTransport.duration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">By transit</p>
                  </div>
                </div>
              )}
              {property.distances.walking && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
                  <PersonStanding size={20} className="text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{property.distances.walking.duration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Walking</p>
                  </div>
                </div>
              )}
              {property.distances.driving && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                  <Car size={20} className="text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{property.distances.driving.duration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Driving</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comment */}
          {property.comment && (
            <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{property.comment}"</p>
            </div>
          )}

          {/* Action button */}
          {property.url && (
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-primary-600 text-white rounded-xl text-base font-semibold active:bg-primary-700 transition-colors shadow-lg"
            >
              <ExternalLink size={20} />
              View Original Listing
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

        {/* Property Markers - Desktop: Images, Mobile: Dots */}
        {mapReady && filteredProperties.map((property) => (
          isMobile ? (
            <MobileDotMarker
              key={property.id}
              property={property}
              isSelected={property.id === selectedPropertyId}
              onClick={() => handleMarkerClick(property.id)}
            />
          ) : (
            <DesktopPropertyMarker
              key={property.id}
              property={property}
              isSelected={property.id === selectedPropertyId}
              onClick={() => handleMarkerClick(property.id)}
            />
          )
        ))}

        {/* Desktop: Property Popup */}
        {!isMobile && mapReady && selectedProperty?.coordinates && showPopup && (
          <PropertyPopup
            property={selectedProperty}
            onClose={() => setShowPopup(false)}
          />
        )}
      </GoogleMap>

      {/* Mobile: Property Sheet (covers bottom nav with z-[100+]) */}
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
