# Religious Content Sources

This directory contains the strict source files for ingestion.

**Rule:** DO NOT ADD FILES HERE UNLESS THEY ARE FROM THE ALLOWLIST.

## Allowed Sources
1.  **Tafsir Ibn Kathir** (Verified JSON)
2.  **Tafsir Al-Tabari**
3.  **Tafsir As-Sa'di**
4.  **Tanzil Quran Text** (Managed separately in `data/`)

## File Requirements
- Format: JSON Array or JSONL
- Schema: Must match `tafsir_entry` strict schema (see PROVENANCE.md or implementation plan)
- Integrity: Must have a matching `.sha256` checksum file if possible.

## Ingestion
Run the ingestion pipeline via the App's Dev Menu or Ingestion Script.
Items will be added to `scholar_review` queue as `pending`.
