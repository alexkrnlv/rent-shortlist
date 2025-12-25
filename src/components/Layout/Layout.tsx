import { ReactNode } from 'react';

interface LayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  map: ReactNode;
}

export function Layout({ header, sidebar, map }: LayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {header}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[380px] bg-white border-r border-gray-200 flex flex-col">
          {sidebar}
        </aside>
        <main className="flex-1 relative">
          {map}
        </main>
      </div>
    </div>
  );
}
