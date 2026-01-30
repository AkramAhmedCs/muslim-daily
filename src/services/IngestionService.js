import { ingestTafsirEntry } from './TafsirService'; // Re-use the single entry logic for strict validation
// import { FileSystem } from 'expo-file-system'; // Stub for file reading

/**
 * Ingestion Service
 * Handles bulk import of religious content with strict provenance.
 * 
 * Strategy:
 * 1. Read source file (simulated streaming via batching)
 * 2. Validate strict schema per item
 * 3. Commit in small batches
 * 4. Log EVERYTHING
 */

export const streamIngestTafsir = async (sourceData, autoApprove = false) => {
  // sourceData: Array of objects (in real stream, this would be a file path reader)
  // For MVP: We assume sourceData is a parsed JSON array (memory constrained, but functional for < 50MB files on modern phones)
  // If files are huge, we MUST implement a native bridge or chunked download.

  const BATCH_SIZE = 50;
  const stats = {
    total: 0,
    inserted: 0,
    rejected: 0,
    errors: [],
    startTime: Date.now()
  };

  if (!Array.isArray(sourceData)) {
    stats.errors.push("Invalid Input: Expected JSON Array");
    return stats;
  }

  stats.total = sourceData.length;
  console.log(`[Ingestion] Starting ingestion of ${stats.total} items... (Auto-Approve: ${autoApprove})`);

  // Process in Batches
  for (let i = 0; i < sourceData.length; i += BATCH_SIZE) {
    const batch = sourceData.slice(i, i + BATCH_SIZE);

    // Process Batch sequentially to respect DB locks
    for (const item of batch) {
      try {
        // Strict Validation occurs inside ingestTafsirEntry
        await ingestTafsirEntry(item, autoApprove);
        stats.inserted++;
      } catch (error) {
        stats.rejected++;
        // Only log first 5 errors to avoid spam
        if (stats.rejected <= 5) {
          stats.errors.push(`Item ${i}: ${error.message}`);
        }
      }
    }

    // Optional: formatting/progress log
    if (i % 100 === 0) console.log(`[Ingestion] Processed ${i}/${stats.total}`);
  }

  // STRICT FAILURE CONDITION
  const failureRate = (stats.rejected / stats.total);
  if (failureRate > 0.01) {
    console.error(`[Ingestion] FAILED: Rejection rate ${(failureRate * 100).toFixed(2)}% exceeds 1% limit.`);
    stats.errors.push("CRITICAL: High rejection rate. Ingestion marked as failed.");
  }

  console.log(`[Ingestion] Complete. Inserted: ${stats.inserted}, Rejected: ${stats.rejected}`);
  return stats;
};

// Stub for Hadith
export const streamIngestHadith = async (sourceData) => {
  return { status: 'stub', msg: 'Hadith ingestion to be implemented' };
};
