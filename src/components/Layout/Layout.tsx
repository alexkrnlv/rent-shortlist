import { ReactNode } from 'react';
import type { ViewMode } from './Header';

interface LayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  map: ReactNode;
  table: ReactNode;
  viewMode: ViewMode;
}

export function Layout({ header, sidebar, map, table, viewMode }: LayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {header}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Hidden on mobile when in table view for full-width table */}
        <aside
          className={`
            w-full md:w-[380px] bg-white border-r border-gray-200 flex flex-col
            ${viewMode === 'table' ? 'hidden md:flex' : 'flex'}
          `}
        >
          {sidebar}
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 relative hidden md:block">
          {/* Map View */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              viewMode === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {map}
          </div>
          
          {/* Table View */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              viewMode === 'table' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {table}
          </div>
        </main>

        {/* Mobile Main Content (shows map or table based on view mode) */}
        <main className={`flex-1 relative md:hidden ${viewMode === 'map' ? 'hidden' : 'block'}`}>
          {table}
        </main>
      </div>
    </div>
  );
}
