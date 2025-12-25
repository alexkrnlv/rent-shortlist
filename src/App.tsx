import { useState, useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { Header, ViewMode } from './components/Layout/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MapView } from './components/Map/MapView';
import { TableView } from './components/Table/TableView';
import { AddPropertyModal } from './components/Modals/AddPropertyModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ExportImportModal } from './components/Modals/ExportImportModal';
import { Tutorial } from './components/Tutorial';
import { ToastProvider } from './components/ui/Toast';
import { usePropertyStore } from './store/usePropertyStore';
import { useTutorialStore } from './store/useTutorialStore';
import { useExtensionSync } from './hooks/useExtensionSync';
import { useUrlSession } from './hooks/useUrlSession';
import { hasSessionInUrl, getShareableUrl, copyToClipboard } from './utils/urlSession';

function App() {
  // Sync with Chrome extension (shows pending properties in sidebar)
  useExtensionSync();
  
  // Sync state with URL
  const { isLoading: isSessionLoading } = useUrlSession();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { properties } = usePropertyStore();
  const { hasCompleted, hasSkipped, startTutorial } = useTutorialStore();

  // Close mobile sidebar when view mode changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [viewMode]);

  // Show tutorial on first visit (not loaded from URL session and not seen before)
  useEffect(() => {
    // Wait for session loading to complete
    if (isSessionLoading) return;
    
    // Start tutorial if first visit (hasn't completed or skipped)
    if (!hasSessionInUrl() && !hasCompleted && !hasSkipped) {
      // Small delay to let the app render first
      const timer = setTimeout(() => {
        startTutorial();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSessionLoading, hasCompleted, hasSkipped, startTutorial]);

  // Handle share button click
  const handleShare = async () => {
    const url = getShareableUrl();
    const success = await copyToClipboard(url);
    if (success) {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  // Handle new session creation
  const handleNewSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} }), // Empty session
      });
      
      if (response.ok) {
        const { id } = await response.json();
        // Navigate to new session URL
        window.location.href = `/s/${id}`;
      }
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  return (
    <>
      <Layout
        viewMode={viewMode}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onMobileSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onMobileSidebarClose={() => setIsMobileSidebarOpen(false)}
        header={
          <Header
            onSettingsClick={() => setShowSettingsModal(true)}
            onExportClick={() => setShowExportModal(true)}
            onImportClick={() => setShowImportModal(true)}
            onShareClick={handleShare}
            onNewSessionClick={handleNewSession}
            propertyCount={properties.length}
            viewMode={viewMode}
            onMobileSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            isMobileSidebarOpen={isMobileSidebarOpen}
          />
        }
        sidebar={<Sidebar viewMode={viewMode} onViewModeChange={setViewMode} onAddClick={() => setShowAddModal(true)} />}
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

      {/* Interactive Onboarding Tutorial */}
      <Tutorial />

      {/* Copied toast notification */}
      {showCopiedToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Link copied to clipboard!
          </div>
        </div>
      )}
    </>
  );
}

function AppWithProviders() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

export default AppWithProviders;
