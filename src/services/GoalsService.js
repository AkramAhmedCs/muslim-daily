import { readQuery, readFirstQuery, writeQuery, runTransaction } from './DatabaseService';
import * as Crypto from 'expo-crypto';

const getUUID = () => Crypto.randomUUID();
const getISO = () => new Date().toISOString();
const getTodayDate = () => new Date().toISOString().split('T')[0];

/**
 * Goals Service
 * Manages reading plans (e.g. "Complete Quran in 30 days" or "Read 10 pages/day")
 */

// --- Plan Management ---

/**
 * Create a new reading plan.
 * @param {string} type - 'pages_per_day' | 'finish_by_date'
 * @param {number|string} target - Number of pages OR Date string (ISO)
 */
export const createPlan = async (type, target) => {
  const id = getUUID();
  const startDate = getTodayDate();

  // Deactivate any existing enabled plans of same type? 
  // For MVP, let's say only ONE active plan allowed.
  await writeQuery(`UPDATE plans SET enabled = 0 WHERE enabled = 1`);

  await writeQuery(`
        INSERT INTO plans (id, type, target, startDate, createdAt, enabled)
        VALUES (?, ?, ?, ?, ?, 1)
    `, [id, type, target, startDate, getISO()]);

  return id;
};

export const getActivePlan = async () => {
  const plan = await readFirstQuery(`SELECT * FROM plans WHERE enabled = 1`);
  return plan;
};

// --- Progress Tracking ---

/**
 * Log progress for today.
 * @param {string} planId
 * @param {number} amount - Pages read (delta or total? Let's assume absolute daily total from tracking service)
 * Actually, for simplicity, let's make this "add progress".
 */
export const logProgress = async (planId, amount) => {
  const date = getTodayDate();

  // Check if entry exists for today
  const existing = await readFirstQuery(`
        SELECT * FROM plan_progress WHERE planId = ? AND date = ?
    `, [planId, date]);

  if (existing) {
    await writeQuery(`
            UPDATE plan_progress SET achieved = achieved + ? WHERE id = ?
        `, [amount, existing.id]);
  } else {
    await writeQuery(`
            INSERT INTO plan_progress (id, planId, date, achieved, target)
            VALUES (?, ?, ?, ?, 0) 
        `, [getUUID(), planId, date, amount]);
  }
};

/**
 * Sync progress from PageTrackingService.
 * Call this when a page is read.
 */
export const syncDailyProgress = async (pagesReadCount) => {
  const plan = await getActivePlan();
  if (!plan) return;

  const date = getTodayDate();

  // Upsert equivalent
  const existing = await readFirstQuery(`
        SELECT * FROM plan_progress WHERE planId = ? AND date = ?
    `, [plan.id, date]);

  const dailyTarget = calculateDailyTarget(plan);

  if (existing) {
    await writeQuery(`
            UPDATE plan_progress SET achieved = ?, target = ? WHERE id = ?
        `, [pagesReadCount, dailyTarget, existing.id]);
  } else {
    await writeQuery(`
            INSERT INTO plan_progress (id, planId, date, achieved, target)
            VALUES (?, ?, ?, ?, ?) 
        `, [getUUID(), plan.id, date, pagesReadCount, dailyTarget]);
  }
};

// --- Calculations ---

const TOTAL_PAGES = 604;

export const calculateDailyTarget = (plan) => {
  if (plan.type === 'pages_per_day') {
    return parseInt(plan.target, 10);
  } else if (plan.type === 'finish_by_date') {
    // Complex: (Total Pages - Pages Read So Far) / Days Remaining
    // For MVP, simplistic: 604 / Days between Start and Target
    const start = new Date(plan.startDate);
    const end = new Date(plan.target);
    if (isNaN(end.getTime())) return 20; // fallback

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    return Math.ceil(TOTAL_PAGES / diffDays);
  }
  return 20; // Default: 1 Juz/day
};

/**
 * Get Dashboard Stats
 */
export const getGoalsDashboard = async () => {
  const plan = await getActivePlan();
  if (!plan) return null;

  const date = getTodayDate();
  const progressEntry = await readFirstQuery(`
        SELECT * FROM plan_progress WHERE planId = ? AND date = ?
    `, [plan.id, date]);

  const achieved = progressEntry ? progressEntry.achieved : 0;
  const target = calculateDailyTarget(plan);

  return {
    planType: plan.type,
    dailyTarget: target,
    achievedToday: achieved,
    progressPercent: Math.min(100, Math.round((achieved / target) * 100)),
    isOnTrack: achieved >= target
  };
};
