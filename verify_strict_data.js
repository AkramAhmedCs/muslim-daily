const quran = require('./data/quran_full.json');
const fs = require('fs');
const path = require('path');

const runDiagnostics = () => {
  console.log('--- STRICT DIAGNOSTICS ---');

  // 1. Surah 2 Check
  const surah2 = quran.surahs.find(s => s.number === 2);
  if (surah2) {
    const ayah1 = surah2.ayahs[0];
    const ayah2 = surah2.ayahs[1];

    console.log(`[DIAG] Surah 2 Ayah 1 Raw: "${ayah1.text}"`);
    console.log(`[DIAG] Surah 2 Ayah 1 Len: ${ayah1.text.length}`);
    console.log(`[DIAG] Surah 2 Ayah 1 Codes: ${ayah1.text.split('').map(c => c.charCodeAt(0)).join(',')}`);

    console.log(`[DIAG] Surah 2 Ayah 2 Raw: "${ayah2.text}"`);
  }

  // 2. Surah 1 Check
  const surah1 = quran.surahs.find(s => s.number === 1);
  if (surah1) {
    const ayah1 = surah1.ayahs[0];
    console.log(`[DIAG] Surah 1 Ayah 1 Raw: "${ayah1.text}"`);
    console.log(`[DIAG] Surah 1 Ayah 1 Codes: ${ayah1.text.split('').map(c => c.charCodeAt(0)).join(',')}`);
  }

  // 3. Metadata Check
  console.log('[DIAG] Checking Key Metadata...');
  console.log(`[DIAG] Has Basmalah Field in Surah 2? ${'basmalah' in surah2 || 'bismillah' in surah2}`);

  // 4. Tafsir Availability Check
  const { readQuery } = require('./src/services/DatabaseService');
  // Mocking DB access for script context if needed, but since we run this with node, we might need to mock or just warn.
  console.log('[DIAG] To verify Tafsir: Run `npx expo start` and check logs for [Tafsir] entries.');

  console.log('--- END DIAGNOSTICS ---');
};

runDiagnostics();
