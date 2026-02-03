/**
 * Bismillah Helper
 * Standardizes detection and stripping of the Basmalah for display.
 * Strict rules: 
 * - Only detects at START of string.
 * - Handles NFC normalization.
 * - Supports specific variants found in Tanzil/Uthmani text.
 */

// Common Uthmani Basmalah variants
const BASMALAH_VARIANTS = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", // The one from my diagnostics
  "بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ", // Simple
  "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ", // Simple no dagger
];

export const normalizeText = (text) => {
  if (!text) return "";
  return text.normalize("NFC").trim();
};

export const hasBasmalaPrefix = (text) => {
  if (!text) return false;
  const norm = normalizeText(text);
  return BASMALAH_VARIANTS.some(b => norm.startsWith(normalizeText(b)));
};

export const stripBasmalaPrefix = (text) => {
  if (!text) return text;
  const norm = normalizeText(text);

  for (const b of BASMALAH_VARIANTS) {
    const normB = normalizeText(b);
    if (norm.startsWith(normB)) {
      // Remove it and any following whitespace
      return norm.slice(normB.length).trim();
    }
  }
  return text;
};
