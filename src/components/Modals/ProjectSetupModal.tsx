import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CityAutocomplete, PlacesAutocomplete } from '../ui/PlacesAutocomplete';
import { useSettingsStore, POPULAR_CITIES } from '../../store/useSettingsStore';
import { MapPin, Search, Globe, Building2 } from 'lucide-react';
import type { CityContext, CenterPoint } from '../../types';

interface ProjectSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type SetupStep = 'city' | 'location';

export function ProjectSetupModal({ isOpen, onClose, onComplete }: ProjectSetupModalProps) {
  const { settings, setCity, setCenterPoint } = useSettingsStore();
  const [step, setStep] = useState<SetupStep>('city');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityContext | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('city');
      setSearchQuery('');
      // Pre-select current city if one exists
      if (settings.project?.city) {
        setSelectedCity(settings.project.city);
      } else {
        setSelectedCity(null);
      }
    }
  }, [isOpen, settings.project?.city]);

  // Filter popular cities based on search
  const filteredCities = POPULAR_CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.countryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group cities by country
  const citiesByCountry = filteredCities.reduce((acc, city) => {
    const country = city.countryName;
    if (!acc[country]) acc[country] = [];
    acc[country].push(city);
    return acc;
  }, {} as Record<string, CityContext[]>);

  // Handle city selection from popular list
  const handleCitySelect = (city: CityContext) => {
    setSelectedCity(city);
    setCity(city);
    setStep('location');
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
    setSelectedCity(cityContext);
    setCity(cityContext);
    setStep('location');
  };

  // Handle location selection from Google Places
  const handleLocationSelect = (place: { name: string; address: string; lat: number; lng: number }) => {
    const centerPoint: CenterPoint = {
      name: place.address || place.name,
      lat: place.lat,
      lng: place.lng,
    };
    setCenterPoint(centerPoint);
    onComplete?.();
    onClose();
  };

  // Handle using city center as default
  const handleUseCityCenter = () => {
    if (!selectedCity) return;
    
    const centerPoint: CenterPoint = {
      name: `City Center, ${selectedCity.name}`,
      lat: selectedCity.lat,
      lng: selectedCity.lng,
    };
    setCenterPoint(centerPoint);
    onComplete?.();
    onClose();
  };

  // Skip location setup (just use city)
  const handleSkipLocation = () => {
    if (!selectedCity) return;
    handleUseCityCenter();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={step === 'city' ? 'Select Your City' : 'Set Your Commute Destination'}
      size="lg"
    >
      <div className="space-y-5">
        {step === 'city' ? (
          <>
            {/* Intro */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
                <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Where are you looking for a home?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select your city to help us find accurate property locations and calculate commute times.
                </p>
              </div>
            </div>

            {/* Google Places City Autocomplete */}
            <div className="space-y-2">
              <CityAutocomplete
                placeholder="Search for any city worldwide..."
                onCitySelect={handleGoogleCitySelect}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Or select from popular cities below
              </p>
            </div>

            {/* Filter popular cities */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter popular cities..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* City list by country */}
            <div className="max-h-[300px] overflow-y-auto space-y-4">
              {Object.entries(citiesByCountry).map(([country, cities]) => (
                <div key={country}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">
                    {country}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {cities.map((city) => (
                      <button
                        key={`${city.name}-${city.country}`}
                        onClick={() => handleCitySelect(city)}
                        className={`
                          flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left
                          ${selectedCity?.name === city.name && selectedCity?.country === city.country
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{city.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredCities.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No popular cities found. Use the search above to find any city worldwide.
              </p>
            )}
          </>
        ) : (
          <>
            {/* Location step */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Where do you need to commute to?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your office, school, or any location you want to calculate travel times from.
                  <br />
                  <span className="text-primary-600 dark:text-primary-400">City: {selectedCity?.name}</span>
                </p>
              </div>
            </div>

            {/* Google Places Location Autocomplete */}
            <PlacesAutocomplete
              placeholder={`Search for your office, school, or any place in ${selectedCity?.name}...`}
              onPlaceSelect={handleLocationSelect}
              restrictToCity={selectedCity ? {
                name: selectedCity.name,
                country: selectedCity.country,
                lat: selectedCity.lat,
                lng: selectedCity.lng,
              } : undefined}
              types={['establishment', 'geocode']}
            />

            {/* Use city center option */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleUseCityCenter}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <MapPin className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Use city center</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Skip this step and use {selectedCity?.name} center as your reference point</p>
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Button variant="ghost" onClick={() => setStep('city')}>
                ← Back to cities
              </Button>
              <Button variant="secondary" onClick={handleSkipLocation}>
                Skip for now
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

