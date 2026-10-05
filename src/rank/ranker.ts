import { GradedItem, RankedItem, BucketType, ItemType } from '../types/items';
import { RankingWeights } from '../types/settings';

const TYPE_IMPORTANCE_SCORES: Record<ItemType, number> = {
  exam: 1.0,
  project: 0.9,
  presentation: 0.85,
  assignment: 0.6,
  quiz: 0.6,
  lab: 0.55,
  reading: 0.4,
  extra_credit: 0.35,
  attendance: 0.3,
  checkin: 0.3,
  no_class: 0.05
};

/**
 * Calculates a non-linear urgency score between 0.10 and 1.0
 * Overdue: 1.0
 * Due today: 0.98
 * Due in 7 days: ~0.55
 * Due in 30 days: ~0.20
 * Far off (>60 days): floor of 0.10 so it never drops to zero
 */
export function calculateUrgencyScore(dueDateStr: string | null, referenceDate: Date = new Date()): number {
  if (!dueDateStr) return 0.20; // Undated or TBD has modest baseline urgency

  const due = new Date(dueDateStr + 'T23:59:59');
  const now = referenceDate;
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    // Overdue
    return 1.0;
  }

  // Non-linear decay with asymptotic floor at 0.10
  const decay = 1 / (1 + Math.pow(diffDays / 7, 1.25));
  return Math.max(0.10, Math.min(1.0, 0.10 + 0.90 * decay));
}

/**
 * Calculates importance score based on type priority, points, and syllabus weight
 */
export function calculateImportanceScore(item: GradedItem): number {
  const typeBase = TYPE_IMPORTANCE_SCORES[item.type] ?? 0.5;

  let pointsFactor = 0.5;
  if (item.points !== null) {
    // 100 points or more scales up to 1.0
    pointsFactor = Math.min(1.0, item.points / 100);
  }

  let weightFactor = 0.5;
  if (item.weight !== null) {
    // 30% weight scales up to 1.0
    weightFactor = Math.min(1.0, item.weight / 30);
  }

  // Weighted blend: type has the strongest signal, then weight, then points
  return Math.min(1.0, typeBase * 0.5 + weightFactor * 0.3 + pointsFactor * 0.2);
}

/**
 * Calculates effort hint based on type and points
 */
export function calculateEffortScore(item: GradedItem): number {
  if (item.type === 'project' || item.type === 'exam') return 0.9;
  if (item.type === 'presentation' || item.type === 'lab') return 0.75;
  if (item.points && item.points >= 50) return 0.8;
  if (item.points && item.points <= 10) return 0.3;
  return 0.5;
}

/**
 * Determines which bucket an item belongs to:
 * - 'completed': already completed
 * - 'this_week': due within 7 days (rolling window)
 * - 'on_the_horizon': pinned high-impact items (exams, final projects, presentations, or weight > 15%)
 * - 'later': everything else
 */
export function determineBucket(item: GradedItem, referenceDate: Date = new Date()): BucketType {
  if (item.completed) return 'completed';

  const isHorizonType =
    item.type === 'exam' ||
    item.type === 'presentation' ||
    (item.type === 'project' && ((item.weight && item.weight >= 15) || (item.points && item.points >= 100)));

  const isHighWeight = (item.weight !== null && item.weight > 15) || (item.points !== null && item.points >= 100);

  // If undated or TBD
  if (!item.dueDate) {
    if (isHorizonType || isHighWeight) return 'on_the_horizon';
    return 'later';
  }

  const due = new Date(item.dueDate + 'T23:59:59');
  const now = referenceDate;
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Overdue or within 7-day rolling window
  if (diffDays <= 7) {
    return 'this_week';
  }

  // Outside 7 days: check if pinned for On the Horizon
  if (isHorizonType || isHighWeight) {
    return 'on_the_horizon';
  }

  return 'later';
}

/**
 * Ranks all items and assigns them to buckets
 */
export function rankItems(
  items: GradedItem[],
  weights: RankingWeights = { urgencyWeight: 0.45, importanceWeight: 0.40, effortWeight: 0.15 },
  referenceDate: Date = new Date()
): RankedItem[] {
  return items.map(item => {
    const urgency = calculateUrgencyScore(item.dueDate, referenceDate);
    const importance = calculateImportanceScore(item);
    const effort = calculateEffortScore(item);

    const relevanceScore =
      urgency * weights.urgencyWeight +
      importance * weights.importanceWeight +
      effort * weights.effortWeight;

    const bucket = determineBucket(item, referenceDate);

    return {
      ...item,
      bucket,
      relevanceScore: Math.round(relevanceScore * 100) / 100
    };
  }).sort((a, b) => {
    // Sort highest relevance score first
    return b.relevanceScore - a.relevanceScore;
  });
}

/**
 * Calculates a global urgency score (0.0 to 1.0) for the next 7 days
 * Used for the floating button color gradient (Blue -> Teal -> Yellow -> Orange -> Red)
 */
export function calculateGlobalUrgency(items: GradedItem[], referenceDate: Date = new Date()): number {
  const activeItems = items.filter(i => !i.completed);
  if (activeItems.length === 0) return 0.0;

  const thisWeekItems = activeItems.filter(item => {
    if (!item.dueDate) return false;
    const due = new Date(item.dueDate + 'T23:59:59');
    const diffDays = (due.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 7;
  });

  if (thisWeekItems.length === 0) return 0.1;

  // Aggregate weighted urgency of upcoming items
  let totalUrgency = 0;
  for (const item of thisWeekItems) {
    const u = calculateUrgencyScore(item.dueDate, referenceDate);
    const imp = calculateImportanceScore(item);
    totalUrgency += u * imp;
  }

  // Normalized to 0.0 - 1.0
  const normalized = totalUrgency / 3.0;
  return Math.min(1.0, Math.max(0.0, normalized));
}
