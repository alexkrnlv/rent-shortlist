import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { usePropertyStore } from '../../store/usePropertyStore';
import { exportToCSV, downloadCSV, parseCSV } from '../../utils/csv';
import { generateId } from '../../utils/helpers';
import { Download, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import type { Property } from '../../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'export' | 'import';
}

export function ExportImportModal({ isOpen, onClose, mode }: ExportImportModalProps) {
  const { properties, addProperties, clearAllProperties } = usePropertyStore();
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const csv = exportToCSV(properties);
    const filename = 'rent-shortlist-' + new Date().toISOString().split('T')[0] + '.csv';
    downloadCSV(csv, filename);
    onClose();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseCSV(content);
        
        if (parsed.length === 0) {
          setImportStatus('error');
          setImportMessage('No valid properties found in CSV');
          return;
        }

        const newProperties: Property[] = parsed.map((p) => ({
          id: p.id || generateId(),
          url: p.url || '',
          name: p.name || 'Imported Property',
          address: p.address || '',
          price: p.price,
          thumbnail: p.thumbnail,
          coordinates: p.coordinates || null,
          distances: null,
          comment: p.comment || '',
          rating: p.rating ?? null,
          isBTR: p.isBTR ?? false,
          tags: p.tags || [],
          createdAt: p.createdAt || new Date().toISOString(),
        }));

        if (replaceExisting) {
          clearAllProperties();
        }
        addProperties(newProperties);

        setImportStatus('success');
        setImportMessage('Imported ' + newProperties.length + ' properties');
        
        setTimeout(() => {
          onClose();
          setImportStatus('idle');
          setImportMessage('');
        }, 1500);
      } catch (err) {
        setImportStatus('error');
        setImportMessage('Failed to parse CSV: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setImportStatus('idle');
    setImportMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={mode === 'export' ? 'Export Data' : 'Import Data'} size="sm">
      {mode === 'export' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <FileText size={24} className="text-gray-400 dark:text-gray-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{properties.length} properties</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Will be exported to CSV</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Export all your properties to a CSV file that can be used as a backup or imported later.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExport} disabled={properties.length === 0}>
              <Download size={16} className="mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Upload size={32} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select a CSV file exported from Rent Shortlist
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-primary-500 px-4 py-2 text-sm cursor-pointer">
              Choose File
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700"
            />
            Replace existing properties
          </label>

          {importStatus !== 'idle' && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              importStatus === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            }`}>
              {importStatus === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-sm">{importMessage}</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
