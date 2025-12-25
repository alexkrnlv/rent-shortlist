import { ReactNode } from 'react';
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
}

export function Layout({ 
  header, 
  sidebar, 
  map, 
  table, 
  viewMode,
  isMobileSidebarOpen,
  onMobileSidebarClose,
}: LayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {header}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop overlay for mobile sidebar */}
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
            <aside className="hidden md:flex md:w-[380px] bg-white border-r border-gray-200 flex-col">
              {sidebar}
            </aside>
            
            {/* Mobile sidebar - overlay drawer */}
            <aside
              className={`
                fixed inset-y-0 left-0 w-[85vw] max-w-[380px] bg-white border-r border-gray-200 
                flex flex-col z-50 md:hidden
                transform transition-transform duration-300 ease-in-out
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              `}
              style={{ top: '64px' }} // Below header (h-16 = 64px)
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
