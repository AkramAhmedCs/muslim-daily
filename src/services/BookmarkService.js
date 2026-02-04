import { readQuery, writeQuery } from './DatabaseService';
import * as Crypto from 'expo-crypto';

const getUUID = () => Crypto.randomUUID();
const getISO = () => new Date().toISOString();

export const addBookmark = async ({ surah, ayah, page, label = '' }) => {
  try {
    const id = getUUID();
    const now = getISO();

    await writeQuery(
      `INSERT INTO bookmarks (id, surah, ayah, page, label, created_at, last_opened_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, surah, ayah, page || null, label, now, now]
    );

    console.log('[Bookmark] Added:', id);
    return id;
  } catch (error) {
    console.error('[Bookmark] Add Error:', error);
    throw error;
  }
};

export const getBookmarks = async () => {
  try {
    // getAllAsync returns array of objects directly
    const items = await readQuery(
      `SELECT * FROM bookmarks ORDER BY last_opened_at DESC`
    );
    return items;
  } catch (error) {
    console.error('[Bookmark] Get Error:', error);
    return [];
  }
};

export const deleteBookmark = async (id) => {
  try {
    await writeQuery(`DELETE FROM bookmarks WHERE id = ?`, [id]);
  } catch (error) {
    console.error('[Bookmark] Delete Error:', error);
  }
};

export const updateBookmarkLastOpened = async (id) => {
  try {
    const now = getISO();
    await writeQuery(
      `UPDATE bookmarks SET last_opened_at = ? WHERE id = ?`,
      [now, id]
    );
  } catch (error) {
    console.error('[Bookmark] Update Error:', error);
  }
};

export const isBookmarked = async (surah, ayah) => {
  try {
    const result = await readQuery(
      `SELECT id FROM bookmarks WHERE surah = ? AND ayah = ?`,
      [surah, ayah]
    );
    // Return the ID if exists, otherwise null
    return result.length > 0 ? result[0].id : null;
  } catch (error) {
    return null;
  }
};

export const clearAllBookmarks = async () => {
  try {
    await writeQuery(`DELETE FROM bookmarks`);
    return true;
  } catch (error) {
    console.error('[Bookmark] Clear All Error:', error);
    return false;
  }
};
