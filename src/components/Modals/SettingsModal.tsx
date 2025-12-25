import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSettingsStore } from '../../store/useSettingsStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useTutorialStore } from '../../store/useTutorialStore';
import { MapPin, GraduationCap, RefreshCw, Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setCenterPoint, setThemeMode } = useSettingsStore();
  const { recalculateDistances, properties } = usePropertyStore();
  const { startTutorial, resetTutorial } = useTutorialStore();

  const [centerName, setCenterName] = useState(settings.centerPoint.name);
  const [centerLat, setCenterLat] = useState(settings.centerPoint.lat.toString());
  const [centerLng, setCenterLng] = useState(settings.centerPoint.lng.toString());
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCenterName(settings.centerPoint.name);
      setCenterLat(settings.centerPoint.lat.toString());
      setCenterLng(settings.centerPoint.lng.toString());
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    const newCenter = {
      name: centerName,
      lat: parseFloat(centerLat) || 51.5142,
      lng: parseFloat(centerLng) || -0.0885,
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

  const presetCenters = [
    { name: 'Bank of England', lat: 51.5142, lng: -0.0885 },
    { name: 'Liverpool Street', lat: 51.5178, lng: -0.0823 },
    { name: 'Canary Wharf', lat: 51.5054, lng: -0.0235 },
    { name: 'Kings Cross', lat: 51.5308, lng: -0.1238 },
    { name: 'Westminster', lat: 51.4995, lng: -0.1248 },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="md">
      <div className="space-y-6">
        {/* Center Point Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MapPin size={16} />
            Center Point (for distance calculations)
          </h3>

          <div className="flex flex-wrap gap-2">
            {presetCenters.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setCenterName(preset.name);
                  setCenterLat(preset.lat.toString());
                  setCenterLng(preset.lng.toString());
                }}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  centerName === preset.name
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

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
