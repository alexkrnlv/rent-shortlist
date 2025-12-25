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
        {/* Sidebar - Only show in map mode */}
        {viewMode === 'map' && (
          <aside className="w-full md:w-[380px] bg-white border-r border-gray-200 flex flex-col">
            {sidebar}
          </aside>
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 relative">
          {viewMode === 'map' ? map : table}
        </main>
      </div>
    </div>
  );
}
