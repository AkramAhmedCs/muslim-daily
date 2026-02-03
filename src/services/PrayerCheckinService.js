import * as Notifications from 'expo-notifications';
import { getDB } from './DatabaseService';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'muslim_daily.db';

// Default Offsets
const CHECK_IN_OFFSET_MINUTES = 15;

// Helper to format Date as YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const initCheckinTables = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
      CREATE TABLE IF NOT EXISTS prayer_checkins (
        id TEXT PRIMARY KEY,
        prayerName TEXT NOT NULL,
        checkedAt TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT, 
        streak_current INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id TEXT PRIMARY KEY,
        type TEXT,
        targetTime TEXT,
        createdAt TEXT,
        status TEXT
      );
    `);
};

export const getStreak = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const today = formatDate(new Date());
  const result = await db.getFirstAsync(`SELECT COUNT(*) as count FROM prayer_checkins WHERE date = ?`, [today]);
  return result?.count || 0;
};

export const recordCheckIn = async (prayerName) => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const now = new Date();
  const today = formatDate(now);
  const checkedAt = now.toISOString();

  // Check if already checked in
  const existing = await db.getFirstAsync(
    `SELECT id FROM prayer_checkins WHERE prayerName = ? AND date = ?`,
    [prayerName, today]
  );

  if (existing) return false;

  await db.runAsync(
    `INSERT INTO prayer_checkins (id, prayerName, checkedAt, date, status) VALUES (?, ?, ?, ?, ?)`,
    [now.getTime().toString(), prayerName, checkedAt, today, 'on_time']
  );

  // Cancel Reminder for this prayer
  await Notifications.cancelScheduledNotificationAsync(`reminder-${prayerName}-${today}`);

  return true;
};

export const schedulePrayerReminders = async (prayerTimes) => {
  // prayerTimes: { Fajr: "05:00", Dhuhr: "12:30", ... }
  const todayStr = formatDate(new Date());

  // We only schedule for remaining prayers today
  for (const [prayer, time] of Object.entries(prayerTimes)) {
    if (['Sunrise', 'Sunset', 'Imsak', 'Midnight'].includes(prayer)) continue;

    // Parse time manually
    const [hours, mins] = time.split(':').map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(hours);
    prayerDate.setMinutes(mins);
    prayerDate.setSeconds(0);
    prayerDate.setMilliseconds(0);

    // Add Offset (15 mins)
    const reminderTime = new Date(prayerDate.getTime() + CHECK_IN_OFFSET_MINUTES * 60000);

    // Check if in future
    if (reminderTime > new Date()) {
      const id = `reminder-${prayer}-${todayStr}`;
      await scheduleLocalNotification(id, prayer, reminderTime);
    }
  }
};

const scheduleLocalNotification = async (id, prayerName, dateObj) => {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `${prayerName} Check-in`,
        body: `Did you perform ${prayerName}? Tap to record your prayer.`,
        sound: 'default',
        data: { screen: 'PrayerCheckin', prayer: prayerName }
      },
      trigger: {
        date: dateObj
      }
    });

    // Persist log
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.runAsync(
      `INSERT OR REPLACE INTO scheduled_notifications (id, type, targetTime, createdAt, status) VALUES (?, ?, ?, ?, ?)`,
      [id, 'prayer_checkin', dateObj.toISOString(), new Date().toISOString(), 'scheduled']
    );

  } catch (e) {
    console.error("Failed to schedule reminder", e);
  }
};
