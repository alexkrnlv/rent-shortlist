import { Settings, Download, Plus, Upload } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
  onExportClick: () => void;
  onImportClick: () => void;
  propertyCount: number;
}

export function Header({ onAddClick, onSettingsClick, onExportClick, onImportClick, propertyCount }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Rent Shortlist</h1>
          <p className="text-xs text-gray-500">{propertyCount} properties</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onImportClick}>
          <Upload size={18} className="mr-1.5" />
          Import
        </Button>
        <Button variant="ghost" size="sm" onClick={onExportClick}>
          <Download size={18} className="mr-1.5" />
          Export
        </Button>
        <Button variant="ghost" size="sm" onClick={onSettingsClick}>
          <Settings size={18} className="mr-1.5" />
          Settings
        </Button>
        <Button variant="primary" size="sm" onClick={onAddClick}>
          <Plus size={18} className="mr-1.5" />
          Add Properties
        </Button>
      </div>
    </header>
  );
}
