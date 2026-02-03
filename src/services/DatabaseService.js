import * as SQLite from 'expo-sqlite';

const DB_NAME = 'muslim_daily.db';
let dbInstance = null;

const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

export const initDatabase = async () => {
  const db = await getDB();
  await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY NOT NULL,
        surah INTEGER NOT NULL,
        ayah INTEGER NOT NULL,
        page INTEGER,
        label TEXT,
        created_at TEXT NOT NULL,
        last_opened_at TEXT
      );
      CREATE TABLE IF NOT EXISTS reading_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT,
        duration_seconds INTEGER DEFAULT 0,
        start_surah INTEGER,
        start_ayah INTEGER,
        end_surah INTEGER,
        end_ayah INTEGER,
        source TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS page_reads (
        page INTEGER NOT NULL,
        date_read TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (page, date_read)
      );

    CREATE TABLE IF NOT EXISTS memorization (
      id TEXT PRIMARY KEY,
      surah INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      status TEXT CHECK(status IN ('learning','mastered','review')) NOT NULL,
      nextReviewAt TEXT,
      intervalDays INTEGER DEFAULT 0,
      easeFactor REAL DEFAULT 2.5,
      streak INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS audio_cache (
      id TEXT PRIMARY KEY,
      surah INTEGER,
      ayah INTEGER,
      reciter TEXT,
      url TEXT,
      localPath TEXT,
      size INTEGER,
      downloadedAt TEXT,
      lastPlayedAt TEXT
    );

    /* --- ADVANCED FEATURES SCHEMA --- */
    
    CREATE TABLE IF NOT EXISTS tafsir_entries (
      id TEXT PRIMARY KEY,
      surah INTEGER NOT NULL,
      ayah INTEGER NOT NULL,
      source TEXT NOT NULL,         -- e.g. "Ibn Kathir"
      book TEXT,                    -- e.g. "Tafsir al-Qur'an al-Azim"
      reference TEXT NOT NULL,      -- e.g. "Surah 2:255"
      textAr TEXT,
      textEn TEXT,
      language TEXT,
      translator TEXT,
      excerptLength INTEGER,
      authenticity TEXT,            -- e.g. "sahih" (mostly for hadith, but standardized)
      ingestedAt TEXT,
      version INTEGER DEFAULT 1,
      provenanced BOOLEAN DEFAULT 0,
      pendingReview BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS word_morph (
      id TEXT PRIMARY KEY,            -- e.g., "surah:ayah:wordIndex"
      surah INTEGER,
      ayah INTEGER,
      wordIndex INTEGER,
      surface TEXT,
      root TEXT,
      partOfSpeech TEXT,
      morphologicalTags TEXT,         -- JSON string
      gloss TEXT,
      source TEXT,
      reference TEXT,
      ingestedAt TEXT,
      version INTEGER DEFAULT 1       -- Content Versioning
    );

    CREATE TABLE IF NOT EXISTS scholar_review (
      id TEXT PRIMARY KEY,
      itemId TEXT,
      itemType TEXT,
      ingestedAt TEXT,
      uploadedBy TEXT,
      reviewStatus TEXT, -- pending|approved|rejected
      reviewer TEXT,
      reviewedAt TEXT,
      notes TEXT,
      sourceFiles TEXT
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      type TEXT, -- 'juz_per_week' | 'pages_per_day' | custom
      target INTEGER,
      startDate TEXT,
      recurrence JSON, 
      createdAt TEXT,
      enabled INTEGER
    );

    CREATE TABLE IF NOT EXISTS plan_progress (
      id TEXT PRIMARY KEY,
      planId TEXT,
      date TEXT,
      achieved INTEGER,
      target INTEGER
    );
        `);

  // RUN MIGRATION
  await migrateMemorizationSchema(db);
  await migrateReadingSessionsSchema(db);

  console.log('[Database] Initialized');
};

const migrateReadingSessionsSchema = async (db) => {
  try {
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(reading_sessions)`);
    const columns = tableInfo.map(c => c.name);

    // Check for new columns
    const needed = ['start_surah', 'start_ayah', 'end_surah', 'end_ayah', 'created_at', 'source'];
    const missing = needed.filter(c => !columns.includes(c));

    // Check if status exists (legacy column to remove/ignore)
    // If table exists but schema is totally different (old schema had 'surah_start', 'ayah_start' maybe? 
    // Previous logs showed 'surah_start', 'ayah_start'.

    if (missing.length === 0) return;

    console.log('[Database] Migrating reading_sessions table...', missing);

    await db.withTransactionAsync(async () => {
      // Simple strategy: Alter table for each missing column, or Recreate if too complex.
      // Old schema: id, start_at, end_at, duration_seconds, surah_start, ayah_start, surah_end, ayah_end, source, status
      // New schema: id, start_at, end_at, duration_seconds, start_surah, start_ayah, end_surah, end_ayah, source, created_at

      // We'll rename and recreate to be safe and clean up names
      await db.execAsync(`ALTER TABLE reading_sessions RENAME TO reading_sessions_old`);

      await db.execAsync(`
          CREATE TABLE reading_sessions (
            id TEXT PRIMARY KEY NOT NULL,
            start_at TEXT NOT NULL,
            end_at TEXT,
            duration_seconds INTEGER DEFAULT 0,
            start_surah INTEGER,
            start_ayah INTEGER,
            end_surah INTEGER,
            end_ayah INTEGER,
            source TEXT,
            created_at TEXT NOT NULL
          );
        `);

      // Migrate data (best effort mapping)
      // surah_start -> start_surah
      // ayah_start -> start_ayah
      // status column is dropped

      // Check if old table had surah_start (it might be the very old legacy one)
      // We will try to SELECT from old. If columns don't exist, we default to NULL.
      // Actually, easiest is to just copy common fields: id, start_at, end_at, duration_seconds, source.
      // And map surah_start -> start_surah IF it exists. 
      // Dynamic SQL is hard here.

      // Let's assume standard legacy: surah_start, ayah_start.
      // If the user's DB is in a weird state, this might fail. 
      // But 'reading_sessions has no column' usually means we are trying to INSERT new cols into OLD table.

      // Safe migration: Copy generic fields.
      await db.execAsync(`
            INSERT INTO reading_sessions (id, start_at, end_at, duration_seconds, source, created_at)
            SELECT id, start_at, end_at, duration_seconds, source, start_at FROM reading_sessions_old
        `);

      await db.execAsync(`DROP TABLE reading_sessions_old`);
    });
    console.log('[Database] reading_sessions migration done');

  } catch (e) {
    console.error('[Database] reading_sessions migration failed', e);
  }
};

