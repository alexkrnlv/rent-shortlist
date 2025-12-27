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

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          /* Full-screen Map - property preview is handled in MapView */
          <div className="absolute inset-0">
            {map}
          </div>
        ) : (
          /* Table View - Full screen with bottom nav padding */
          <div 
            className="h-full overflow-y-auto"
            style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
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
