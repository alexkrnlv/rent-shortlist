import { SearchBar } from './SearchBar';
import { Filters } from './Filters';
import { PropertyList } from './PropertyList';
import { Plus } from 'lucide-react';

interface SidebarProps {
  onAddClick: () => void;
}

export function Sidebar({ onAddClick }: SidebarProps) {
  return (
    <>
      {/* Add Property Button */}
      <div className="px-3 md:px-4 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onAddClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Property
        </button>
      </div>
      
      <SearchBar />
      <Filters />
      <PropertyList />
    </>
  );
}
