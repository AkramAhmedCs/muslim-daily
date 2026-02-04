/**
 * HifzStructures.js
 * Documents the expected data structures for Hifz (memorization) feature
 */

/**
 * Expected Memorized Verse Structure
 * 
 * RECOMMENDED FORMAT (Option A):
 * {
 *   id: string,                    // Unique identifier (e.g., "hifz_2_142_1234567890")
 *   surah: {                       // Surah object with full details
 *     number: number,              // Surah number (1-114)
 *     englishName: string,         // English name (e.g., "Al-Baqarah")
 *     arabicName: string,          // Arabic name (optional)
 *     revelationType: string       // "Meccan" or "Medinan" (optional)
 *   },
 *   ayah: number,                  // Ayah number within surah
 *   text: string,                  // Arabic text of the verse
 *   translation: string,           // Translation (optional)
 *   dateAdded: number,             // Timestamp when added
 *   reviewCount: number,           // Number of times reviewed
 *   lastReviewed: number | null,  // Last review timestamp
 *   mastered: boolean,             // Whether marked as mastered
 *   notes: string                  // User notes (optional)
 * }
 * 
 * LEGACY FORMAT (Option B - for backward compatibility):
 * {
 *   id: string,
 *   surahNumber: number,           // Direct surah number
 *   ayahNumber: number,            // Direct ayah number
 *   text: string,
 *   dateAdded: number
 * }
 */

/**
 * Validate if a verse object is valid for memorization
 * Handles both current and legacy formats
 * 
 * @param {Object} verse - Verse object to validate
 * @returns {boolean} True if valid
 */
export const isValidMemorizedVerse = (verse) => {
  // Check if verse exists and is an object
  if (!verse || typeof verse !== 'object') {
    // console.warn('[HifzValidation] Verse is not an object:', verse);
    return false;
  }

  // Option A: Has surah object
  const hasSurahObject =
    verse.surah &&
    typeof verse.surah === 'object' &&
    typeof verse.surah.number === 'number' &&
    verse.surah.number >= 1 &&
    verse.surah.number <= 114;

  // Option B: Has surahNumber (legacy)
  const hasSurahNumber =
    typeof verse.surahNumber === 'number' &&
    verse.surahNumber >= 1 &&
    verse.surahNumber <= 114;

  // Option C: Has surah as number (Direct DB format)
  const hasSurahDirect =
    typeof verse.surah === 'number' &&
    verse.surah >= 1 &&
    verse.surah <= 114;

  // Must have one or the other
  if (!hasSurahObject && !hasSurahNumber && !hasSurahDirect) {
    return false;
  }

  // Check ayah
  const hasValidAyah =
    (typeof verse.ayah === 'number' && verse.ayah > 0) ||
    (typeof verse.ayahNumber === 'number' && verse.ayahNumber > 0);

  if (!hasValidAyah) {
    return false;
  }

  return true;
};

/**
 * Normalize verse object to standard format
 * Converts legacy format to current format
 * 
 * @param {Object} verse - Verse object (any format)
 * @param {Array} surahsList - List of surahs for lookup
 * @returns {Object} Normalized verse object
 */
export const normalizeMemorizedVerse = (verse, surahsList) => {
  if (!isValidMemorizedVerse(verse)) {
    throw new Error('Cannot normalize invalid verse');
  }

  // If already in correct format with surah object, return as-is
  if (verse.surah && typeof verse.surah === 'object') {
    return {
      ...verse,
      ayah: verse.ayah || verse.ayahNumber, // Ensure consistent ayah field
    };
  }

  // Convert legacy format (surahNumber) to current format
  const surahNumber = verse.surahNumber || verse.surah;
  const ayahNumber = verse.ayahNumber || verse.ayah;

  // Look up surah details
  const surahDetails = surahsList ? surahsList.find(s => s.number === surahNumber) : null;

  return {
    ...verse,
    surah: surahDetails || {
      number: surahNumber,
      englishName: `Surah ${surahNumber}`,
      arabicName: '',
      revelationType: 'Unknown',
    },
    ayah: ayahNumber,
    // Remove legacy fields
    surahNumber: undefined,
    ayahNumber: undefined,
  };
};

/**
 * Extract surah number from verse (handles both formats)
 */
export const getSurahNumber = (verse) => {
  if (verse?.surah && typeof verse.surah === 'object') {
    return verse.surah.number;
  }
  if (typeof verse?.surah === 'number') {
    return verse.surah;
  }
  return verse?.surahNumber || null;
};

/**
 * Extract ayah number from verse (handles both formats)
 */
export const getAyahNumber = (verse) => {
  return verse?.ayah || verse?.ayahNumber || null;
};
