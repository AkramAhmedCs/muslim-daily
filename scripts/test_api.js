const https = require('https');

const url = 'https://raw.githubusercontent.com/00AhmedMokhtar00/QuranTafseer-ar-json/master/tafseer.json';

https.get(url, res => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      console.log('Raw Data:', data.substring(0, 1000)); // Print first 1000 chars
      const json = JSON.parse(data);
      console.log('Full JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.error('Parse Error:', e.message);
    }
  });
});
