import { Settings, Download, Upload, Share2, FolderPlus, Map, Table2, Sun, Moon, Monitor } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import type { ThemeMode } from '../../types';
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
  onViewModeChange: (mode: ViewMode) => void;
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
  onViewModeChange,
}: HeaderProps) {
  const { settings, setThemeMode } = useSettingsStore();
  const isMobile = useMobileDetect();

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(settings.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (settings.themeMode) {
      case 'light':
        return <Sun size={18} />;
      case 'dark':
        return <Moon size={18} />;
      case 'auto':
        return <Monitor size={18} />;
    }
  };

  const getThemeLabel = () => {
    switch (settings.themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto';
    }
  };

  // Compact mobile header - navigation is in bottom bar
  if (isMobile) {
    return (
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 flex items-center shadow-sm safe-area-top">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">Rent Shortlist</h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{propertyCount} properties</p>
          </div>
        </div>

        {/* Right: Theme toggle only - other actions in bottom nav or settings */}
        <div className="flex items-center gap-1">
          <button
            onClick={cycleTheme}
            className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
            title={`Theme: ${getThemeLabel()}`}
            aria-label={`Theme: ${getThemeLabel()}`}
          >
            {getThemeIcon()}
          </button>
        </div>
      </header>
    );
  }

  // Desktop header - full functionality
  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center shadow-sm">
      {/* Left Section: Logo & Title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Rent Shortlist</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{propertyCount} properties</p>
        </div>
      </div>

      {/* Center Section: View Mode Toggle */}
      <div className="flex-1 flex justify-center px-4">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => onViewModeChange('map')}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${viewMode === 'map'
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
            title="Map View"
          >
            <Map size={16} />
            <span>Map</span>
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${viewMode === 'table'
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
            title="Table View"
          >
            <Table2 size={16} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
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
        {/* Tablet-only icons */}
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
        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
          title={`Theme: ${getThemeLabel()}`}
        >
          {getThemeIcon()}
          <span className="hidden lg:inline text-sm font-medium">{getThemeLabel()}</span>
        </button>
        <Button variant="ghost" size="sm" onClick={onSettingsClick}>
          <Settings size={18} className="lg:mr-1.5" />
          <span className="hidden lg:inline">Settings</span>
        </Button>
      </div>
    </header>
  );
}
