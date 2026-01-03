// ============================================
// AHP (Analytic Hierarchy Process) Engine
// Implementation of Saaty's method
// ============================================

import type { Property, CriteriaScores } from '../types';
import type {
  CriterionId,
  PairwiseComparison,
  CriterionWeight,
  PropertyRanking,
  AHPResult,
} from '../types/ahp';
import {
  CRITERIA,
  RANDOM_INDEX,
  comparisonToSaatyRatio,
} from '../types/ahp';

// ============================================
// Build Comparison Matrix from User Input
// ============================================

/**
 * Build the NxN pairwise comparison matrix from user comparisons
 * Matrix[i][j] represents how much more important criterion i is compared to j
 */
export function buildComparisonMatrix(comparisons: PairwiseComparison[]): number[][] {
  const n = CRITERIA.length;
  const criteriaIds = CRITERIA.map(c => c.id);
  
  // Initialize with 1s on diagonal
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
  
  // Fill matrix from comparisons
  for (const comparison of comparisons) {
    const i = criteriaIds.indexOf(comparison.criterionA);
    const j = criteriaIds.indexOf(comparison.criterionB);
    
    if (i === -1 || j === -1) continue;
    
    const ratio = comparisonToSaatyRatio(comparison.value);
    
    // If value is positive, B is more important (ratio > 1)
    // Matrix[i][j] = 1/ratio (A compared to B)
    // Matrix[j][i] = ratio (B compared to A)
    if (comparison.value >= 0) {
      matrix[i][j] = 1 / ratio;
      matrix[j][i] = ratio;
    } else {
      matrix[i][j] = ratio;
      matrix[j][i] = 1 / ratio;
    }
  }
  
  return matrix;
}

// ============================================
// Calculate Priority Vector (Weights)
// Using geometric mean method (more stable than eigenvalue)
// ============================================

/**
 * Calculate criteria weights using geometric mean method
 * This is the standard approach for AHP
 */
export function calculateWeights(matrix: number[][]): number[] {
  const n = matrix.length;
  
  // Step 1: Calculate geometric mean of each row
  const geometricMeans: number[] = [];
  for (let i = 0; i < n; i++) {
    let product = 1;
    for (let j = 0; j < n; j++) {
      product *= matrix[i][j];
    }
    geometricMeans.push(Math.pow(product, 1 / n));
  }
  
  // Step 2: Normalize to get weights
  const sum = geometricMeans.reduce((a, b) => a + b, 0);
  const weights = geometricMeans.map(gm => gm / sum);
  
  return weights;
}

/**
 * Alternative: Calculate weights using eigenvalue method (power iteration)
 * More accurate but computationally heavier
 */
export function calculateWeightsEigenvalue(matrix: number[][], iterations: number = 100): number[] {
  const n = matrix.length;
  
  // Start with uniform distribution
  let weights = Array(n).fill(1 / n);
  
  // Power iteration
  for (let iter = 0; iter < iterations; iter++) {
    const newWeights = Array(n).fill(0);
    
    // Matrix-vector multiplication
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newWeights[i] += matrix[i][j] * weights[j];
      }
    }
    
    // Normalize
    const sum = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map(w => w / sum);
  }
  
  return weights;
}

// ============================================
// Consistency Check
// ============================================

/**
 * Calculate the principal eigenvalue (λmax)
 */
function calculateLambdaMax(matrix: number[][], weights: number[]): number {
  const n = matrix.length;
  let lambdaMax = 0;
  
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] * weights[j];
    }
    lambdaMax += rowSum / weights[i];
  }
  
  return lambdaMax / n;
}

/**
 * Calculate Consistency Index (CI) and Consistency Ratio (CR)
 * CR < 0.1 means the comparisons are consistent
 */
export function calculateConsistency(matrix: number[][], weights: number[]): {
  lambdaMax: number;
  consistencyIndex: number;
  consistencyRatio: number;
  isConsistent: boolean;
} {
  const n = matrix.length;
  const lambdaMax = calculateLambdaMax(matrix, weights);
  
  // CI = (λmax - n) / (n - 1)
  const consistencyIndex = (lambdaMax - n) / (n - 1);
  
  // CR = CI / RI (Random Index)
  const randomIndex = RANDOM_INDEX[n] || 1.32; // Default to n=7 value
  const consistencyRatio = consistencyIndex / randomIndex;
  
  return {
    lambdaMax,
    consistencyIndex,
    consistencyRatio,
    isConsistent: consistencyRatio < 0.1,
  };
}

// ============================================
// Rank Properties
// ============================================

/**
 * Calculate final score for a property based on criteria weights
 */
