import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { extractUrlsFromText, generateId } from '../../utils/helpers';
import { processProperty } from '../../services/propertyProcessor';
import { Loader2, AlertCircle, CheckCircle, Link, Plus, XCircle, Copy } from 'lucide-react';
import type { Property } from '../../types';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProcessingStatus {
  url: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'duplicate';
  error?: string;
}

interface FailedUrl {
  url: string;
  error: string;
}

export function AddPropertyModal({ isOpen, onClose }: AddPropertyModalProps) {
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatuses, setProcessingStatuses] = useState<ProcessingStatus[]>([]);
  const [failedUrls, setFailedUrls] = useState<FailedUrl[]>([]);
  const [validationComplete, setValidationComplete] = useState(false);

  // Manual entry fields
  const [manualName, setManualName] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualIsBTR, setManualIsBTR] = useState(false);
  const [isGeocodingManual, setIsGeocodingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  const { addProperty, hasPropertyWithUrl } = usePropertyStore();
  const { settings } = useSettingsStore();

  const handleUrlSubmit = async () => {
    const urls = extractUrlsFromText(input);
    if (urls.length === 0) return;

    setIsProcessing(true);
    
    // Check for duplicates first
    const initialStatuses = urls.map(url => ({
      url,
      status: hasPropertyWithUrl(url) ? 'duplicate' as const : 'pending' as const,
    }));
    setProcessingStatuses(initialStatuses);
    setFailedUrls([]);

    const newFailedUrls: FailedUrl[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      // Skip if already marked as duplicate
      if (initialStatuses[i].status === 'duplicate') {
        continue;
      }
      
      setProcessingStatuses(prev =>
        prev.map((s, idx) => idx === i ? { ...s, status: 'processing' } : s)
      );

      try {
        const propertyData = await processProperty(url, settings.claudeApiKey, settings.centerPoint, settings.project?.city);

        // Only add if we got coordinates
        if (propertyData.coordinates) {
          const property: Property = {
            id: generateId(),
            url,
            name: propertyData.name || 'Property',
            address: propertyData.address || '',
            price: propertyData.price,
            thumbnail: propertyData.thumbnail,
            images: propertyData.images,
            coordinates: propertyData.coordinates,
            distances: propertyData.distances,
            comment: '',
            rating: null,
            isBTR: propertyData.isBTR || false,
            tags: [],
            createdAt: new Date().toISOString(),
          };

          addProperty(property);
          setProcessingStatuses(prev =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s)
          );
        } else {
          // Could not resolve location - add to failed list
          newFailedUrls.push({ url, error: 'Could not determine location' });
          setProcessingStatuses(prev =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'error', error: 'Could not determine location' } : s)
          );
        }
      } catch (error) {
        const errorMsg = (error as Error).message;
        newFailedUrls.push({ url, error: errorMsg });
        setProcessingStatuses(prev =>
          prev.map((s, idx) => idx === i ? { ...s, status: 'error', error: errorMsg } : s)
        );
      }
    }

    setFailedUrls(newFailedUrls);
    setIsProcessing(false);
    setValidationComplete(true);
  };

  const handleManualSubmit = async () => {
    if (!manualName || !manualAddress) return;

    // Check for duplicate URL if provided
    if (manualUrl && hasPropertyWithUrl(manualUrl)) {
      setManualError('This URL is already in your shortlist.');
      return;
    }

    setIsGeocodingManual(true);

    try {
      // Geocode the address with city context
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: manualAddress, city: settings.project?.city }),
      });

      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      const coordinates = await response.json();

      // Calculate distances
      let distances = null;
      if (coordinates && settings.centerPoint) {
        const distResponse = await fetch('/api/distances', {
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

      const property: Property = {
        id: generateId(),
        url: manualUrl || '',
        name: manualName,
        address: manualAddress,
        price: manualPrice || undefined,
        coordinates,
        distances,
        comment: '',
        rating: null,
        isBTR: manualIsBTR,
        tags: [],
        createdAt: new Date().toISOString(),
      };

      addProperty(property);

      // Reset and close
      setManualName('');
      setManualUrl('');
      setManualAddress('');
      setManualPrice('');
      setManualIsBTR(false);
      setIsGeocodingManual(false);
      onClose();
    } catch (error) {
      setManualError('Could not find location. Please check the address and try again.');
      setIsGeocodingManual(false);
    }
  };

  const handleAddManuallyFromFailed = (failedUrl: FailedUrl) => {
    setMode('manual');
    setManualUrl(failedUrl.url);
    setFailedUrls(prev => prev.filter(f => f.url !== failedUrl.url));
  };

  const handleClose = () => {
    if (!isProcessing && !isGeocodingManual) {
      setInput('');
      setMode('url');
      setProcessingStatuses([]);
      setFailedUrls([]);
      setValidationComplete(false);
      setManualName('');
      setManualUrl('');
      setManualAddress('');
      setManualPrice('');
      setManualIsBTR(false);
      setManualError('');
      onClose();
    }
  };

  const urls = extractUrlsFromText(input);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Property" size="lg">
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => setMode('url')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'url' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Link size={14} className="inline mr-2" />
            From URL
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'manual' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Plus size={14} className="inline mr-2" />
            Manual Entry
          </button>
        </div>

        {mode === 'url' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Paste property URLs (one per line or mixed with text)
              </label>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (validationComplete) {
                    setValidationComplete(false);
                    setProcessingStatuses([]);
                    setFailedUrls([]);
                  }
                }}
                placeholder={"https://www.rightmove.co.uk/properties/123456789\nhttps://www.zoopla.co.uk/to-rent/details/12345678\n\nOr paste any text containing URLs..."}
                className="w-full h-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                disabled={isProcessing}
              />
              {urls.length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <Link size={14} className="inline mr-1" />
                  {urls.length} URL{urls.length !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>

            {processingStatuses.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {processingStatuses.map((status, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {status.status === 'pending' && <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600" />}
                    {status.status === 'processing' && <Loader2 size={16} className="animate-spin text-primary-600 dark:text-primary-400" />}
                    {status.status === 'success' && <CheckCircle size={16} className="text-green-600" />}
                    {status.status === 'error' && <XCircle size={16} className="text-red-600" />}
                    {status.status === 'duplicate' && <Copy size={16} className="text-amber-500" />}
                    <span className={`truncate flex-1 ${status.status === 'duplicate' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {status.url.length > 50 ? status.url.substring(0, 50) + '...' : status.url}
                      {status.status === 'duplicate' && <span className="ml-1 text-xs">(already added)</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Failed URLs with option to add manually */}
            {failedUrls.length > 0 && !isProcessing && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                  <AlertCircle size={14} className="inline mr-1" />
                  {failedUrls.length} URL{failedUrls.length !== 1 ? 's' : ''} could not be resolved
                </p>
                <div className="space-y-2">
                  {failedUrls.map((failed, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-amber-700 dark:text-amber-400">
                        {failed.url.length > 40 ? failed.url.substring(0, 40) + '...' : failed.url}
                      </span>
                      <button
                        onClick={() => handleAddManuallyFromFailed(failed)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium whitespace-nowrap"
                      >
                        Add manually
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!settings.claudeApiKey && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <AlertCircle size={14} className="inline mr-1" />
                  Claude API key not set. Add your API key in Settings for better parsing.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              {validationComplete ? (
                <Button variant="primary" onClick={handleClose}>
                  Close
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleClose} disabled={isProcessing}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUrlSubmit}
                    disabled={urls.length === 0 || isProcessing}
                    loading={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : `Add ${urls.length} URL${urls.length !== 1 ? 's' : ''}`}
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g., 2 Bed Flat in Shoreditch"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => { setManualAddress(e.target.value); setManualError(''); }}
                  placeholder="e.g., 123 High Street, City, Postcode"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the full address including postcode for accurate location
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price (optional)
                </label>
                <input
                  type="text"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="e.g., £2,500 pcm"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Listing URL (optional)
                </label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="manual-btr"
                  checked={manualIsBTR}
                  onChange={(e) => setManualIsBTR(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 dark:bg-gray-700"
                />
                <label htmlFor="manual-btr" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer">
                  <span className="bg-purple-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">BTR</span>
                  Build to Rent property
                </label>
              </div>
            </div>

            {manualError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">
                  <AlertCircle size={14} className="inline mr-1" />
                  {manualError}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Button variant="secondary" onClick={handleClose} disabled={isGeocodingManual}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleManualSubmit}
                disabled={!manualName || !manualAddress || isGeocodingManual}
                loading={isGeocodingManual}
              >
                {isGeocodingManual ? 'Finding location...' : 'Add Property'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
