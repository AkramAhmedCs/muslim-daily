import { writeQuery, readFirstQuery } from './DatabaseService';

const SESSION_CAP_MINUTES = 120;

let currentSessionId = null;
let sessionTimer = null;

// Start a new session
export const startSession = async ({ surah, ayah, source }) => {
  if (currentSessionId) {
    await endSession();
  }

  const id = new Date().getTime().toString();
  const startAt = new Date().toISOString();

  try {
    await writeQuery(
      `INSERT INTO reading_sessions (id, start_at, start_surah, start_ayah, source, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, startAt, surah, ayah, source, startAt]
    );

    currentSessionId = id;

    // Safety timer: Cap at 120 mins
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
      console.warn('[ReadingSession] Force closing session > 120m');
      endSession();
    }, SESSION_CAP_MINUTES * 60 * 1000);

    console.log(`[ReadingSession] Started: ${id}`);
  } catch (e) {
    console.error('[ReadingSession] Start failed', e);
  }
};

// End current session
export const endSession = async (endSurah = null, endAyah = null) => {
  if (!currentSessionId) return;

  const endAt = new Date().toISOString();
  const id = currentSessionId;

  try {
    // Calculate duration
    const row = await readFirstQuery(`SELECT start_at FROM reading_sessions WHERE id = ?`, [id]);
    if (row) {
      const startDate = new Date(row.start_at);
      const endDate = new Date(endAt);
      let duration = Math.floor((endDate - startDate) / 1000); // seconds

      // Cap logic
      if (duration > SESSION_CAP_MINUTES * 60) {
        duration = SESSION_CAP_MINUTES * 60;
      }

      await writeQuery(
        `UPDATE reading_sessions SET end_at = ?, end_surah = ?, end_ayah = ?, duration_seconds = ? WHERE id = ?`,
        [endAt, endSurah, endAyah, duration, id]
      );
      console.log(`[ReadingSession] Ended: ${id}, Duration: ${duration}s`);
    }
  } catch (e) {
    console.error('[ReadingSession] End failed', e);
  } finally {
    currentSessionId = null;
    if (sessionTimer) clearTimeout(sessionTimer);
  }
};

// Get today's reading minutes
export const getTodayReadingMinutes = async () => {
  try {
    const result = await readFirstQuery(`
            SELECT SUM(duration_seconds) as totalSecs 
            FROM reading_sessions 
            WHERE date(start_at, 'localtime') = date('now', 'localtime')
        `);

    const secs = result?.totalSecs || 0;
    const mins = Math.floor(secs / 60);

    if (mins > 600) return 600;
    return mins;
  } catch (e) {
    console.error(e);
    return 0;
  }
};
