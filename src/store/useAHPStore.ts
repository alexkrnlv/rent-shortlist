import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PairwiseComparison,
  AHPSession,
  CriterionId,
  ComparisonValue,
} from '../types/ahp';
import { generateComparisonPairs } from '../types/ahp';
import { calculateAHP } from '../utils/ahp';
import type { Property } from '../types';

interface AHPState {
  // Current session
  session: AHPSession | null;
  
  // Is the advisor modal open
  isAdvisorOpen: boolean;
  
  // Actions
  openAdvisor: () => void;
  closeAdvisor: () => void;
  
  // Session management
  startNewSession: () => void;
  resetSession: () => void;
  
  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Comparisons
  setComparison: (criterionA: CriterionId, criterionB: CriterionId, value: ComparisonValue) => void;
  getComparison: (criterionA: CriterionId, criterionB: CriterionId) => ComparisonValue | null;
  
  // Calculate results
  calculateResults: (properties: Property[]) => void;
  
  // Get total steps (intro + comparisons + results)
  getTotalSteps: () => number;
  
  // Get comparison pairs for current session
  getComparisonPairs: () => Array<[CriterionId, CriterionId]>;
  
  // Check if all comparisons are complete
  isAllComparisonsComplete: () => boolean;
}

// Total steps: 1 (intro) + 21 (comparisons) + 1 (results) = 23
const TOTAL_STEPS = 23;

export const useAHPStore = create<AHPState>()(
  persist(
    (set, get) => ({
      session: null,
      isAdvisorOpen: false,
      
      openAdvisor: () => {
        set({ isAdvisorOpen: true });
        // Start new session if none exists
        if (!get().session) {
          get().startNewSession();
        }
      },
      
      closeAdvisor: () => set({ isAdvisorOpen: false }),
      
      startNewSession: () => {
        const session: AHPSession = {
          currentStep: 0,
          comparisons: [],
          result: null,
          startedAt: new Date().toISOString(),
          completedAt: null,
        };
        set({ session });
      },
      
      resetSession: () => {
        get().startNewSession();
      },
      
      goToStep: (step: number) => {
        const { session } = get();
        if (!session) return;
        
        set({
          session: {
            ...session,
            currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
          },
        });
      },
      
      nextStep: () => {
        const { session } = get();
        if (!session) return;
        
        const nextStep = Math.min(session.currentStep + 1, TOTAL_STEPS - 1);
        set({
          session: {
            ...session,
            currentStep: nextStep,
          },
        });
      },
      
      previousStep: () => {
        const { session } = get();
        if (!session) return;
        
        const prevStep = Math.max(session.currentStep - 1, 0);
        set({
          session: {
            ...session,
            currentStep: prevStep,
          },
        });
      },
      
      setComparison: (criterionA: CriterionId, criterionB: CriterionId, value: ComparisonValue) => {
        const { session } = get();
        if (!session) return;
        
        // Find existing comparison
        const existingIndex = session.comparisons.findIndex(
          c => (c.criterionA === criterionA && c.criterionB === criterionB) ||
               (c.criterionA === criterionB && c.criterionB === criterionA)
        );
        
        const newComparison: PairwiseComparison = {
          criterionA,
          criterionB,
          value,
        };
        
        let newComparisons: PairwiseComparison[];
        if (existingIndex >= 0) {
          // Update existing
          newComparisons = [...session.comparisons];
          newComparisons[existingIndex] = newComparison;
        } else {
          // Add new
          newComparisons = [...session.comparisons, newComparison];
        }
        
        set({
          session: {
            ...session,
            comparisons: newComparisons,
          },
        });
      },
      
      getComparison: (criterionA: CriterionId, criterionB: CriterionId): ComparisonValue | null => {
        const { session } = get();
        if (!session) return null;
        
        const comparison = session.comparisons.find(
          c => (c.criterionA === criterionA && c.criterionB === criterionB)
        );
        
        if (comparison) return comparison.value;
        
        // Check reverse
        const reverseComparison = session.comparisons.find(
          c => (c.criterionA === criterionB && c.criterionB === criterionA)
        );
        
        if (reverseComparison) {
          // Reverse the value
          return -reverseComparison.value as ComparisonValue;
        }
        
        return null;
      },
      
      calculateResults: (properties: Property[]) => {
        const { session } = get();
        if (!session) return;
        
        const result = calculateAHP(session.comparisons, properties);
        
        set({
          session: {
            ...session,
            result,
            completedAt: new Date().toISOString(),
          },
        });
      },
      
      getTotalSteps: () => TOTAL_STEPS,
      
      getComparisonPairs: () => generateComparisonPairs(),
      
      isAllComparisonsComplete: () => {
        const { session } = get();
        if (!session) return false;
        
        const requiredPairs = generateComparisonPairs();
        return session.comparisons.length >= requiredPairs.length;
      },
    }),
    {
      name: 'rent-shortlist-ahp',
      partialize: (state) => ({
        session: state.session,
      }),
    }
  )
);

