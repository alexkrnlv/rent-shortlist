import { Search, X } from 'lucide-react';
import { usePropertyStore } from '../../store/usePropertyStore';
import { useMobileDetect } from '../../hooks/useMobileDetect';

export function SearchBar() {
  const { filters, setFilters } = usePropertyStore();
  const isMobile = useMobileDetect();

  return (
    <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} border-b border-gray-200 dark:border-gray-700`}>
      <div className="relative">
        <Search 
          size={isMobile ? 20 : 18} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" 
        />
        <input
          type="text"
          placeholder="Search properties..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          className={`
            w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
            placeholder-gray-400 dark:placeholder-gray-500 
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            ${isMobile 
              ? 'pl-11 pr-12 py-3.5 text-base' 
              : 'pl-10 pr-10 py-2'
            }
          `}
          style={{ fontSize: isMobile ? '16px' : undefined }} // Prevent iOS zoom on focus
        />
        {filters.searchQuery && (
          <button
            onClick={() => setFilters({ searchQuery: '' })}
            aria-label="Clear search"
            className={`
              absolute right-1 top-1/2 -translate-y-1/2 
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              flex items-center justify-center rounded-lg
              ${isMobile 
                ? 'w-11 h-11 active:bg-gray-100 dark:active:bg-gray-600' 
                : 'w-8 h-8'
              }
            `}
          >
            <X size={isMobile ? 20 : 16} />
          </button>
        )}
      </div>
    </div>
  );
}
