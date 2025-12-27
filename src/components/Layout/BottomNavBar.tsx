import { Map, Table2, Settings, Plus } from 'lucide-react';
import type { ViewMode } from './Header';

interface BottomNavBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSettingsClick: () => void;
  onAddClick: () => void;
}

export function BottomNavBar({
  viewMode,
  onViewModeChange,
  onSettingsClick,
  onAddClick,
}: BottomNavBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-[60px]">
        {/* Map View */}
        <button
          onClick={() => onViewModeChange('map')}
          className={`
            flex flex-col items-center justify-center w-16 h-full
            transition-colors
            ${viewMode === 'map'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400'
            }
          `}
          aria-label="Map view"
        >
          <Map size={24} strokeWidth={viewMode === 'map' ? 2.5 : 2} />
          <span className="text-[10px] font-medium mt-0.5">Map</span>
        </button>

        {/* List View */}
        <button
          onClick={() => onViewModeChange('table')}
          className={`
            flex flex-col items-center justify-center w-16 h-full
            transition-colors
            ${viewMode === 'table'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400'
            }
          `}
          aria-label="List view"
        >
          <Table2 size={24} strokeWidth={viewMode === 'table' ? 2.5 : 2} />
          <span className="text-[10px] font-medium mt-0.5">List</span>
        </button>

        {/* Add Property */}
        <button
          onClick={onAddClick}
          className="flex flex-col items-center justify-center w-16 h-full text-primary-600 dark:text-primary-400 active:text-primary-700 dark:active:text-primary-300 transition-colors"
          aria-label="Add property"
        >
          <Plus size={24} strokeWidth={2} />
          <span className="text-[10px] font-medium mt-0.5">Add</span>
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="flex flex-col items-center justify-center w-16 h-full text-gray-500 dark:text-gray-400 active:text-primary-600 dark:active:text-primary-400 transition-colors"
          aria-label="Settings"
        >
          <Settings size={24} />
          <span className="text-[10px] font-medium mt-0.5">Settings</span>
        </button>
      </div>
    </nav>
  );
}
