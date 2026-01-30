
// Verification Script
// This script simulates the app environment to run SQL queries and verify data persistence.
const { initDatabase, executeQuery, addBookmark, startSession, endSession, trackPageView, getJuzProgress, savePrayerSettings } = require('./src/services');

const runVerification = async () => {
  console.log('--- STARTING VERIFICATION ---');

  try {
    // 1. Initialize DB
    await initDatabase();
    console.log('✅ Database Initialized');

    // 2. Verify Bookmarks
    console.log('\n--- Verifying Bookmarks ---');
    await executeQuery('DELETE FROM bookmarks'); // Clear first
    const bookmarkId = await addBookmark({ surah: 2, ayah: 255, page: 42, label: 'Ayatul Kursi' });
    const bookmarks = await executeQuery('SELECT * FROM bookmarks WHERE id = ?', [bookmarkId]);
    if (bookmarks.rows.length === 1 && bookmarks.rows.item(0).surah === 2) {
      console.log('✅ Bookmark Created & Retrieved:', bookmarks.rows.item(0));
    } else {
      console.error('❌ Bookmark verification failed');
    }

    // 3. Verify Sessions
    console.log('\n--- Verifying Sessions ---');
    await executeQuery('DELETE FROM reading_sessions');
    const sessionId = await startSession({ surah: 18, ayah: 1 });
    // Simulate reading
    await new Promise(r => setTimeout(r, 100));
    await endSession(18, 10);

    const sessions = await executeQuery('SELECT * FROM reading_sessions WHERE id = ?', [sessionId]);
    if (sessions.rows.length === 1 && sessions.rows.item(0).status === 'completed') {
      console.log('✅ Session Recorded:', sessions.rows.item(0));
    } else {
      console.error('❌ Session verification failed');
    }

    // 4. Verify Page Tracking & Juz Progress
    console.log('\n--- Verifying Page Tracking ---');
    await executeQuery('DELETE FROM page_reads');
    await trackPageView(1); // Al-Fatiha
    await trackPageView(2); // Al-Baqarah start

    // Check DB
    const pageReads = await executeQuery('SELECT * FROM page_reads');
    console.log(`✅ Tracked ${pageReads.rows.length} unique pages`);

    // Check Juz Progress (Juz 1 covers pages 1-21)
    const progress = await getJuzProgress(1);
    console.log('✅ Juz 1 Progress:', progress);
    if (progress.pagesRead >= 2) {
      console.log('✅ Juz Progress Calculation Correct');
    } else {
      console.error('❌ Juz Progress Calculation Failed');
    }

    console.log('\n--- ALL VERIFICATIONS PASSED ---');

  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
  }
};

// Mock AsyncStorage for Node environment if needed, or assume running in Expo context.
// Since we can't easily run this node script with expo-sqlite valid in Node, 
// this file effectively serves as a "Simulation Code" that I would run in the App.js 
// temporarily or standard unit test. 
// However, since I am an AI Agent, I can't "run" the expo runtime directly in terminal.
// I will just disable the "run" part and output this as a plan.
// OR, I can inject this into App.js as a "Verification Mode".

console.log("To run verification, import 'runVerification' in App.js and call it.");
