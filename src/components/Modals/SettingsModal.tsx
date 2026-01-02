import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PlacesAutocomplete, CityAutocomplete } from '../ui/PlacesAutocomplete';
import { useSettingsStore, POPULAR_CITIES } from '../../store/useSettingsStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useTutorialStore } from '../../store/useTutorialStore';
import { MapPin, GraduationCap, RefreshCw, Sun, Moon, Monitor, Globe, Search, ChevronDown } from 'lucide-react';
import type { ThemeMode, CityContext } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setCenterPoint, setThemeMode, setCity } = useSettingsStore();
  const { recalculateDistances, properties } = usePropertyStore();
  const { startTutorial, resetTutorial } = useTutorialStore();

  const [centerName, setCenterName] = useState(settings.centerPoint.name);
  const [centerLat, setCenterLat] = useState(settings.centerPoint.lat.toString());
  const [centerLng, setCenterLng] = useState(settings.centerPoint.lng.toString());
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // City selection state
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCenterName(settings.centerPoint.name);
      setCenterLat(settings.centerPoint.lat.toString());
      setCenterLng(settings.centerPoint.lng.toString());
      setShowCitySelector(false);
      setCitySearch('');
    }
  }, [isOpen, settings]);

  // Handle location selection from Google Places
  const handlePlaceSelect = (place: { name: string; address: string; lat: number; lng: number }) => {
    const city = settings.project?.city;
    const displayName = place.address || (city ? `${place.name}, ${city.name}` : place.name);
    setCenterName(displayName);
    setCenterLat(place.lat.toString());
    setCenterLng(place.lng.toString());
  };

  const handleSave = async () => {
    const newCenter = {
      name: centerName,
      lat: parseFloat(centerLat) || 0,
      lng: parseFloat(centerLng) || 0,
    };
    
    // Check if center point actually changed
    const hasChanged = 
      newCenter.lat !== settings.centerPoint.lat || 
      newCenter.lng !== settings.centerPoint.lng;
    
    setCenterPoint(newCenter);
    
    // Recalculate distances if center changed and there are properties
    if (hasChanged && properties.length > 0) {
      setIsRecalculating(true);
      try {
        await recalculateDistances({ lat: newCenter.lat, lng: newCenter.lng });
      } catch (error) {
        console.error('Failed to recalculate distances:', error);
      }
      setIsRecalculating(false);
    }
    
    onClose();
  };

  const handleCitySelect = (city: CityContext) => {
    setCity(city);
    setShowCitySelector(false);
    setCitySearch('');
    // Update center to city center
    setCenterName(`City Center, ${city.name}`);
    setCenterLat(city.lat.toString());
    setCenterLng(city.lng.toString());
  };

  // Handle city selection from Google Places Autocomplete
  const handleGoogleCitySelect = (city: { name: string; country: string; countryName: string; lat: number; lng: number }) => {
    const cityContext: CityContext = {
      name: city.name,
      country: city.country,
      countryName: city.countryName,
      lat: city.lat,
      lng: city.lng,
    };
    handleCitySelect(cityContext);
  };

  // Filter cities
  const filteredCities = POPULAR_CITIES.filter(city =>
    city.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    city.countryName.toLowerCase().includes(citySearch.toLowerCase())
  );

  const currentCity = settings.project?.city;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="md">
      <div className="space-y-6">
        {/* City Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Globe size={16} />
            City / Region
          </h3>
          
          <div className="relative">
            <button
              onClick={() => setShowCitySelector(!showCitySelector)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {currentCity ? `${currentCity.name}, ${currentCity.countryName}` : 'Select a city...'}
                </span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCitySelector ? 'rotate-180' : ''}`} />
            </button>

            {showCitySelector && (
              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden">
                {/* Google Places City Search */}
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <CityAutocomplete
                    placeholder="Search any city worldwide..."
                    onCitySelect={handleGoogleCitySelect}
                  />
                </div>
                
                {/* Popular cities filter */}
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or select from popular cities:</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Filter popular cities..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto p-1">
                  {filteredCities.map((city) => (
                    <button
                      key={`${city.name}-${city.country}`}
                      onClick={() => handleCitySelect(city)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                        currentCity?.name === city.name && currentCity?.country === city.country
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <span className="flex-1">{city.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{city.countryName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Point Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MapPin size={16} />
            Commute Destination (for distance calculations)
          </h3>

          {/* Location Search with Google Places Autocomplete */}
          <PlacesAutocomplete
            placeholder={currentCity ? `Search for a location in ${currentCity.name}...` : 'Search for a location...'}
            onPlaceSelect={handlePlaceSelect}
            restrictToCity={currentCity ? {
              name: currentCity.name,
              country: currentCity.country,
              lat: currentCity.lat,
              lng: currentCity.lng,
            } : undefined}
            types={['establishment', 'geocode']}
          />

          <Input
            label="Location Name"
            value={centerName}
            onChange={(e) => setCenterName(e.target.value)}
            placeholder="e.g., My Office"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={centerLat}
              onChange={(e) => setCenterLat(e.target.value)}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={centerLng}
              onChange={(e) => setCenterLng(e.target.value)}
            />
          </div>
        </div>

        {/* Theme Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sun size={16} className="dark:hidden" />
            <Moon size={16} className="hidden dark:block" />
            Theme
          </h3>
          <div className="flex gap-2">
            {([
              { mode: 'light' as ThemeMode, icon: Sun, label: 'Light' },
              { mode: 'dark' as ThemeMode, icon: Moon, label: 'Dark' },
              { mode: 'auto' as ThemeMode, icon: Monitor, label: 'Auto' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  settings.themeMode === mode
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Auto mode follows your system preference.
          </p>
        </div>

        {/* Tutorial Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <GraduationCap size={16} />
            Help & Tutorial
          </h3>
          <button
            onClick={() => {
              resetTutorial();
              startTutorial();
              onClose();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-left bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/30 hover:from-primary-100 hover:to-blue-100 dark:hover:from-primary-900/50 dark:hover:to-blue-900/50 rounded-xl border border-primary-100 dark:border-primary-800 transition-all duration-200 group"
          >
            <span className="text-2xl">🎓</span>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                Restart Tutorial
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Take the guided tour again
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">→</span>
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={isRecalculating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isRecalculating}>
            {isRecalculating ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
