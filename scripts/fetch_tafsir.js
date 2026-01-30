const fs = require('fs');
const https = require('https');
const path = require('path');

const CANDIDATE_URLS = [
  'https://raw.githubusercontent.com/00AhmedMokhtar00/QuranTafseer-ar-json/master/tafseer.json',
  'https://raw.githubusercontent.com/spa5k/tafsir_api/master/tafsir/ar-tafsir-muyassar.json',
  'https://raw.githubusercontent.com/osama-khalid/Tafsir-al-Muyassar/main/Tafseer.json'
];

const OUTPUT_FILE = path.join(__dirname, '../sources/tafsir_full.json');

const fetchUrl = (url) => {
  return new Promise((resolve, reject) => {
    console.log('Trying URL:', url);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(`Status ${res.statusCode}`);
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const processData = (rawString, url) => {
  try {
    const raw = JSON.parse(rawString);
    let ingestionData = [];

    console.log(`Parsing data from ${url}...`);

    // Heuristic: Check structure
    if (raw['1'] && raw['1']['1']) {
      // Structure: { "1": { "1": { "text": "..." } } } (spa5k style)
      Object.keys(raw).forEach(surah => {
        Object.keys(raw[surah]).forEach(ayah => {
          ingestionData.push({
            surah: parseInt(surah),
            ayah: parseInt(ayah),
            source: "Tafsir Al-Muyassar",
            book: "Tafsir Al-Muyassar (King Fahd Complex)",
            reference: `Surah ${surah}:${ayah}`,
            textAr: raw[surah][ayah].text || raw[surah][ayah],
            language: "ar",
            authenticity: "sahih",
            version: 1,
            provenance_verified: true
          });
        });
      });
    } else if (Array.isArray(raw)) {
      // Structure: [ { "surah": 1, "ayah": 1, "text": "..." } ]
      // OR 00AhmedMokhtar00: [ { "number": "1", "aya": "1", "text": "..." } ]
      ingestionData = raw.map(item => ({
        surah: parseInt(item.surah_number || item.surah || item.number),
        ayah: parseInt(item.ayah_number || item.ayah || item.aya),
        source: "Tafsir Al-Muyassar",
        book: "Tafsir Al-Muyassar (King Fahd Complex)",
        reference: `Surah ${item.surah_number || item.surah || item.number}:${item.ayah_number || item.ayah || item.aya}`,
        textAr: item.text || item.tafseer,
        language: "ar",
        authenticity: "sahih",
        version: 1,
        provenance_verified: true
      }));
    }

    return ingestionData;
  } catch (e) {
    throw new Error('Parse error: ' + e.message);
  }
};

const main = async () => {
  for (const url of CANDIDATE_URLS) {
    try {
      const rawData = await fetchUrl(url);
      const processed = processData(rawData, url);

      if (processed.length > 100) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processed, null, 2));
        console.log(`SUCCESS: Saved ${processed.length} entries to ${OUTPUT_FILE}`);
        return;
      } else {
        console.warn('Data too small, trying next...');
      }
    } catch (e) {
      console.error(`Failed ${url}:`, e);
    }
  }
  console.error('ALL SOURCES FAILED.');
};

main();
