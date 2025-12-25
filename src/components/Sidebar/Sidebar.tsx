import { SearchBar } from './SearchBar';
import { Filters } from './Filters';
import { PropertyList } from './PropertyList';
import { Map, Table2 } from 'lucide-react';

export type ViewMode = 'map' | 'table';

interface SidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddClick: () => void;
}

export function Sidebar({ viewMode, onViewModeChange, onAddClick }: SidebarProps) {
  return (
    <>
      {/* View Mode Toggle */}
      <div className="p-3 md:p-4 border-b border-gray-200">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('map')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${viewMode === 'map'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
            title="Map View"
          >
            <Map size={16} />
            Map
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${viewMode === 'table'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
            title="Table View"
          >
            <Table2 size={16} />
            Table
          </button>
        </div>
      </div>
      
      <SearchBar />
      <Filters />
      <PropertyList onAddClick={onAddClick} />
    </>
  );
}
