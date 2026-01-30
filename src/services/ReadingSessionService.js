import { writeQuery, readFirstQuery } from './DatabaseService';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';

// Constants
const MAX_SESSION_DURATION = 4 * 60 * 60; // 4 hours in seconds
const HEARTBEAT_INTERVAL = 60000; // 1 minute

// In-memory state
let currentSessionId = null;
let heartbeatTimer = null;
let sessionStartTime = null;

const getUUID = () => Crypto.randomUUID();
const getISO = () => new Date().toISOString();

export const startSession = async ({ surah, ayah, source = 'verse_reader' }) => {
  if (currentSessionId) {
    await endSession();
  }

  try {
    const id = getUUID();
    const startAt = getISO();

    // Use writeQuery
    await writeQuery(
      `INSERT INTO reading_sessions (id, start_at, surah_start, ayah_start, source, status) 
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [id, startAt, surah, ayah, source]
    );

    currentSessionId = id;
    sessionStartTime = Date.now();

    startHeartbeat();

    console.log('[Session] Started:', id);
    return id;
  } catch (error) {
    console.error('[Session] Start Error:', error);
    return null;
  }
};

const startHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(async () => {
    if (!currentSessionId) {
      clearInterval(heartbeatTimer);
      return;
    }

    try {
      const now = getISO();
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);

      if (elapsed > MAX_SESSION_DURATION) {
        console.warn('[Session] Max duration exceeded, force closing');
        await endSession();
        return;
      }

      await writeQuery(
        `UPDATE reading_sessions 
         SET end_at = ?, duration_seconds = ? 
         WHERE id = ?`,
        [now, elapsed, currentSessionId]
      );
    } catch (e) {
      console.error('[Session] Heartbeat Error:', e);
    }
  }, HEARTBEAT_INTERVAL);
};

export const endSession = async (finalSurah = null, finalAyah = null) => {
  if (!currentSessionId) return;

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  try {
    const endAt = getISO();
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const id = currentSessionId;

    currentSessionId = null;
    sessionStartTime = null;

    const query = `
      UPDATE reading_sessions 
      SET end_at = ?, 
          duration_seconds = ?, 
          status = 'completed'
          ${finalSurah ? ', surah_end = ?, ayah_end = ?' : ''}
      WHERE id = ?
    `;

    const params = finalSurah
      ? [endAt, elapsed, finalSurah, finalAyah, id]
      : [endAt, elapsed, id];

    await writeQuery(query, params);

    console.log('[Session] Ended:', id, 'Duration:', elapsed);

  } catch (error) {
    console.error('[Session] End Error:', error);
  }
};

export const getTodayReadingMinutes = async () => {
  try {
    const result = await readFirstQuery(
      `SELECT SUM(duration_seconds) as total_seconds 
             FROM reading_sessions 
             WHERE date(start_at) = date('now', 'localtime')`
    );

    // result is object or null. result.total_seconds is value.
    const seconds = result ? result.total_seconds : 0;
    return Math.floor((seconds || 0) / 60);
  } catch (error) {
    console.error('[Session] Get Stats Error:', error);
    return 0;
  }
};

AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState.match(/inactive|background/) && currentSessionId) {
    console.log('[Session] App backgrounded, ending session...');
    endSession();
  }
});
