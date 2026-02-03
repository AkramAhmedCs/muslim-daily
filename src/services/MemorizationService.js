import { readQuery, readFirstQuery, writeQuery, getDB } from './DatabaseService';
import * as Crypto from 'expo-crypto';

// --- CONSTANTS ---
const MIN_EASE = 1.3;
const INITIAL_EASE = 2.5;

// --- HELPERS ---
const getUUID = () => Crypto.randomUUID();
const getISO = () => new Date().toISOString();

/**
 * Initialize Service (Runs migration via DatabaseService)
 * The prompt requires an exported 'initialize', but our DatabaseService handles it.
 * We will expose a wrapper to be compliant with the spec.
 */
export const initialize = async () => {
  // DatabaseService.initDatabase() is called by App.js usually.
  // We can ensure DB is ready here if needed.
  await getDB();
};

/**
 * Get items due for review
 * Rules: nextReviewAt IS NULL OR nextReviewAt <= nowISO
 * Sort: nextReviewAt ASC, createdAt ASC
 */
export const getDueItems = async (nowISO, limit = 50) => {
  return await readQuery(
    `SELECT * FROM memorization 
     WHERE nextReviewAt IS NULL OR nextReviewAt <= ? 
     ORDER BY nextReviewAt ASC, createdAt ASC 
     LIMIT ?`,
    [nowISO, limit]
  );
};

/**
 * Add a new item to memorization
 * Defaults: status='learning', createdAt=now, nextReviewAt=now
 */
export const addItem = async (surah, ayah, page = 0) => {
  console.log('[MemorizationService] addItem called for:', surah, ayah);
  try {
    // Check existence
    const existing = await readFirstQuery(
      `SELECT id FROM memorization WHERE surah = ? AND ayah = ?`,
      [surah, ayah]
    );
    if (existing) {
      console.log('[MemorizationService] Item exists:', existing.id);
      return existing.id;
    }

    const id = getUUID();
    const now = getISO();
    console.log('[MemorizationService] Creating new item:', id);

    await writeQuery(
      `INSERT INTO memorization (
              id, surah, ayah, page, status, 
              totalReps, consecutiveCorrect, easeFactor, intervalDays, 
              nextReviewAt, lastAttemptAt, lastGrade, 
              createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, 'learning', 0, 0, ?, 0, ?, NULL, NULL, ?, ?)`,
      [id, surah, ayah, page, INITIAL_EASE, now, now, now]
    );
    console.log('[MemorizationService] Item created successfully');

    return id;
  } catch (e) {
    console.error('[MemorizationService] addItem failed:', e);
    throw e;
  }
};

/**
 * Remove an item
 */
export const removeItem = async (id) => {
  await writeQuery(`DELETE FROM memorization WHERE id = ?`, [id]);
};

/**
 * Record an attempt with strict SM-2 Logic
 * grade: 0=Again, 1=Hard, 2=Good, 3=Easy
 */
export const recordAttempt = async (id, grade) => {
  const item = await readFirstQuery(`SELECT * FROM memorization WHERE id = ?`, [id]);
  if (!item) throw new Error('Item not found');

  const now = new Date();

  // 1. Update Consecutive Correct
  // If grade < 2 (Again/Hard) -> consecutiveCorrect = 0
  // Else -> consecutiveCorrect += 1
  let newConsecutive = (grade < 2) ? 0 : (item.consecutiveCorrect + 1);

  // 2. Update Ease Factor
  // Formula: E' = max(1.3, E + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02)))
  // q = grade
  const q = grade;
  let newEase = item.easeFactor + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02));
  if (newEase < MIN_EASE) newEase = MIN_EASE;

  // 3. Update Interval
  let newInterval = item.intervalDays;

  if (grade < 2) {
    // Failure (Again/Hard) -> Reset to 1 day
    newInterval = 1;
  } else {
    // Success
    if (item.intervalDays === 0) {
      newInterval = 1;
    } else if (item.intervalDays === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(item.intervalDays * newEase);
    }
  }

  // 4. Calculate Next Review
  // nextReviewAt = now + intervalDays
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + newInterval);
  const nextReviewAt = nextDate.toISOString();

  // 5. Update Status
  // If consecutiveCorrect >= 10 OR (EF >= 2.9 && consecutive >= 5) -> 'mastered'
  // If status was 'mastered' and grade < 2 -> 'review'
  let newStatus = item.status;

  if (newStatus === 'mastered' && grade < 2) {
    newStatus = 'review';
  } else if (newStatus !== 'mastered') {
    if (newConsecutive >= 10 || (newEase >= 2.9 && newConsecutive >= 5)) {
      newStatus = 'mastered';
    } else {
      // If interval > 0 it is technically in 'review' phase vs 'learning'
      // Spec doesn't strictly define learning->review transition but standard is typically
      // once interval > 1 day. Let's keep it simple or strictly follow spec "status='learning'" default.
      // Spec: "Inserts row ... status='learning'". 
      // Implementation: "If status was 'mastered' and grade < 2 -> 'review'".
      // It implies we should switch to 'review' at some point.
      // Let's say if interval > 0 -> 'review'.
      if (newInterval > 0) newStatus = 'review';
    }
  }

  // 6. Persist
  await writeQuery(
    `UPDATE memorization SET
         totalReps = totalReps + 1,
         consecutiveCorrect = ?,
         easeFactor = ?,
         intervalDays = ?,
         nextReviewAt = ?,
         lastAttemptAt = ?,
         lastGrade = ?,
         status = ?,
         updatedAt = ?
       WHERE id = ?`,
    [newConsecutive, newEase, newInterval, nextReviewAt, now.toISOString(), grade, newStatus, now.toISOString(), id]
  );

  return {
    id,
    nextReviewAt,
    intervalDays: newInterval,
    status: newStatus
  };
};

/**
 * Get Statistics
 */
export const getProgressStats = async () => {
  const now = getISO();

  // totalItems
  const totalRes = await readFirstQuery(`SELECT COUNT(*) as c FROM memorization`);

  // dueToday (nextReviewAt <= now)
  const dueRes = await readFirstQuery(`SELECT COUNT(*) as c FROM memorization WHERE nextReviewAt <= ?`, [now]);

  // masteredCount
  const masteredRes = await readFirstQuery(`SELECT COUNT(*) as c FROM memorization WHERE status = 'mastered'`);

  // learningCount (status = 'learning')
  const learningRes = await readFirstQuery(`SELECT COUNT(*) as c FROM memorization WHERE status = 'learning'`);

  return {
    totalItems: totalRes?.c || 0,
    dueToday: dueRes?.c || 0,
    masteredCount: masteredRes?.c || 0,
    learningCount: learningRes?.c || 0
  };
};
