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
import { useSettingsStore } from './store/useSettingsStore';
import { useTutorialStore } from './store/useTutorialStore';
import { useExtensionSync } from './hooks/useExtensionSync';
import { useUrlSession } from './hooks/useUrlSession';
import { hasSessionInUrl, getShareableUrl, copyToClipboard } from './utils/urlSession';
import { buildSessionState } from './utils/urlSession';

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
  const { settings } = useSettingsStore();
  const { hasCompleted, hasSkipped, startTutorial } = useTutorialStore();

  // Apply dark mode class to html element
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (settings.themeMode === 'dark') {
      applyTheme(true);
    } else if (settings.themeMode === 'light') {
      applyTheme(false);
    } else {
      // Auto mode: use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.themeMode]);

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
      // Build a proper empty session with current settings
      const emptySessionData = buildSessionState(
        [], // empty properties
        [], // empty tags
        settings.centerPoint, // current center point
        {
          maxDistance: null,
          minPrice: null,
          maxPrice: null,
          minRating: null,
          btrOnly: false,
          selectedTags: [],
          searchQuery: '',
          sortBy: 'createdAt',
          sortDirection: 'desc',
        } // default filters
      );
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: emptySessionData
        }),
      });
      
      if (response.ok) {
        const { id } = await response.json();
        // Open in new tab
        window.open(`/s/${id}`, '_blank');
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
        // Mobile-specific props
        onViewModeChange={setViewMode}
        onSettingsClick={() => setShowSettingsModal(true)}
        onShareClick={handleShare}
        onAddPropertyClick={() => setShowAddModal(true)}
        propertyCount={properties.length}
        header={
          <Header
            onSettingsClick={() => setShowSettingsModal(true)}
            onExportClick={() => setShowExportModal(true)}
            onImportClick={() => setShowImportModal(true)}
            onShareClick={handleShare}
            onNewSessionClick={handleNewSession}
            propertyCount={properties.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onMobileSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            isMobileSidebarOpen={isMobileSidebarOpen}
          />
        }
        sidebar={<Sidebar onAddClick={() => setShowAddModal(true)} />}
        map={<MapView />}
        table={<TableView onShowOnMap={(propertyId) => {
          // Select the property and switch to map view
          usePropertyStore.getState().setSelectedProperty(propertyId);
          setViewMode('map');
        }} />}
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
          <div className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2">
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
