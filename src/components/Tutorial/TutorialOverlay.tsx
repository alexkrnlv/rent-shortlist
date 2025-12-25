import { Fragment, ReactNode, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { useTutorialStore, useCurrentTutorialStep } from '../../store/useTutorialStore';
import { TutorialProgress } from './TutorialProgress';
import { Button } from '../ui/Button';

interface TutorialOverlayProps {
  children: ReactNode;
}

export function TutorialOverlay({ children }: TutorialOverlayProps) {
  const { 
    isActive, 
    nextStep, 
    previousStep, 
    skipTutorial, 
    completeTutorial,
    closeTutorial 
  } = useTutorialStore();
  const currentStep = useCurrentTutorialStep();

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive) return;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'Enter':
        e.preventDefault();
        if (currentStep === 'complete') {
          completeTutorial();
        } else {
          nextStep();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (currentStep !== 'welcome') {
          previousStep();
        }
        break;
      case 'Escape':
        e.preventDefault();
        skipTutorial();
        break;
    }
  }, [isActive, currentStep, nextStep, previousStep, skipTutorial, completeTutorial]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const showBackButton = currentStep !== 'welcome' && currentStep !== 'complete';
  const showNextButton = currentStep !== 'complete';
  const showSkipButton = currentStep !== 'complete';
  const showProgress = currentStep !== 'welcome' && currentStep !== 'complete';

  const getNextButtonText = (): string => {
    switch (currentStep) {
      case 'welcome':
        return "Let's go!";
      case 'share':
        return 'Finish';
      default:
        return 'Next';
    }
  };

  return (
    <Transition appear show={isActive} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={closeTutorial}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header with close button */}
                <div className="absolute top-4 right-4 z-10">
                  {showSkipButton && (
                    <button
                      onClick={skipTutorial}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors group"
                      aria-label="Skip tutorial"
                    >
                      <X size={20} />
                      <span className="sr-only">Skip tutorial</span>
                    </button>
                  )}
                </div>

                {/* Content area */}
                <div className="px-8 pt-8 pb-6">
                  {children}
                </div>

                {/* Footer with navigation */}
                <div className="px-8 pb-8 pt-2">
                  {/* Progress indicator */}
                  {showProgress && (
                    <div className="flex justify-center mb-6">
                      <TutorialProgress />
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Back button */}
                    <div className="flex-1">
                      {showBackButton ? (
                        <button
                          onClick={previousStep}
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
                        >
                          <ChevronLeft size={16} />
                          Back
                        </button>
                      ) : (
                        <div /> // Spacer
                      )}
                    </div>

                    {/* Skip link (center) */}
                    {showSkipButton && currentStep !== 'welcome' && (
                      <button
                        onClick={skipTutorial}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <SkipForward size={12} />
                        Skip tutorial
                      </button>
                    )}

                    {/* Next/Finish button */}
                    <div className="flex-1 flex justify-end">
                      {showNextButton && (
                        <Button
                          variant="primary"
                          size="md"
                          onClick={nextStep}
                          className="min-w-[120px] group"
                        >
                          {getNextButtonText()}
                          <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      )}
                      {currentStep === 'complete' && (
                        <Button
                          variant="primary"
                          size="md"
                          onClick={completeTutorial}
                          className="min-w-[140px]"
                        >
                          🎉 Start exploring!
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Keyboard hint */}
                  <p className="text-center text-[10px] text-gray-400 mt-4">
                    Use <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">←</kbd> <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">→</kbd> to navigate, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Esc</kbd> to skip
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
