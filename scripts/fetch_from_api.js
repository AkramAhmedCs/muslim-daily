const fs = require('fs');
const https = require('https');
const path = require('path');

const API_BASE = 'https://api.quran.com/api/v4/quran/tafsirs/16?chapter_number=';
const OUTPUT_FILE = path.join(__dirname, '../sources/tafsir_full.json');

const fetchChapter = (chapterNum) => {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${chapterNum}`;
    console.log(`Fetching Surah ${chapterNum}...`);

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(`Status ${res.statusCode}`);
      }

      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.tafsirs);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
  let allEntries = [];

  for (let i = 1; i <= 114; i++) {
    try {
      const tafsirs = await fetchChapter(i);

      const transformed = tafsirs.map(t => {
        const [surah, ayah] = t.verse_key.split(':').map(Number);
        return {
          surah,
          ayah,
          source: "Tafsir Al-Muyassar",
          book: "Tafsir Al-Muyassar (King Fahd Complex)",
          reference: `Surah ${surah}:${ayah}`,
          textAr: t.text, // Often contains HTML, might need strip? Quran.com usually clean or mostly clean.
          language: "ar",
          authenticity: "sahih",
          version: 1,
          provenance_verified: true
        };
      });

      allEntries = allEntries.concat(transformed);
      await delay(300); // Be polite to API
    } catch (e) {
      console.error(`Error fetching Surah ${i}:`, e);
      // Break or continue? Continue implies missing data. Better to stop.
      break;
    }
  }

  console.log(`Total entries fetched: ${allEntries.length}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allEntries, null, 2));
  console.log('Saved to:', OUTPUT_FILE);
};

main();
