export interface SplitInput {
  userId: string;
  value: number; // Represents amount, percentage, or shares depending on split type
}

export interface SplitResult {
  [userId: string]: number;
}

/**
 * Calculates equal splits for a given amount among participants.
 * Adjusts the remainder (rounding errors) by giving the extra cent(s) to the first participant.
 */
export function calculateEqual(amount: number, userIds: string[]): SplitResult {
  if (userIds.length === 0) return {};
  
  const count = userIds.length;
  const rawShare = amount / count;
  const roundedShare = Math.floor(rawShare * 100) / 100;
  
  // Calculate total rounded and the discrepancy
  const totalRounded = roundedShare * count;
  const discrepancy = Math.round((amount - totalRounded) * 100); // in cents
  
  const results: SplitResult = {};
  userIds.forEach((userId, index) => {
    // Add 1 cent of the discrepancy to each of the first few participants
    const extraCent = index < discrepancy ? 0.01 : 0;
    results[userId] = Math.round((roundedShare + extraCent) * 100) / 100;
  });
  
  return results;
}

/**
 * Validates and returns unequal splits.
 * Checks that the sum of parts equals the total amount.
 */
export function calculateUnequal(amount: number, splits: SplitInput[]): { results: SplitResult; isValid: boolean; difference: number } {
  const results: SplitResult = {};
  let sum = 0;
  
  splits.forEach(s => {
    results[s.userId] = Math.round(s.value * 100) / 100;
    sum += results[s.userId];
  });
  
  sum = Math.round(sum * 100) / 100;
  const difference = Math.round((amount - sum) * 100) / 100;
  
  return {
    results,
    isValid: Math.abs(difference) < 0.01,
    difference
  };
}

/**
 * Calculates splits based on percentages.
 * The sum of percentages must be 100%. Adjusts rounding error on the first participant.
 */
export function calculatePercentage(amount: number, percentages: SplitInput[]): { results: SplitResult; isValid: boolean; difference: number } {
  let sumPercentage = 0;
  percentages.forEach(p => sumPercentage += p.value);
  
  const isValid = Math.abs(sumPercentage - 100) < 0.01;
  const results: SplitResult = {};
  
  if (percentages.length === 0) return { results, isValid, difference: 100 - sumPercentage };
  
  let totalDistributed = 0;
  percentages.forEach(p => {
    const share = Math.floor((amount * (p.value / 100)) * 100) / 100;
    results[p.userId] = share;
    totalDistributed += share;
  });
  
  totalDistributed = Math.round(totalDistributed * 100) / 100;
  const discrepancy = Math.round((amount - totalDistributed) * 100); // in cents
  
  // Distribute discrepancy cents to the first non-zero participants
  if (discrepancy !== 0 && percentages.length > 0) {
    const firstUserId = percentages[0].userId;
    results[firstUserId] = Math.round((results[firstUserId] + (discrepancy / 100)) * 100) / 100;
  }
  
  const difference = Math.round((100 - sumPercentage) * 100) / 100;
  return {
    results,
    isValid,
    difference
  };
}

/**
 * Calculates splits based on shares.
 * Calculates proportions and adjusts rounding error on the first participant with non-zero shares.
 */
export function calculateShares(amount: number, shares: SplitInput[]): { results: SplitResult; isValid: boolean } {
  let totalShares = 0;
  shares.forEach(s => totalShares += s.value);
  
  const isValid = totalShares > 0;
  const results: SplitResult = {};
  
  if (!isValid || shares.length === 0) {
    shares.forEach(s => results[s.userId] = 0);
    return { results, isValid: false };
  }
  
  let totalDistributed = 0;
  shares.forEach(s => {
    const share = Math.floor((amount * (s.value / totalShares)) * 100) / 100;
    results[s.userId] = share;
    totalDistributed += share;
  });
  
  totalDistributed = Math.round(totalDistributed * 100) / 100;
  const discrepancy = Math.round((amount - totalDistributed) * 100); // in cents
  
  if (discrepancy !== 0) {
    // Distribute remaining cents to the participant with the first share
    const target = shares.find(s => s.value > 0);
    if (target) {
      results[target.userId] = Math.round((results[target.userId] + (discrepancy / 100)) * 100) / 100;
    }
  }
  
  return {
    results,
    isValid: true
  };
}
