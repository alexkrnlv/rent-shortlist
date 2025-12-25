import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TutorialStep = 
  | 'welcome'
  | 'add-properties'
  | 'organize'
  | 'map-view'
  | 'share'
  | 'complete';

export interface TutorialState {
  // Current state
  isActive: boolean;
  currentStep: TutorialStep;
  hasCompleted: boolean;
  hasSkipped: boolean;
  lastSeenStep: TutorialStep;
  
  // Analytics
  startedAt: string | null;
  completedAt: string | null;
  stepTimestamps: Record<TutorialStep, string | null>;
  
  // Actions
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: TutorialStep) => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resumeTutorial: () => void;
  resetTutorial: () => void;
  closeTutorial: () => void;
}

const STEP_ORDER: TutorialStep[] = [
  'welcome',
  'add-properties',
  'organize',
  'map-view',
  'share',
  'complete',
];

const getNextStep = (current: TutorialStep): TutorialStep | null => {
  const currentIndex = STEP_ORDER.indexOf(current);
  if (currentIndex === -1 || currentIndex === STEP_ORDER.length - 1) return null;
  return STEP_ORDER[currentIndex + 1];
};

const getPreviousStep = (current: TutorialStep): TutorialStep | null => {
  const currentIndex = STEP_ORDER.indexOf(current);
  if (currentIndex <= 0) return null;
  return STEP_ORDER[currentIndex - 1];
};

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 'welcome',
      hasCompleted: false,
      hasSkipped: false,
      lastSeenStep: 'welcome',
      startedAt: null,
      completedAt: null,
      stepTimestamps: {
        welcome: null,
        'add-properties': null,
        organize: null,
        'map-view': null,
        share: null,
        complete: null,
      },

      startTutorial: () => {
        const now = new Date().toISOString();
        set({
          isActive: true,
          currentStep: 'welcome',
          hasSkipped: false,
          startedAt: now,
          stepTimestamps: {
            ...get().stepTimestamps,
            welcome: now,
          },
        });
      },

      nextStep: () => {
        const { currentStep, stepTimestamps } = get();
        const next = getNextStep(currentStep);
        if (next) {
          const now = new Date().toISOString();
          set({
            currentStep: next,
            lastSeenStep: next,
            stepTimestamps: {
              ...stepTimestamps,
              [next]: now,
            },
          });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        const previous = getPreviousStep(currentStep);
        if (previous) {
          set({ currentStep: previous });
        }
      },

      goToStep: (step: TutorialStep) => {
        const { stepTimestamps } = get();
        const now = new Date().toISOString();
        set({
          currentStep: step,
          lastSeenStep: step,
          stepTimestamps: {
            ...stepTimestamps,
            [step]: stepTimestamps[step] || now,
          },
        });
      },

      skipTutorial: () => {
        set({
          isActive: false,
          hasSkipped: true,
        });
      },

      completeTutorial: () => {
        const now = new Date().toISOString();
        set({
          isActive: false,
          hasCompleted: true,
          completedAt: now,
        });
      },

      resumeTutorial: () => {
        const { lastSeenStep, hasCompleted } = get();
        set({
          isActive: true,
          // If completed, restart from beginning; otherwise resume
          currentStep: hasCompleted ? 'welcome' : lastSeenStep,
        });
      },

      resetTutorial: () => {
        set({
          isActive: false,
          currentStep: 'welcome',
          hasCompleted: false,
          hasSkipped: false,
          lastSeenStep: 'welcome',
          startedAt: null,
          completedAt: null,
          stepTimestamps: {
            welcome: null,
            'add-properties': null,
            organize: null,
            'map-view': null,
            share: null,
            complete: null,
          },
        });
      },

      closeTutorial: () => {
        set({ isActive: false });
      },
    }),
    {
      name: 'rent-shortlist-tutorial',
    }
  )
);

// Helper hooks
export const useIsTutorialActive = () => useTutorialStore((state) => state.isActive);
export const useCurrentTutorialStep = () => useTutorialStore((state) => state.currentStep);
export const useTutorialProgress = () => {
  const currentStep = useTutorialStore((state) => state.currentStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  // Exclude 'welcome' and 'complete' from progress calculation
  const totalSteps = STEP_ORDER.length - 2; // 4 main steps
  const progressIndex = Math.max(0, currentIndex - 1); // Skip 'welcome'
  return {
    current: Math.min(progressIndex + 1, totalSteps),
    total: totalSteps,
    percentage: Math.min(((progressIndex + 1) / totalSteps) * 100, 100),
  };
};
