import { useState, useEffect } from 'react';
import type { CriterionId, ComparisonValue } from '../../types/ahp';
import { getCriterion, SAATY_LABELS } from '../../types/ahp';
import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  MapPin,
  Maximize2,
  Sparkles,
  CheckSquare,
  Sun,
  Wind,
} from 'lucide-react';

interface ComparisonSliderProps {
  criterionA: CriterionId;
  criterionB: CriterionId;
  value: ComparisonValue | null;
  onChange: (value: ComparisonValue) => void;
}

// Icon components map
const ICONS: Record<string, LucideIcon> = {
  Banknote,
  MapPin,
  Maximize2,
  Sparkles,
  CheckSquare,
  Sun,
  Wind,
};

export function ComparisonSlider({
  criterionA,
  criterionB,
  value,
  onChange,
}: ComparisonSliderProps) {
  const [sliderValue, setSliderValue] = useState<number>(value || 0);
  
  const critA = getCriterion(criterionA);
  const critB = getCriterion(criterionB);
  
  const IconA = ICONS[critA.icon];
  const IconB = ICONS[critB.icon];
  
  // Sync with external value
  useEffect(() => {
    if (value !== null) {
      setSliderValue(value);
    }
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10) as ComparisonValue;
    setSliderValue(newValue);
    onChange(newValue);
  };
  
  // Get label for current value
  const getLabel = () => {
    if (sliderValue === 0) return 'Equally important';
    const importance = Math.abs(sliderValue) + 1;
    const label = SAATY_LABELS[importance] || '';
    if (sliderValue < 0) {
      return `${critA.name}: ${label}`;
    }
    return `${critB.name}: ${label}`;
  };
  
  // Get background gradient based on value
  const getSliderBackground = () => {
    const position = ((sliderValue + 8) / 16) * 100;
    
    if (sliderValue < 0) {
      // Left side (A) is important
      return `linear-gradient(to right, 
        rgb(59, 130, 246) 0%, 
        rgb(59, 130, 246) ${position}%, 
        rgb(229, 231, 235) ${position}%, 
        rgb(229, 231, 235) 100%)`;
    } else if (sliderValue > 0) {
      // Right side (B) is important
      return `linear-gradient(to right, 
        rgb(229, 231, 235) 0%, 
        rgb(229, 231, 235) ${position}%, 
        rgb(16, 185, 129) ${position}%, 
        rgb(16, 185, 129) 100%)`;
    }
    // Equal
    return 'rgb(229, 231, 235)';
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Criteria labels */}
      <div className="flex items-center justify-between mb-6">
        {/* Left criterion */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          sliderValue < 0 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {IconA && <IconA size={24} />}
          <div>
            <div className="font-semibold">{critA.name}</div>
            <div className="text-xs opacity-75">{critA.description}</div>
          </div>
        </div>
        
        {/* VS badge */}
        <div className="px-3 py-1 text-sm font-medium text-gray-400 dark:text-gray-500">
          vs
        </div>
        
        {/* Right criterion */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          sliderValue > 0 
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {IconB && <IconB size={24} />}
          <div>
            <div className="font-semibold">{critB.name}</div>
            <div className="text-xs opacity-75">{critB.description}</div>
          </div>
        </div>
      </div>
      
      {/* Slider */}
      <div className="relative mb-4">
        <input
          type="range"
          min="-8"
          max="8"
          step="1"
          value={sliderValue}
          onChange={handleChange}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: getSliderBackground(),
          }}
        />
        
        {/* Center mark */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-5 bg-gray-400 dark:bg-gray-500 rounded pointer-events-none" />
        
        {/* Scale markers */}
        <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
          <span>Much more</span>
          <span>Equal</span>
          <span>Much more</span>
        </div>
      </div>
      
      {/* Current value label */}
      <div className={`text-center py-3 px-4 rounded-lg font-medium transition-colors ${
        sliderValue === 0 
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          : sliderValue < 0
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
      }`}>
        {getLabel()}
      </div>
    </div>
  );
}

