import { ReactNode, useState, useCallback } from 'react';
import { BottomSheet, SnapPoint } from '../ui/BottomSheet';
import { BottomNavBar } from './BottomNavBar';
import { Plus } from 'lucide-react';
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
  sidebar,
  map,
  table,
  viewMode,
  onViewModeChange,
  onSettingsClick,
  onShareClick,
  onAddPropertyClick,
  propertyCount,
}: MobileLayoutProps) {
  const [sheetSnap, setSheetSnap] = useState<SnapPoint>('peek');

  const handleSnapChange = useCallback((snap: SnapPoint) => {
    setSheetSnap(snap);
  }, []);

  // Peek content - shows property count and hint
  const peekContent = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {propertyCount} {propertyCount === 1 ? 'Property' : 'Properties'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Swipe up to see list
        </p>
      </div>
      <button
        onClick={onAddPropertyClick}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium shadow-lg active:bg-primary-700 transition-colors"
      >
        <Plus size={18} />
        Add
      </button>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Compact Header */}
      {header}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <>
            {/* Full-screen Map */}
            <div className="absolute inset-0 map-container">
              {map}
            </div>

            {/* Floating Action Button - Add Property */}
            <button
              onClick={onAddPropertyClick}
              className={`
                absolute right-4 z-30 w-14 h-14 
                bg-primary-600 text-white rounded-full shadow-xl
                flex items-center justify-center
                active:bg-primary-700 active:scale-95
                transition-all duration-200
                ${sheetSnap === 'peek' ? 'bottom-[calc(15vh+70px)]' : sheetSnap === 'half' ? 'bottom-[calc(50vh+70px)]' : 'hidden'}
              `}
              aria-label="Add property"
              style={{
                display: sheetSnap === 'full' ? 'none' : 'flex',
              }}
            >
              <Plus size={28} />
            </button>

            {/* Bottom Sheet with Property List */}
            <BottomSheet
              isOpen={true}
              initialSnap="peek"
              onSnapChange={handleSnapChange}
              peekContent={peekContent}
            >
              {sidebar}
            </BottomSheet>
          </>
        ) : (
          /* Table View - Full screen */
          <div className="h-full pb-[60px]" style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
            {table}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onSettingsClick={onSettingsClick}
        onShareClick={onShareClick}
      />
    </div>
  );
}