const migrateMemorizationSchema = async (db) => {
  try {
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(memorization)`);
    const columns = tableInfo.map(c => c.name);

    // Check if migration needed (missing new fields)
    const hasNewFields = columns.includes('consecutiveCorrect') && columns.includes('totalReps');
    if (hasNewFields) return;

    console.log('[Database] Migrating memorization table...');

    await db.withTransactionAsync(async () => {
      // 1. Rename old table
      await db.execAsync(`ALTER TABLE memorization RENAME TO memorization_old`);

      // 2. Create new table (Strict Schema from spec)
      await db.execAsync(`
        CREATE TABLE memorization (
          id TEXT PRIMARY KEY,
          surah INTEGER NOT NULL,
          ayah INTEGER NOT NULL,
          page INTEGER DEFAULT 0,
          status TEXT NOT NULL,
          totalReps INTEGER DEFAULT 0,
          consecutiveCorrect INTEGER DEFAULT 0,
          easeFactor REAL DEFAULT 2.5,
          intervalDays INTEGER DEFAULT 0,
          nextReviewAt TEXT,
          lastAttemptAt TEXT,
          lastGrade INTEGER,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_memorization_next ON memorization(nextReviewAt);
      `);

      // 3. Migrate Data
      // Mapping 'streak' -> 'consecutiveCorrect'
      await db.execAsync(`
        INSERT INTO memorization (
          id, surah, ayah, page, status, totalReps, consecutiveCorrect, 
          easeFactor, intervalDays, nextReviewAt, lastAttemptAt, lastGrade, 
          createdAt, updatedAt
        )
        SELECT 
          id, surah, ayah, 0, status, 0, IFNULL(streak, 0),
          easeFactor, intervalDays, nextReviewAt, NULL, NULL,
          COALESCE(createdAt, datetime('now')), COALESCE(updatedAt, datetime('now'))
        FROM memorization_old
      `);

      // 4. Drop old table
      await db.execAsync(`DROP TABLE memorization_old`);
    });

    console.log('[Database] Migration successful');
  } catch (error) {
    console.error('[Database] Migration failed:', error);
    // Attempt rollback/recovery handled by transaction, but we log here.
    // Spec says: "If migration fails, rollback..." - DB transaction handles atomicity.
  }
};

export const readQuery = async (sql, params = []) => {
  const db = await getDB();
  return await db.getAllAsync(sql, params);
};

export const readFirstQuery = async (sql, params = []) => {
  const db = await getDB();
  return await db.getFirstAsync(sql, params);
};

export const writeQuery = async (sql, params = []) => {
  const db = await getDB();
  const result = await db.runAsync(sql, params);
  return result;
};

// Callback does not receive 'tx' in Next API style transactions
export const runTransaction = async (callback) => {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    await callback();
  });
};

export const dropTable = async (tableName) => {
  if (__DEV__) {
    const db = await getDB();
    await db.execAsync(`DROP TABLE IF EXISTS ${tableName}`);
  }
};
