import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PlacesAutocomplete, CityAutocomplete } from '../ui/PlacesAutocomplete';
import { useSettingsStore } from '../../store/useSettingsStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useTutorialStore } from '../../store/useTutorialStore';
import { MapPin, GraduationCap, RefreshCw, Sun, Moon, Monitor, Globe } from 'lucide-react';
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
  const [selectedCity, setSelectedCity] = useState<CityContext | null>(settings.project?.city || null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCenterName(settings.centerPoint.name);
      setCenterLat(settings.centerPoint.lat.toString());
      setCenterLng(settings.centerPoint.lng.toString());
      setSelectedCity(settings.project?.city || null);
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
    // Save city if changed
    if (selectedCity && cityHasChanged) {
      setCity(selectedCity);
    }

    const newCenter = {
      name: centerName,
      lat: parseFloat(centerLat) || 0,
      lng: parseFloat(centerLng) || 0,
    };
    
    // Check if center point actually changed
    const centerHasChanged = 
      newCenter.lat !== settings.centerPoint.lat || 
      newCenter.lng !== settings.centerPoint.lng;
    
    setCenterPoint(newCenter);
    
    // Recalculate distances if center changed and there are properties
    if (centerHasChanged && properties.length > 0) {
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

  // Handle city selection from Google Places Autocomplete (save to local state)
  const handleCitySelect = (city: { name: string; country: string; countryName: string; lat: number; lng: number }) => {
    const cityContext: CityContext = {
      name: city.name,
      country: city.country,
      countryName: city.countryName,
      lat: city.lat,
      lng: city.lng,
    };
    setSelectedCity(cityContext);
    // Update center to city center
    setCenterName(`City Center, ${city.name}`);
    setCenterLat(city.lat.toString());
    setCenterLng(city.lng.toString());
  };

  // Check if city has changed
  const cityHasChanged = selectedCity?.name !== settings.project?.city?.name ||
    selectedCity?.country !== settings.project?.city?.country;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="md">
      <div className="space-y-6">
        {/* City Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Globe size={16} />
            City / Region
          </h3>
          
          {/* Selected city display */}
          {selectedCity && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
              cityHasChanged 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800'
            }`}>
              <MapPin className={`w-5 h-5 ${
                cityHasChanged 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-primary-600 dark:text-primary-400'
              }`} />
              <div className="flex-1">
                {cityHasChanged && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">New City Selected</span>
                )}
                <span className={`font-medium block ${
                  cityHasChanged 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-primary-700 dark:text-primary-300'
                }`}>
                  {selectedCity.name}, {selectedCity.countryName}
                </span>
              </div>
              {cityHasChanged && (
                <span className="text-xs text-green-600 dark:text-green-400">Click Save to apply</span>
              )}
            </div>
          )}
          
          {/* City autocomplete */}
          <CityAutocomplete
            placeholder={selectedCity ? "Search for a different city..." : "Search for a city..."}
            onCitySelect={handleCitySelect}
          />
        </div>

        {/* Center Point Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MapPin size={16} />
            Commute Destination (for distance calculations)
          </h3>

          {/* Location Search with Google Places Autocomplete */}
          <PlacesAutocomplete
            placeholder={selectedCity ? `Search for a location in ${selectedCity.name}...` : 'Search for a location...'}
            onPlaceSelect={handlePlaceSelect}
            restrictToCity={selectedCity ? {
              name: selectedCity.name,
              country: selectedCity.country,
              lat: selectedCity.lat,
              lng: selectedCity.lng,
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
