import { useEffect } from 'react';
import { useTutorialStore, useCurrentTutorialStep } from '../../store/useTutorialStore';
import { TutorialOverlay } from './TutorialOverlay';
import {
  WelcomeStep,
  AddPropertiesStep,
  OrganizeStep,
  MapViewStep,
  ShareStep,
  CompletionStep,
} from './TutorialSteps';

interface TutorialProps {
  autoStart?: boolean;
}

export function Tutorial({ autoStart = false }: TutorialProps) {
  const { isActive, hasCompleted, hasSkipped, startTutorial } = useTutorialStore();
  const currentStep = useCurrentTutorialStep();

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (autoStart && !hasCompleted && !hasSkipped && !isActive) {
      // Small delay to let the app load first
      const timer = setTimeout(() => {
        startTutorial();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompleted, hasSkipped, isActive, startTutorial]);

  // Don't render if tutorial is not active
  if (!isActive) return null;

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep />;
      case 'add-properties':
        return <AddPropertiesStep />;
      case 'organize':
        return <OrganizeStep />;
      case 'map-view':
        return <MapViewStep />;
      case 'share':
        return <ShareStep />;
      case 'complete':
        return <CompletionStep />;
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <TutorialOverlay>
      {renderStep()}
    </TutorialOverlay>
  );
}

// Helper component to trigger tutorial from settings menu
export function RestartTutorialButton() {
  const { startTutorial, resetTutorial } = useTutorialStore();

  const handleRestart = () => {
    resetTutorial();
    startTutorial();
  };

  return (
    <button
      onClick={handleRestart}
      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <span className="text-lg">🎓</span>
      <div>
        <div className="font-medium">Restart Tutorial</div>
        <div className="text-xs text-gray-500">Learn the basics again</div>
      </div>
    </button>
  );
}

// Hook to check if we should show the tutorial prompt
export function useShouldShowTutorial() {
  const { hasCompleted, hasSkipped } = useTutorialStore();
  return !hasCompleted && !hasSkipped;
}
