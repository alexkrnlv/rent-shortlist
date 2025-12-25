import { ReactNode } from 'react';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import { MobileLayout } from './MobileLayout';
import type { ViewMode } from './Header';

interface LayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  map: ReactNode;
  table: ReactNode;
  viewMode: ViewMode;
  isMobileSidebarOpen: boolean;
  onMobileSidebarToggle: () => void;
  onMobileSidebarClose: () => void;
  // Mobile-specific props
  onViewModeChange?: (mode: ViewMode) => void;
  onSettingsClick?: () => void;
  onShareClick?: () => void;
  onAddPropertyClick?: () => void;
  propertyCount?: number;
}

export function Layout({ 
  header, 
  sidebar, 
  map, 
  table, 
  viewMode,
  isMobileSidebarOpen,
  onMobileSidebarClose,
  onViewModeChange,
  onSettingsClick,
  onShareClick,
  onAddPropertyClick,
  propertyCount = 0,
}: LayoutProps) {
  const isMobile = useMobileDetect();

  // Use mobile layout on small screens
  if (isMobile) {
    return (
      <MobileLayout
        header={header}
        sidebar={sidebar}
        map={map}
        table={table}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange || (() => {})}
        onSettingsClick={onSettingsClick || (() => {})}
        onShareClick={onShareClick || (() => {})}
        onAddPropertyClick={onAddPropertyClick || (() => {})}
        propertyCount={propertyCount}
      />
    );
  }

  // Desktop layout
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {header}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop overlay for mobile sidebar - kept for tablet transition */}
        {viewMode === 'map' && isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
            onClick={onMobileSidebarClose}
          />
        )}

        {/* Sidebar - Only show in map mode */}
        {viewMode === 'map' && (
          <>
            {/* Desktop sidebar - always visible */}
            <aside className="hidden md:flex md:w-[380px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col">
              {sidebar}
            </aside>
            
            {/* Tablet sidebar - overlay drawer (only for md transition) */}
            <aside
              className={`
                fixed inset-y-0 left-0 w-[85vw] max-w-[380px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
                flex flex-col z-50 md:hidden
                transform transition-transform duration-300 ease-in-out
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              `}
              style={{ top: '64px' }}
            >
              {sidebar}
            </aside>
          </>
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 relative w-full">
          {viewMode === 'map' ? map : table}
        </main>
      </div>
    </div>
  );
}
