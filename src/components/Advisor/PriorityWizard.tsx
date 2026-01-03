import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { ComparisonSlider } from './ComparisonSlider';
import { useAHPStore } from '../../store/useAHPStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import type { ComparisonValue } from '../../types/ahp';

interface PriorityWizardProps {
  onComplete: () => void;
}

export function PriorityWizard({ onComplete }: PriorityWizardProps) {
  const {
    session,
    nextStep,
    previousStep,
    setComparison,
    getComparison,
    getComparisonPairs,
    calculateResults,
    isAllComparisonsComplete,
  } = useAHPStore();
  
  const { properties } = usePropertyStore();
  
  if (!session) return null;
  
  const comparisonPairs = getComparisonPairs();
  const currentStep = session.currentStep;
  const totalComparisons = comparisonPairs.length; // 21
  
  // Step 0 = intro, steps 1-21 = comparisons, step 22 = calculating
  const isIntro = currentStep === 0;
  const comparisonIndex = currentStep - 1; // 0-20 for actual comparisons
  const isLastComparison = comparisonIndex === totalComparisons - 1;
  const currentPair = comparisonPairs[comparisonIndex];
  
  const handleNext = () => {
    if (isLastComparison && isAllComparisonsComplete()) {
      // Calculate and show results
      calculateResults(properties);
      onComplete();
    } else {
      nextStep();
    }
  };
  
  const handleComparisonChange = (value: ComparisonValue) => {
    if (currentPair) {
      setComparison(currentPair[0], currentPair[1], value);
    }
  };
  
  const currentValue = currentPair 
    ? getComparison(currentPair[0], currentPair[1])
    : null;
  
  // Intro screen
  if (isIntro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
        <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-6">
          <Sparkles size={40} className="text-primary-600 dark:text-primary-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Find Your Perfect Match
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          Answer a few quick questions about your priorities, and we'll rank 
          all your properties based on what matters most to you.
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-8 max-w-sm">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
              21
            </div>
            <span>Quick comparisons</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
              ~3
            </div>
            <span>Minutes to complete</span>
          </div>
        </div>
        
        <Button onClick={nextStep} size="lg">
          Let's Start
          <ChevronRight size={20} className="ml-1" />
        </Button>
      </div>
    );
  }
  
  // Comparison screen
  return (
    <div className="flex flex-col min-h-[450px]">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span>Question {comparisonIndex + 1} of {totalComparisons}</span>
          <span>{Math.round(((comparisonIndex + 1) / totalComparisons) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((comparisonIndex + 1) / totalComparisons) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Question */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          What matters more to you?
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Drag the slider towards the more important criterion
        </p>
      </div>
      
      {/* Comparison slider */}
      {currentPair && (
        <div className="flex-1 flex items-center">
          <ComparisonSlider
            criterionA={currentPair[0]}
            criterionB={currentPair[1]}
            value={currentValue}
            onChange={handleComparisonChange}
          />
        </div>
      )}
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={previousStep}
          disabled={currentStep <= 1}
        >
          <ChevronLeft size={20} className="mr-1" />
          Back
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={currentValue === null}
        >
          {isLastComparison ? 'See Results' : 'Next'}
          <ChevronRight size={20} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