export function calculatePropertyScore(
  criteriaScores: CriteriaScores,
  weights: CriterionWeight[]
): { finalScore: number; contributions: Record<CriterionId, number> } {
  const contributions: Record<CriterionId, number> = {} as Record<CriterionId, number>;
  let finalScore = 0;
  
  for (const weight of weights) {
    const criterionScore = criteriaScores[weight.criterionId] || 5; // Default to neutral
    const contribution = criterionScore * weight.weight * 10; // Scale to 0-100
    contributions[weight.criterionId] = contribution;
    finalScore += contribution;
  }
  
  return { finalScore, contributions };
}

/**
 * Rank all properties based on user preferences
 */
export function rankProperties(
  properties: Property[],
  weights: CriterionWeight[]
): PropertyRanking[] {
  const rankings: PropertyRanking[] = [];
  
  for (const property of properties) {
    // Skip properties without criteria scores
    if (!property.criteriaScores) continue;
    
    const { finalScore, contributions } = calculatePropertyScore(
      property.criteriaScores,
      weights
    );
    
    // Find strengths (top criteria contributions relative to weight)
    const sortedContributions = Object.entries(contributions)
      .map(([id]) => ({
        id: id as CriterionId,
        score: property.criteriaScores![id as CriterionId] || 5,
      }))
      .sort((a, b) => b.score - a.score);
    
    const strengths = sortedContributions.slice(0, 3).map(c => c.id);
    const weaknesses = sortedContributions.slice(-3).reverse().map(c => c.id);
    
    rankings.push({
      propertyId: property.id,
      finalScore,
      criteriaContributions: contributions,
      strengths,
      weaknesses,
    });
  }
  
  // Sort by final score descending
  rankings.sort((a, b) => b.finalScore - a.finalScore);
  
  return rankings;
}

// ============================================
// Main AHP Calculation
// ============================================

/**
 * Calculate complete AHP result from user comparisons
 */
export function calculateAHP(
  comparisons: PairwiseComparison[],
  properties: Property[]
): AHPResult {
  // Build comparison matrix
  const matrix = buildComparisonMatrix(comparisons);
  
  // Calculate weights
  const weightsArray = calculateWeights(matrix);
  
  // Convert to CriterionWeight objects
  const weights: CriterionWeight[] = CRITERIA.map((criterion, index) => ({
    criterionId: criterion.id,
    weight: weightsArray[index],
  }));
  
  // Check consistency
  const consistency = calculateConsistency(matrix, weightsArray);
  
  // Rank properties
  const propertiesWithScores = properties.filter(p => p.criteriaScores);
  const rankings = rankProperties(propertiesWithScores, weights);
  
  return {
    weights,
    consistencyRatio: consistency.consistencyRatio,
    isConsistent: consistency.isConsistent,
    rankings,
    calculatedAt: new Date().toISOString(),
    propertyCount: propertiesWithScores.length,
  };
}

// ============================================
// Utilities
// ============================================

/**
 * Get explanation text for why a property ranked high/low
 */
export function getPropertyExplanation(
  ranking: PropertyRanking,
  weights: CriterionWeight[],
  criteriaScores: CriteriaScores
): {
  whyHighRank: string[];
  improvements: string[];
} {
  const whyHighRank: string[] = [];
  const improvements: string[] = [];
  
  // Sort weights to find user's priorities
  const sortedWeights = [...weights].sort((a, b) => b.weight - a.weight);
  const topPriorities = sortedWeights.slice(0, 3).map(w => w.criterionId);
  
  // Check how property scores on top priorities
  for (const priorityId of topPriorities) {
    const score = criteriaScores[priorityId] || 5;
    const criterion = CRITERIA.find(c => c.id === priorityId);
    
    if (score >= 7) {
      whyHighRank.push(`${criterion?.name}: ${score}/10 (your #${topPriorities.indexOf(priorityId) + 1} priority)`);
    } else if (score <= 4) {
      improvements.push(`${criterion?.name}: ${score}/10 (important to you but weak here)`);
    }
  }
  
  // Add general strengths/weaknesses
  for (const strengthId of ranking.strengths) {
    if (!topPriorities.includes(strengthId)) {
      const score = criteriaScores[strengthId] || 5;
      const criterion = CRITERIA.find(c => c.id === strengthId);
      if (score >= 8 && whyHighRank.length < 4) {
        whyHighRank.push(`${criterion?.name}: ${score}/10`);
      }
    }
  }
  
  for (const weaknessId of ranking.weaknesses) {
    const score = criteriaScores[weaknessId] || 5;
    const criterion = CRITERIA.find(c => c.id === weaknessId);
    if (score <= 3 && improvements.length < 3) {
      improvements.push(`${criterion?.name}: ${score}/10`);
    }
  }
  
  return { whyHighRank, improvements };
}

