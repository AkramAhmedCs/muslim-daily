import quranData from '../../data/quran_full.json';
import { readFirstQuery } from './DatabaseService';

// Basic caching for juz page ranges
const JUZ_PAGE_MAPPING = {};
let isMappingInitialized = false;

const initJuzMapping = () => {
  if (isMappingInitialized) return;

  const tempMapping = {};

  quranData.surahs.forEach(surah => {
    surah.ayahs.forEach(ayah => {
      const juz = ayah.juz;
      const page = ayah.page;

      if (!tempMapping[juz]) {
        tempMapping[juz] = { min: page, max: page, totalAyahs: 0 };
      }

      if (page < tempMapping[juz].min) tempMapping[juz].min = page;
      if (page > tempMapping[juz].max) tempMapping[juz].max = page;

      tempMapping[juz].totalAyahs++;
    });
  });

  Object.keys(tempMapping).forEach(juz => {
    const data = tempMapping[juz];
    data.totalPages = data.max - data.min + 1;
    JUZ_PAGE_MAPPING[juz] = data;
  });

  isMappingInitialized = true;
  console.log('[JuzService] Mapping initialized');
};

initJuzMapping();

const getTodayString = () => new Date().toISOString().split('T')[0];

export const getJuzInfo = (juzNumber) => {
  return JUZ_PAGE_MAPPING[juzNumber] || null;
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
