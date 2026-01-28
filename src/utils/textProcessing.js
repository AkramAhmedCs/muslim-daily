/**
 * Normalizes Arabic text for text processing
 * Handles Unicode variations, diacritics, and normalization for robust comparison
 */
export const normalizeArabicText = (text) => {
  if (!text) return '';

  // Remove all diacritical marks (harakat)
  // Unicode ranges: 0x064B-0x0652 (common diacritics), 0x0653-0x065F (additional)
  let normalized = text.replace(/[\u064B-\u065F]/g, '');

  // Normalize all Alif variations to plain Alif
  // ٱ (Wasla), آ (Madda), أ (Hamza above), إ (Hamza below) -> ا
  normalized = normalized.replace(/[ٱآأإ]/g, 'ا');

  // Normalize Ta Marbuta variants [ة] -> ه
  normalized = normalized.replace(/[ة]/g, 'ه');

  // Remove Tatweel (elongation)
  normalized = normalized.replace(/ـ/g, '');

  // Remove zero-width characters
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Normalize whitespace (collapse to single space and trim)
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
};

/**
 * Removes Bismillah from the beginning of text if present
 * Returns cleaned text WITHOUT modifying the original source
 */
export const removeBismillahFromText = (text) => {
  if (!text) return '';

  // Normalized Bismillah pattern (without diacritics, plain Alif)
  const BISMILLAH_NORMALIZED = 'بسم الله الرحمن الرحيم';

  // Normalize the text to check basic existence
  const normalizedInput = normalizeArabicText(text);

  // If it doesn't start with Bismillah (robust check), return original text
  if (!normalizedInput.startsWith(BISMILLAH_NORMALIZED)) {
    return text;
  }

  // Find where Bismillah ends in the ORIGINAL text
  // We basically look for the longest prefix that normalizes to Bismillah
  // This consumes diacritics and spaces attached to the end of the phrase
  let lastMatchIndex = -1;
  const targetLength = BISMILLAH_NORMALIZED.length;

  for (let i = 0; i <= text.length; i++) {
    // Determine cutoff for inspection (optimization: check chunks after min length)
    // But simplistic 0..N loop is safest
    const sub = text.substring(0, i);
    const norm = normalizeArabicText(sub);

    if (norm === BISMILLAH_NORMALIZED) {
      lastMatchIndex = i;
    } else if (norm.length > targetLength) {
      // optimization: we exceeded the target phrase
      break;
    }
  }

  if (lastMatchIndex !== -1) {
    // Return text after the Bismillah prefix
    // trim() handles any remaining edge case spacing
    return text.substring(lastMatchIndex).trim();
  }

  return text;
};
