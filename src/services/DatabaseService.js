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
    `);
  console.log('[Database] Initialized');
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
