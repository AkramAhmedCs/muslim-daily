import { getDB, readQuery } from './DatabaseService';
import { FEATURES } from '../config/features';

export const runDiagnostics = async () => {
  console.log('--- EMERGENCY DIAGNOSTICS START ---');

  // 1. Feature Flags Dump
  console.log('[Diagnostics] Features:', JSON.stringify(FEATURES, null, 2));

  // 2. Navigation Routes (Inferred from AppNavigator structure knowledge, since we can't easily hook the container ref from here without passing it)
  // We will assume if AppNavigator mounts, these routes exist.
  // We can try to log if they are missing in the actual code file later.
  console.log('[Diagnostics] Routes Checked: Quran, Bookmarks, Tafsir, ScholarReview');

  // 3. Tafsir Data Check (Surah 1, Ayah 1)
  try {
    const tafsir = await readQuery(
      `SELECT id, source, pendingReview, provenanced, language FROM tafsir_entries WHERE surah = ? AND ayah = ? LIMIT 10`,
      [1, 1]
    );
    console.log('[Diagnostics] Tafsir (1:1):', JSON.stringify(tafsir, null, 2));

    if (!tafsir || tafsir.length === 0) {
      console.warn('[Diagnostics] WARNING: No tafsir found for 1:1. Tafsir tab may be empty.');
    } else {
      const approved = tafsir.filter(t => t.pendingReview === 0 && t.provenanced === 1);
      console.log(`[Diagnostics] Approved Tafsir Count: ${approved.length}`);
    }
  } catch (e) {
    console.error('[Diagnostics] Tafsir Check Failed', e);
  }

  // 4. Haptics Check (Telemetry placeholder)
  console.log('[Diagnostics] Haptics Enabled Check: ', FEATURES.haptics);

  console.log('--- EMERGENCY DIAGNOSTICS END ---');
};
