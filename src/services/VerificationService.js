import { readQuery } from './DatabaseService';

export const runVerification = async () => {
  console.log('--- VERIFICATION START ---');

  // 1. Sessions Today
  try {
    const sessions = await readQuery(`SELECT id, start_at, end_at, duration_seconds FROM reading_sessions WHERE date(start_at,'localtime') = date('now','localtime')`);
    console.log('Sessions Today:', JSON.stringify(sessions, null, 2));
  } catch (e) { console.error('Sessions Error', e); }

  // 2. Minutes Today
  try {
    const mins = await readQuery(`SELECT SUM(duration_seconds)/60.0 AS minutes_today FROM reading_sessions WHERE date(start_at,'localtime') = date('now','localtime')`);
    console.log('Minutes Today:', JSON.stringify(mins, null, 2));
  } catch (e) { console.error('Mins Error', e); }

  // 3. Juz Progress (Example for Juz 1 P 1-21)
  try {
    const juz = await readQuery(`SELECT COUNT(DISTINCT page) AS pagesRead FROM page_reads WHERE page BETWEEN 1 AND 21 AND date(date_read,'localtime') = date('now','localtime')`);
    console.log('Juz 1 Progress:', JSON.stringify(juz, null, 2));
  } catch (e) { console.error('Juz Error', e); }

  // 4. Open Sessions
  try {
    const open = await readQuery(`SELECT * FROM reading_sessions WHERE end_at IS NULL`);
    console.log('Open Sessions:', JSON.stringify(open, null, 2));
  } catch (e) { console.error('Open Sessions Error', e); }

  console.log('--- VERIFICATION END ---');
};
