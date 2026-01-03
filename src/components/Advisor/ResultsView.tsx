import { 
  Trophy, 
  Medal, 
  Award,
  MapPin,
  ExternalLink,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { useAHPStore } from '../../store/useAHPStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import type { CriterionId } from '../../types/ahp';
import { CRITERIA } from '../../types/ahp';
import { getPropertyExplanation } from '../../utils/ahp';

interface ResultsViewProps {
  onReset: () => void;
  onShowOnMap: (propertyId: string) => void;
}

export function ResultsView({ onReset, onShowOnMap }: ResultsViewProps) {
  const { session } = useAHPStore();
  const { getPropertyById } = usePropertyStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  if (!session?.result) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No results available. Please complete the comparison first.
        </p>
      </div>
    );
  }
  
  const { result } = session;
  const { rankings, weights, isConsistent, consistencyRatio } = result;
  
  // Get rank icon
  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={24} className="text-yellow-500" />;
    if (index === 1) return <Medal size={24} className="text-gray-400" />;
    if (index === 2) return <Award size={24} className="text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">#{index + 1}</span>;
  };
  
  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  // Get criterion name
  const getCriterionName = (id: CriterionId) => {
    return CRITERIA.find(c => c.id === id)?.name || id;
  };
  
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-4">
          <Trophy size={16} />
          Results Ready
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your Personalized Rankings
        </h2>
        
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Based on your priorities, here are your top matches
        </p>
      </div>
      
      {/* Consistency warning */}
      {!isConsistent && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
          <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Your preferences showed some inconsistency 
            (ratio: {(consistencyRatio * 100).toFixed(0)}%). 
            Consider reviewing your answers for more accurate results.
          </div>
        </div>
      )}
      
      {/* Your priorities summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          Your Priority Weights
        </h3>
        <div className="flex flex-wrap gap-2">
          {weights
            .sort((a, b) => b.weight - a.weight)
            .map((w, i) => (
              <div 
                key={w.criterionId}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  i === 0 
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {getCriterionName(w.criterionId)}: {(w.weight * 100).toFixed(0)}%
              </div>
            ))}
        </div>
      </div>
      
      {/* Rankings list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {rankings.map((ranking, index) => {
          const property = getPropertyById(ranking.propertyId);
          if (!property) return null;
          
          const isExpanded = expandedId === ranking.propertyId;
          const explanation = property.criteriaScores 
            ? getPropertyExplanation(ranking, weights, property.criteriaScores)
            : { whyHighRank: [], improvements: [] };
          
          return (
            <div 
              key={ranking.propertyId}
              className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
                index === 0 
                  ? 'border-yellow-200 dark:border-yellow-800 shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20'
                  : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              {/* Main row */}
              <div 
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : ranking.propertyId)}
              >
                {/* Rank icon */}
                <div className="flex-shrink-0">
                  {getRankIcon(index)}
                </div>
                
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                  {property.thumbnail ? (
                    <img 
                      src={property.thumbnail} 
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin size={20} className="text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {property.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {property.address}
                  </p>
                  {property.price && (
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {property.price}
                    </p>
                  )}
                </div>
                
                {/* Score */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={`text-2xl font-bold ${getScoreColor(ranking.finalScore)}`}>
                    {Math.round(ranking.finalScore)}
                  </div>
                  <div className="text-gray-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>
              
              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* Strengths */}
                    <div>
                      <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
                        <TrendingUp size={14} />
                        Strengths
                      </div>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {explanation.whyHighRank.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-emerald-500">•</span>
                            {item}
                          </li>
                        ))}
                        {explanation.whyHighRank.length === 0 && (
                          <li className="text-gray-400 italic">No standout strengths</li>
                        )}
                      </ul>
                    </div>
                    
                    {/* Areas to consider */}
                    <div>
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                        <TrendingDown size={14} />
                        Consider
                      </div>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {explanation.improvements.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-amber-500">•</span>
                            {item}
                          </li>
                        ))}
                        {explanation.improvements.length === 0 && (
                          <li className="text-gray-400 italic">No major concerns</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    {property.url && (
                      <a
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                      >
                        <ExternalLink size={14} />
                        View Listing
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowOnMap(ranking.propertyId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <MapPin size={14} />
                      Show on Map
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {rankings.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No properties with criteria scores available.
            Add some properties first!
          </div>
        )}
      </div>
      
      {/* Reset button */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button variant="ghost" onClick={onReset} className="w-full">
          <RotateCcw size={16} className="mr-2" />
          Reconfigure Priorities
        </Button>
      </div>
    </div>
  );
}

