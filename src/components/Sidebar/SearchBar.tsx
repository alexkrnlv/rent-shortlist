import { Search, X } from 'lucide-react';
import { usePropertyStore } from '../../store/usePropertyStore';

export function SearchBar() {
  const { filters, setFilters } = usePropertyStore();

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search properties..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {filters.searchQuery && (
          <button
            onClick={() => setFilters({ searchQuery: '' })}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
