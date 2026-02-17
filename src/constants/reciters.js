/**
 * Reciters configuration for Quran audio playback
 * All reciters are sourced from EveryAyah.com
 * URL format: https://everyayah.com/data/{RECITER_ID}/{SURAH}{AYAH}.mp3
 */

export const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Al-Afasy', nameAr: 'مشاري العفاسي' },
  { id: 'Yasser_Ad-Dussary_128kbps', name: 'Yasser Al-Dossary', nameAr: 'ياسر الدوسري' },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary', nameAr: 'محمود خليل الحصري' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman As-Sudais', nameAr: 'عبدالرحمن السديس' },
  { id: 'Abdul_Basit_Mujawwad_128kbps', name: 'Abdul Basit (Mujawwad)', nameAr: 'عبدالباسط عبدالصمد' },
  { id: 'MaherAlMuaiqly128kbps', name: 'Maher Al-Muaiqly', nameAr: 'ماهر المعيقلي' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saud Al-Shuraim', nameAr: 'سعود الشريم' },
];

export const DEFAULT_RECITER = 'Alafasy_128kbps';

/**
 * Get reciter display info by ID
 */
export const getReciterById = (id) => {
  return RECITERS.find(r => r.id === id) || RECITERS[0];
};
