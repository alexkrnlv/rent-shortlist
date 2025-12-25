import { SearchBar } from './SearchBar';
import { Filters } from './Filters';
import { PropertyList } from './PropertyList';

export function Sidebar() {
  return (
    <>
      <SearchBar />
      <Filters />
      <PropertyList />
    </>
  );
}
