import { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { Header, ViewMode } from './components/Layout/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MapView } from './components/Map/MapView';
import { TableView } from './components/Table/TableView';
import { AddPropertyModal } from './components/Modals/AddPropertyModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ExportImportModal } from './components/Modals/ExportImportModal';
import { usePropertyStore } from './store/usePropertyStore';
import { useExtensionSync } from './hooks/useExtensionSync';

function App() {
  // Sync with Chrome extension
  useExtensionSync();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const { properties } = usePropertyStore();

  return (
    <>
      <Layout
        viewMode={viewMode}
        header={
          <Header
            onAddClick={() => setShowAddModal(true)}
            onSettingsClick={() => setShowSettingsModal(true)}
            onExportClick={() => setShowExportModal(true)}
            onImportClick={() => setShowImportModal(true)}
            propertyCount={properties.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        }
        sidebar={<Sidebar />}
        map={<MapView />}
        table={<TableView />}
      />

      <AddPropertyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <ExportImportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        mode="export"
      />

      <ExportImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        mode="import"
      />
    </>
  );
}

export default App;
