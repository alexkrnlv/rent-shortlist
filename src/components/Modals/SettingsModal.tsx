import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSettingsStore } from '../../store/useSettingsStore';
import { MapPin } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setCenterPoint } = useSettingsStore();

  const [centerName, setCenterName] = useState(settings.centerPoint.name);
  const [centerLat, setCenterLat] = useState(settings.centerPoint.lat.toString());
  const [centerLng, setCenterLng] = useState(settings.centerPoint.lng.toString());

  useEffect(() => {
    if (isOpen) {
      setCenterName(settings.centerPoint.name);
      setCenterLat(settings.centerPoint.lat.toString());
      setCenterLng(settings.centerPoint.lng.toString());
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    setCenterPoint({
      name: centerName,
      lat: parseFloat(centerLat) || 51.5142,
      lng: parseFloat(centerLng) || -0.0885,
    });
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
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
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
                    ? 'bg-primary-100 border-primary-300 text-primary-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
}
