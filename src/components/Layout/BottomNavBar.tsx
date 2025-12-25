import { Map, Table2, Settings, Share2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { ViewMode } from './Header';

interface BottomNavBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSettingsClick: () => void;
  onShareClick: () => void;
  onMoreClick?: () => void;
}

export function BottomNavBar({
  viewMode,
  onViewModeChange,
  onSettingsClick,
  onShareClick,
  onMoreClick,
}: BottomNavBarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      {/* More menu overlay */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Navigation Bar */}
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

          {/* Table View */}
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
            aria-label="Table view"
          >
            <Table2 size={24} strokeWidth={viewMode === 'table' ? 2.5 : 2} />
            <span className="text-[10px] font-medium mt-0.5">List</span>
          </button>

          {/* Share */}
          <button
            onClick={onShareClick}
            className="flex flex-col items-center justify-center w-16 h-full text-gray-500 dark:text-gray-400 active:text-primary-600 dark:active:text-primary-400 transition-colors"
            aria-label="Share"
          >
            <Share2 size={24} />
            <span className="text-[10px] font-medium mt-0.5">Share</span>
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

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowMoreMenu(!showMoreMenu);
                onMoreClick?.();
              }}
              className="flex flex-col items-center justify-center w-16 h-full text-gray-500 dark:text-gray-400 active:text-primary-600 dark:active:text-primary-400 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal size={24} />
              <span className="text-[10px] font-medium mt-0.5">More</span>
            </button>

            {/* Dropdown menu */}
            {showMoreMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slideUp">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      // These will be passed via onMoreClick callback
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    Import/Export options available in Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

