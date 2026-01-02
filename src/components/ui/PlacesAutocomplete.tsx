import { useEffect, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Search, Loader2 } from 'lucide-react';

// Define libraries as a constant to prevent re-renders
const LIBRARIES: ('places')[] = ['places'];

interface PlacesAutocompleteProps {
  placeholder?: string;
  onPlaceSelect: (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  }) => void;
  restrictToCity?: {
    name: string;
    country: string;
    lat: number;
    lng: number;
  };
  types?: string[]; // e.g., ['(cities)'], ['establishment'], ['address']
  className?: string;
  autoFocus?: boolean;
}

export function PlacesAutocomplete({
  placeholder = 'Search for a place...',
  onPlaceSelect,
  restrictToCity,
  types,
  className = '',
  autoFocus = false,
}: PlacesAutocompleteProps) {
  const { settings } = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: settings.googleMapsApiKey,
    libraries: LIBRARIES,
  });

  // Initialize autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || isInitialized) return;

    const options: google.maps.places.AutocompleteOptions = {
      fields: ['name', 'formatted_address', 'geometry', 'address_components'],
    };

    // Add type restrictions
    if (types && types.length > 0) {
      options.types = types;
    }

    // Add geographic restrictions if restricting to a city
    if (restrictToCity) {
      // Use component restrictions for country
      options.componentRestrictions = { country: restrictToCity.country };
      
      // Bias results toward the city location
      options.bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(restrictToCity.lat - 0.5, restrictToCity.lng - 0.5),
        new google.maps.LatLng(restrictToCity.lat + 0.5, restrictToCity.lng + 0.5)
      );
      options.strictBounds = false; // Allow results outside bounds but rank closer ones higher
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);
    autocompleteRef.current = autocomplete;
    setIsInitialized(true);

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry?.location) {
        console.log('No geometry for selected place');
        return;
      }

      // Extract city and country from address components
      let city = '';
      let country = '';
      if (place.address_components) {
        for (const component of place.address_components) {
          if (component.types.includes('locality')) {
            city = component.long_name;
          } else if (component.types.includes('administrative_area_level_1') && !city) {
            city = component.long_name;
          }
          if (component.types.includes('country')) {
            country = component.short_name;
          }
        }
      }

      onPlaceSelect({
        name: place.name || '',
        address: place.formatted_address || '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        city,
        country,
      });

      setInputValue('');
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, isInitialized, onPlaceSelect, restrictToCity, types]);

  // Update autocomplete bounds when city changes
  useEffect(() => {
    if (!autocompleteRef.current || !restrictToCity) return;

    autocompleteRef.current.setComponentRestrictions({ country: restrictToCity.country });
    
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(restrictToCity.lat - 0.5, restrictToCity.lng - 0.5),
      new google.maps.LatLng(restrictToCity.lat + 0.5, restrictToCity.lng + 0.5)
    );
    autocompleteRef.current.setBounds(bounds);
  }, [restrictToCity]);

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Loading..."
          disabled
          className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

// Simpler city search component for selecting cities
interface CityAutocompleteProps {
  placeholder?: string;
  onCitySelect: (city: {
    name: string;
    country: string;
    countryName: string;
    lat: number;
    lng: number;
  }) => void;
  className?: string;
  autoFocus?: boolean;
}

export function CityAutocomplete({
  placeholder = 'Search for a city...',
  onCitySelect,
  className = '',
  autoFocus = false,
}: CityAutocompleteProps) {
  const { settings } = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: settings.googleMapsApiKey,
    libraries: LIBRARIES,
  });

  // Initialize autocomplete for cities only
  useEffect(() => {
    if (!isLoaded || !inputRef.current || isInitialized) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      fields: ['name', 'formatted_address', 'geometry', 'address_components'],
    });
    autocompleteRef.current = autocomplete;
    setIsInitialized(true);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry?.location) {
        console.log('No geometry for selected city');
        return;
      }

      // Extract city name and country
      let cityName = place.name || '';
      let countryCode = '';
      let countryName = '';
      
      if (place.address_components) {
        for (const component of place.address_components) {
          if (component.types.includes('locality')) {
            cityName = component.long_name;
          } else if (component.types.includes('administrative_area_level_1') && !cityName) {
            cityName = component.long_name;
          }
          if (component.types.includes('country')) {
            countryCode = component.short_name;
            countryName = component.long_name;
          }
        }
      }

      onCitySelect({
        name: cityName,
        country: countryCode,
        countryName: countryName,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });

      setInputValue('');
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, isInitialized, onCitySelect]);

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Loading..."
          disabled
          className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

