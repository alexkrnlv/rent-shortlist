import { ReactNode } from 'react';
import { BottomNavBar } from './BottomNavBar';
import type { ViewMode } from './Header';

interface MobileLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  map: ReactNode;
  table: ReactNode;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSettingsClick: () => void;
  onShareClick: () => void;
  onAddPropertyClick: () => void;
  propertyCount: number;
}

export function MobileLayout({
  header,
  map,
  table,
  viewMode,
  onViewModeChange,
  onSettingsClick,
  onAddPropertyClick,
}: MobileLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Compact Header */}
      {header}

      {/* Main Content Area - use absolute positioning for proper scrolling */}
      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          /* Full-screen Map - property preview is handled in MapView */
          <div className="absolute inset-0">
            {map}
          </div>
        ) : (
          /* Table View - absolute positioned with bottom nav padding */
          <div 
            className="absolute inset-0 overflow-y-auto"
            style={{ 
              paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {table}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onSettingsClick={onSettingsClick}
        onAddClick={onAddPropertyClick}
      />
    </div>
  );
}
