import quranData from '../../data/quran_full.json';
import { readFirstQuery } from './DatabaseService';

// Basic caching for juz page ranges
const JUZ_PAGE_MAPPING = {};
const JUZ_STATS_CACHE = {};
let isMappingInitialized = false;

const initJuzMapping = () => {
  if (isMappingInitialized) return;

  const tempMapping = {};
  const stats = {};

  // Initialize all 30 Juzs
  for (let i = 1; i <= 30; i++) {
    stats[i] = {
      totalVerses: 0,
      firstVerse: null,
      lastVerse: null,
      verses: [] // Keep a lightweight ref or count
    };
  }

  quranData.surahs.forEach(surah => {
    surah.ayahs.forEach((ayah, ayahIndex) => {
      const juz = ayah.juz;
      const page = ayah.page;

      // Existing Page Mapping Logic
      if (!tempMapping[juz]) {
        tempMapping[juz] = { min: page, max: page, totalAyahs: 0 };
      }
      if (page < tempMapping[juz].min) tempMapping[juz].min = page;
      if (page > tempMapping[juz].max) tempMapping[juz].max = page;
      tempMapping[juz].totalAyahs++;

      // New Verse Stats Logic
      if (stats[juz]) {
        stats[juz].totalVerses++;

        const verseRef = {
          surah: surah.number,
          ayah: ayah.number,
          globalIndex: 0 // Optional, if we tracked global index
        };

        if (!stats[juz].firstVerse) stats[juz].firstVerse = verseRef;
        stats[juz].lastVerse = verseRef; // Updates until the end
        stats[juz].verses.push(verseRef);
      }
    });
  });

  // Finalize Page Mapping
  Object.keys(tempMapping).forEach(juz => {
    const data = tempMapping[juz];
    data.totalPages = data.max - data.min + 1;
    JUZ_PAGE_MAPPING[juz] = data;
  });

  // Finalize Stats Cache
  Object.assign(JUZ_STATS_CACHE, stats);

  isMappingInitialized = true;
  console.log('[JuzService] Mapping and Stats initialized');
};

initJuzMapping();

const getTodayString = () => new Date().toISOString().split('T')[0];

export const getJuzInfo = (juzNumber) => {
  return JUZ_PAGE_MAPPING[juzNumber] || null;
};

/**
 * Get detailed progress for specific verse in its Juz
 */
export const getJuzProgressForAyah = (surahNumber, ayahNumber) => {
  if (!isMappingInitialized) initJuzMapping();

  // Find the verse to get its Juz
  // Note: O(1) lookup if we assume standard structure, but safe to search if needed
  // Since we already have quranData, we can look it up directly.
  const surah = quranData.surahs.find(s => s.number === surahNumber);
  if (!surah) return null;

  const ayah = surah.ayahs.find(a => a.number === ayahNumber);
  if (!ayah) return null;

  const currentJuz = ayah.juz;
  const stats = JUZ_STATS_CACHE[currentJuz];

  if (!stats) return null;

  // Find position in Juz
  // We stored all verses of the Juz in order in `stats[juz].verses`
  // So we just find the index there.
  const positionInJuz = stats.verses.findIndex(v => v.surah === surahNumber && v.ayah === ayahNumber);

  if (positionInJuz === -1) return null;

  const versesRemaining = stats.totalVerses - positionInJuz - 1;
  const versesRead = positionInJuz + 1;
  const percentComplete = (versesRead / stats.totalVerses) * 100;

  return {
    juz: currentJuz,
    versesRemaining,
    totalVersesInJuz: stats.totalVerses,
    percentComplete: Math.round(percentComplete * 10) / 10,
    isFirstVerse: positionInJuz === 0,
    isLastVerse: positionInJuz === stats.totalVerses - 1
  };
};

export const formatJuzProgress = (progress, language = 'en') => {
  if (!progress) return '';

  const { juz, versesRemaining, isLastVerse, isFirstVerse } = progress;

  if (isFirstVerse && language === 'en') return `Starting Juz ${juz}`;
  if (isFirstVerse && language === 'ar') return `بداية الجزء ${juz}`;

  if (isLastVerse && language === 'en') return `Juz ${juz} complete! ✓`;
  if (isLastVerse && language === 'ar') return `الجزء ${juz} مكتمل ✓`;

  if (language === 'ar') return `الجزء ${juz} : ${versesRemaining} آية متبقية`;

  const versesText = versesRemaining === 1 ? 'verse' : 'verses';
  return `Juz ${juz} : ${versesRemaining} ${versesText} left`;
};

export const getJuzProgress = async (juzNumber, dateString = null) => {
  if (!dateString) dateString = getTodayString();

  const juzInfo = getJuzInfo(juzNumber);
  if (!juzInfo) return { pagesRead: 0, totalPages: 0, progressPercent: 0 };

  const { min, max, totalPages } = juzInfo;

  try {
    // Use readFirstQuery to get single row result
    const result = await readFirstQuery(
      `SELECT COUNT(DISTINCT page) as count 
       FROM page_reads 
       WHERE date_read = ? AND page >= ? AND page <= ?`,
      [dateString, min, max]
    );

    const pagesRead = result ? result.count : 0;
    const progressPercent = Math.floor((pagesRead / totalPages) * 100);

    return {
      pagesRead,
      totalPages,
      progressPercent
    };
  } catch (error) {
    console.error(`[JuzService] Error getting progress for Juz ${juzNumber}:`, error);
    return { pagesRead: 0, totalPages, progressPercent: 0 };
  }
};
