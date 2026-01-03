import { X, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PriorityWizard } from './PriorityWizard';
import { ResultsView } from './ResultsView';
import { useAHPStore } from '../../store/useAHPStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import { calculateAllCriteriaScores } from '../../utils/criteriaScorer';

type ViewMode = 'preparing' | 'wizard' | 'results';

interface AdvisorModalProps {
  onShowOnMap?: (propertyId: string) => void;
}

export function AdvisorModal({ onShowOnMap }: AdvisorModalProps) {
  const { isAdvisorOpen, closeAdvisor, session, resetSession } = useAHPStore();
  const { properties, updateProperty } = usePropertyStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('wizard');
  const [isPreparingScores, setIsPreparingScores] = useState(false);
  const [preparingError, setPreparingError] = useState<string | null>(null);
  
  // Properties that need scoring
  const propertiesNeedingScores = properties.filter(p => !p.criteriaScores);
  
  // On open, check if we need to prepare scores
  useEffect(() => {
    if (isAdvisorOpen) {
      // If session has results, show them
      if (session?.result) {
        setViewMode('results');
      } 
      // If properties need scoring, show preparing
      else if (propertiesNeedingScores.length > 0 && properties.length > 0) {
        setViewMode('preparing');
        prepareScores();
      }
      // Otherwise show wizard
      else {
        setViewMode('wizard');
      }
    }
  }, [isAdvisorOpen]);
  
  // Prepare criteria scores for all properties
  const prepareScores = async () => {
    setIsPreparingScores(true);
    setPreparingError(null);
    
    try {
      // Calculate scores for properties that need them
      const propertiesWithScores = await calculateAllCriteriaScores(
        propertiesNeedingScores
      );
      
      // Update each property in the store
      for (const property of propertiesWithScores) {
        if (property.criteriaScores) {
          updateProperty(property.id, { criteriaScores: property.criteriaScores });
        }
      }
      
      setViewMode('wizard');
    } catch (error) {
      console.error('Error preparing scores:', error);
      setPreparingError((error as Error).message);
    } finally {
      setIsPreparingScores(false);
    }
  };
  
  const handleWizardComplete = () => {
    setViewMode('results');
  };
  
  const handleReset = () => {
    resetSession();
    setViewMode('wizard');
  };
  
  const handleShowOnMap = (propertyId: string) => {
    closeAdvisor();
    onShowOnMap?.(propertyId);
  };
  
  // Check if we have enough properties
  const hasEnoughProperties = properties.length >= 2;
  
  return (
    <Modal
      isOpen={isAdvisorOpen}
      onClose={closeAdvisor}
      size="lg"
      hideHeader
    >
      <div className="relative">
        {/* Close button */}
        <button
          onClick={closeAdvisor}
          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={20} />
        </button>
        
        {/* Not enough properties */}
        {!hasEnoughProperties && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Add More Properties
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
              You need at least 2 properties to use the Advisor. 
              Add some properties to your shortlist first!
            </p>
            <Button onClick={closeAdvisor}>
              Got it
            </Button>
          </div>
        )}
        
        {/* Preparing scores */}
        {hasEnoughProperties && viewMode === 'preparing' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {isPreparingScores ? (
              <>
                <Loader2 size={48} className="text-primary-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Analyzing Properties...
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Fetching air quality data and calculating scores for {propertiesNeedingScores.length} properties
                </p>
              </>
            ) : preparingError ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Preparation Failed
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {preparingError}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={closeAdvisor}>
                    Cancel
                  </Button>
                  <Button onClick={prepareScores}>
                    Retry
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}
        
        {/* Wizard view */}
        {hasEnoughProperties && viewMode === 'wizard' && (
          <div className="pt-4">
            <PriorityWizard onComplete={handleWizardComplete} />
          </div>
        )}
        
        {/* Results view */}
        {hasEnoughProperties && viewMode === 'results' && (
          <div className="pt-4">
            <ResultsView 
              onReset={handleReset}
              onShowOnMap={handleShowOnMap}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

