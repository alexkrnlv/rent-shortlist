import { Settings, Download, Upload, Share2, Menu, X, FolderPlus } from 'lucide-react';
import { Button } from '../ui/Button';

export type ViewMode = 'map' | 'table';

interface HeaderProps {
  onSettingsClick: () => void;
  onExportClick: () => void;
  onImportClick: () => void;
  onShareClick: () => void;
  onNewSessionClick: () => void;
  propertyCount: number;
  viewMode: ViewMode;
  onMobileSidebarToggle: () => void;
  isMobileSidebarOpen: boolean;
}

export function Header({
  onSettingsClick,
  onExportClick,
  onImportClick,
  onShareClick,
  onNewSessionClick,
  propertyCount,
  viewMode,
  onMobileSidebarToggle,
  isMobileSidebarOpen,
}: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        {/* Mobile sidebar toggle button - only show in map mode on mobile */}
        {viewMode === 'map' && (
          <button
            onClick={onMobileSidebarToggle}
            className="md:hidden p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-label={isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
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

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onImportClick} className="hidden lg:inline-flex">
            <Upload size={18} className="mr-1.5" />
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={onExportClick} className="hidden lg:inline-flex">
            <Download size={18} className="mr-1.5" />
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewSessionClick} className="hidden lg:inline-flex">
            <FolderPlus size={18} className="mr-1.5" />
            New Session
          </Button>
          <Button variant="ghost" size="sm" onClick={onShareClick} className="hidden lg:inline-flex">
            <Share2 size={18} className="mr-1.5" />
            Share
          </Button>
          {/* Mobile Import/Export/Share */}
          <Button variant="ghost" size="sm" onClick={onImportClick} className="lg:hidden p-2">
            <Upload size={18} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onExportClick} className="lg:hidden p-2">
            <Download size={18} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewSessionClick} className="lg:hidden p-2" title="New Session">
            <FolderPlus size={18} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onShareClick} className="lg:hidden p-2" title="Share">
            <Share2 size={18} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onSettingsClick}>
            <Settings size={18} className="lg:mr-1.5" />
            <span className="hidden lg:inline">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
