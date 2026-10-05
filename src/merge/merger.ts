import { GradedItem } from '../types/items';

export interface MergeResult {
  mergedItems: GradedItem[];
  conflictsFound: number;
  canvasItemsMatched: number;
  syllabusItemsRetained: number;
}

/**
 * Calculates string similarity between 0.0 and 1.0 using normalized token overlap & bigram Jaccard
 */
export function calculateTitleSimilarity(titleA: string, titleB: string): number {
  const normA = titleA.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const normB = titleB.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  // Exact substring containment
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.88;
  }

  // Check matching digits / numbers (e.g. "1" in "Quiz 1" and "Canvas Quiz 1")
  const numsA = normA.match(/\b\d+\b/g) || [];
  const numsB = normB.match(/\b\d+\b/g) || [];
  let numberMatchBonus = 0;
  if (numsA.length > 0 && numsB.length > 0) {
    const hasSameNum = numsA.some(na => numsB.some(nb => parseInt(na, 10) === parseInt(nb, 10)));
    if (hasSameNum) numberMatchBonus = 0.25;
  }

  // Token Jaccard similarity with normalized digits (e.g. '05' -> '5')
  const toCleanTokens = (str: string) =>
    str.split(/\s+/).map(t => /^\d+$/.test(t) ? String(parseInt(t, 10)) : t);

  const tokensA = new Set(toCleanTokens(normA));
  const tokensB = new Set(toCleanTokens(normB));

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  const tokenJaccard = union === 0 ? 0 : intersection / union;

  return Math.min(1.0, tokenJaccard * 0.75 + numberMatchBonus);
}

/**
 * Merges Live Canvas assignments with Syllabus/Schedule extracted items and User Custom items.
 *
 * Priority order:
 * 1. LIVE CANVAS: Authoritative for dates & points.
 * 2. SYLLABUS/SCHEDULE: Fills gaps, notes, location, reading materials. Never duplicates.
 * 3. USER CUSTOM ITEMS: Always preserved untouched.
 */
export function mergeCourseItems(
  canvasItems: GradedItem[],
  syllabusItems: GradedItem[],
  customItems: GradedItem[] = []
): MergeResult {
  const mergedItems: GradedItem[] = [];
  let conflictsFound = 0;
  let canvasItemsMatched = 0;

  // Keep track of which syllabus items got merged into a Canvas item
  const matchedSyllabusIds = new Set<string>();

  for (const cItem of canvasItems) {
    let bestMatch: GradedItem | null = null;
    let bestSim = 0;

    for (const sItem of syllabusItems) {
      if (sItem.courseId !== cItem.courseId) continue;

      const sim = calculateTitleSimilarity(cItem.title, sItem.title);

      // Date proximity check: if dates are within 5 days, bonus similarity
      let dateMatchBonus = 0;
      if (cItem.dueDate && sItem.dueDate) {
        const cDate = new Date(cItem.dueDate).getTime();
        const sDate = new Date(sItem.dueDate).getTime();
        const diffDays = Math.abs(cDate - sDate) / (1000 * 60 * 60 * 24);
        if (diffDays === 0) dateMatchBonus = 0.20;
        else if (diffDays <= 4) dateMatchBonus = 0.10;
      }

      const totalScore = sim + dateMatchBonus;
      if (totalScore > 0.55 && totalScore > bestSim) {
        bestSim = totalScore;
        bestMatch = sItem;
      }
    }

    if (bestMatch) {
      matchedSyllabusIds.add(bestMatch.id);
      canvasItemsMatched++;

      // Check for date conflict
      let hasConflict = false;
      let conflictDetails: GradedItem['conflictDetails'] = undefined;

      if (cItem.dueDate && bestMatch.dueDate && cItem.dueDate !== bestMatch.dueDate) {
        hasConflict = true;
        conflictsFound++;
        conflictDetails = {
          field: 'Due Date',
          canvasValue: `${cItem.dueDate} ${cItem.dueTime || ''}`.trim(),
          syllabusValue: `${bestMatch.dueDate} ${bestMatch.dueTime || ''}`.trim()
        };
      }

      // Merge: Canvas authoritative for date/points; syllabus supplies notes/source/weight
      mergedItems.push({
        ...cItem,
        weight: cItem.weight ?? bestMatch.weight,
        notes: [cItem.notes, bestMatch.notes].filter(Boolean).join(' • ') || undefined,
        sourceDoc: bestMatch.sourceDoc,
        hasConflict,
        conflictDetails,
        isInferred: false // Promoted from inferred recurring to concrete Canvas assignment!
      });
    } else {
      // Unmatched Canvas item
      mergedItems.push({ ...cItem });
    }
  }

  // Add remaining unmatched syllabus items (e.g. undated obligations, reading items, exams not yet published on Canvas)
  let syllabusRetained = 0;
  for (const sItem of syllabusItems) {
    if (!matchedSyllabusIds.has(sItem.id)) {
      mergedItems.push({ ...sItem });
      syllabusRetained++;
    }
  }

  // Add all user custom items (never overwritten)
  for (const customItem of customItems) {
    mergedItems.push({ ...customItem });
  }

  return {
    mergedItems,
    conflictsFound,
    canvasItemsMatched,
    syllabusItemsRetained: syllabusRetained
  };
}
