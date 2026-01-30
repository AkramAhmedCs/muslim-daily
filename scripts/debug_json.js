const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../sources/tafsir_full.json');

try {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);
  console.log('Total Items:', data.length);
  console.log('First Item:', JSON.stringify(data[0], null, 2));

  // Simulate Check
  const ALLOWED_SOURCES = [
    'Tafsir Ibn Kathir',
    'Tafsir Al-Tabari',
    'Tafsir As-Sa\'di',
    'Tafsir Al-Muyassar',
    'Sahih al-Bukhari',
    'Sahih Muslim'
  ];

  const item = data[0];
  const source = item.source;
  console.log(`Source '${source}' allowed?`, ALLOWED_SOURCES.includes(source));

} catch (e) {
  console.error('Error:', e.message);
}
