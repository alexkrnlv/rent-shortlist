// ============================================
// AHP (Analytic Hierarchy Process) Types
// Based on Thomas L. Saaty's method
// ============================================

// The 7 criteria used for property evaluation
export type CriterionId = 
  | 'price' 
  | 'location' 
  | 'size' 
  | 'condition' 
  | 'amenities' 
  | 'comfort' 
  | 'airQuality';

// Criterion definition with display info
export interface Criterion {
  id: CriterionId;
  name: string;
  nameRu: string; // Russian name for i18n
  description: string;
  icon: string; // lucide icon name
}

// All criteria definitions
export const CRITERIA: Criterion[] = [
  {
    id: 'price',
    name: 'Price',
    nameRu: 'Цена',
    description: 'Monthly rent cost',
    icon: 'Banknote',
  },
  {
    id: 'location',
    name: 'Location',
    nameRu: 'Расположение',
    description: 'Distance to center and neighborhood quality',
    icon: 'MapPin',
  },
  {
    id: 'size',
    name: 'Size',
    nameRu: 'Размер',
    description: 'Square meters, bedrooms, bathrooms',
    icon: 'Maximize2',
  },
  {
    id: 'condition',
    name: 'Condition',
    nameRu: 'Состояние',
    description: 'Renovation quality and modernity',
    icon: 'Sparkles',
  },
  {
    id: 'amenities',
    name: 'Amenities',
    nameRu: 'Удобства',
    description: 'Parking, balcony, appliances, etc.',
    icon: 'CheckSquare',
  },
  {
    id: 'comfort',
    name: 'Comfort',
    nameRu: 'Комфорт',
    description: 'Natural light, noise level, view',
    icon: 'Sun',
  },
  {
    id: 'airQuality',
    name: 'Air Quality',
    nameRu: 'Воздух',
    description: 'Environmental air quality index',
    icon: 'Wind',
  },
];

// Get criterion by ID
export function getCriterion(id: CriterionId): Criterion {
  const criterion = CRITERIA.find(c => c.id === id);
  if (!criterion) throw new Error(`Unknown criterion: ${id}`);
  return criterion;
}

// ============================================
// Saaty Scale for Pairwise Comparisons
// ============================================

// Saaty's 1-9 scale values
export type SaatyValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// For UI, we use -8 to +8 where negative means left is more important
export type ComparisonValue = -8 | -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Convert UI value (-8 to +8) to Saaty ratio
export function comparisonToSaatyRatio(value: ComparisonValue): number {
  if (value === 0) return 1; // Equal importance
  if (value > 0) return value + 1; // Right is more important
  return 1 / (-value + 1); // Left is more important (reciprocal)
}

// Saaty scale descriptions
export const SAATY_LABELS: Record<number, string> = {
  1: 'Equal importance',
  2: 'Slightly more important',
  3: 'Moderately more important',
  4: 'Moderately to strongly more important',
  5: 'Strongly more important',
  6: 'Strongly to very strongly more important',
  7: 'Very strongly more important',
  8: 'Very to extremely more important',
  9: 'Extremely more important',
};

// Pairwise comparison between two criteria
export interface PairwiseComparison {
  criterionA: CriterionId;
  criterionB: CriterionId;
  value: ComparisonValue; // -8 to +8 (negative = A more important, positive = B more important)
}

// Generate all unique pairs for n criteria
// For 7 criteria: 7 * 6 / 2 = 21 comparisons
export function generateComparisonPairs(): Array<[CriterionId, CriterionId]> {
  const pairs: Array<[CriterionId, CriterionId]> = [];
  const ids = CRITERIA.map(c => c.id);
  
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]]);
    }
  }
  
  return pairs;
}

// ============================================
// AHP Results
// ============================================

// Calculated weight for each criterion based on user preferences
export interface CriterionWeight {
  criterionId: CriterionId;
  weight: number; // 0 to 1, all weights sum to 1
}

// Property ranking result
export interface PropertyRanking {
  propertyId: string;
  finalScore: number; // 0 to 100
  criteriaContributions: Record<CriterionId, number>; // Score contribution from each criterion
  strengths: CriterionId[]; // Top 2-3 strengths
  weaknesses: CriterionId[]; // Bottom 2-3 weaknesses
}

// Complete AHP session result
export interface AHPResult {
  // User's calculated criteria weights
  weights: CriterionWeight[];
  
  // Consistency check
  consistencyRatio: number; // Should be < 0.1 for valid results
  isConsistent: boolean;
  
  // Ranked properties
  rankings: PropertyRanking[];
  
  // Metadata
  calculatedAt: string;
  propertyCount: number;
}

// AHP Session state
export interface AHPSession {
  // Current step in wizard (0 = intro, 1-21 = comparisons, 22 = results)
  currentStep: number;
  
  // All pairwise comparisons made by user
  comparisons: PairwiseComparison[];
  
  // Calculated result (null until all comparisons complete)
  result: AHPResult | null;
  
  // Session metadata
  startedAt: string;
  completedAt: string | null;
}

// Random Index values for consistency ratio calculation
// Based on Saaty's research for matrix sizes 1-15
export const RANDOM_INDEX: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

