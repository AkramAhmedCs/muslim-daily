import { documentDirectory, getInfoAsync, makeDirectoryAsync, downloadAsync } from 'expo-file-system';
import { readFirstQuery, writeQuery } from './DatabaseService';
import * as Crypto from 'expo-crypto';

const CACHE_DIR = documentDirectory + 'audio_cache/';
const DEFAULT_RECITER = 'Alafasy_128kbps'; // EveryAyah standard

// Ensure cache directory exists
const ensureCacheDir = async () => {
  try {
    const info = await getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.warn('[AudioService] ensureCacheDir warning:', error);
    // Try to proceed even if check fails, directory might exist
  }
};

/**
 * Get the playable URL (Local file if exists, otherwise Remote stream)
 */
export const getPlayableUrl = async (surah, ayah, reciter = DEFAULT_RECITER) => {
  await ensureCacheDir();

  // 1. Check DB/Filesystem for local cache
  const cached = await readFirstQuery(
    `SELECT localPath FROM audio_cache WHERE surah = ? AND ayah = ? AND reciter = ?`,
    [surah, ayah, reciter]
  );

  if (cached && cached.localPath) {
    try {
      const fileInfo = await getInfoAsync(cached.localPath);
      if (fileInfo.exists) {
        console.log('[Audio] Playing from cache:', cached.localPath);
        return cached.localPath;
      } else {
        // DB Record exists but file missing? Clean up.
        await writeQuery(`DELETE FROM audio_cache WHERE surah = ? AND ayah = ?`, [surah, ayah]);
      }
    } catch (e) {
      console.warn('[Audio] Failed to check local file info', e);
      // Fallback to remote
    }
  }

  // 2. Return Remote URL
  const paddedSurah = String(surah).padStart(3, '0');
  const paddedAyah = String(ayah).padStart(3, '0');
  return `https://everyayah.com/data/${reciter}/${paddedSurah}${paddedAyah}.mp3`;
};

/**
 * Downloads an ayah for offline use
 */
export const downloadAyah = async (surah, ayah, reciter = DEFAULT_RECITER) => {
  await ensureCacheDir();

  const paddedSurah = String(surah).padStart(3, '0');
  const paddedAyah = String(ayah).padStart(3, '0');
  const remoteUrl = `https://everyayah.com/data/${reciter}/${paddedSurah}${paddedAyah}.mp3`;
  const filename = `${reciter}_${paddedSurah}${paddedAyah}.mp3`;
  const localUri = CACHE_DIR + filename;

  try {
    const downloadRes = await downloadAsync(remoteUrl, localUri);

    if (downloadRes.status === 200) {
      const id = Crypto.randomUUID();
      const now = new Date().toISOString();

      // Remove old if exists just in case
      await writeQuery(`DELETE FROM audio_cache WHERE surah = ? AND ayah = ? AND reciter = ?`, [surah, ayah, reciter]);

      // Insert new record
      await writeQuery(
        `INSERT INTO audio_cache (id, surah, ayah, reciter, url, localPath, size, downloadedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, surah, ayah, reciter, remoteUrl, localUri, 0, now]
      );
      console.log('[Audio] Downloaded:', localUri);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Audio] Download failed:', error);
    return false;
  }
};

/**
 * Downloads an entire Surah
 */
export const downloadSurah = async (surahNumber, ayahsCount, onProgress, reciter = DEFAULT_RECITER) => {
  let successCount = 0;
  for (let i = 1; i <= ayahsCount; i++) {
    const success = await downloadAyah(surahNumber, i, reciter);
    if (success) successCount++;
    if (onProgress) onProgress(i / ayahsCount);
  }
  return successCount === ayahsCount;
};

/**
 * Check if a Surah is fully downloaded
 */
export const isSurahDownloaded = async (surahNumber, ayahsCount, reciter = DEFAULT_RECITER) => {
  const result = await readFirstQuery(
    `SELECT COUNT(*) as c FROM audio_cache WHERE surah = ? AND reciter = ?`,
    [surahNumber, reciter]
  );
  return result && result.c >= ayahsCount;
};

export const getCacheSize = async () => {
  // This is approximate
  const result = await readFirstQuery(`SELECT COUNT(*) as c FROM audio_cache`);
  return result ? result.c : 0;
};
