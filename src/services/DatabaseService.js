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
        surah_start INTEGER,
        ayah_start INTEGER,
        surah_end INTEGER,
        ayah_end INTEGER,
        source TEXT,
        status TEXT DEFAULT 'completed' 
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
      `);

  // RUN MIGRATION
  await migrateMemorizationSchema(db);

  console.log('[Database] Initialized');
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
