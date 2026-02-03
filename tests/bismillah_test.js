const { hasBasmalaPrefix, stripBasmalaPrefix, normalizeText } = require('../src/utils/BismillahHelper');

// Mock data based on Tanzil
const SAMPLES = [
  { name: 'Standard (Tanzil)', text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", expected: true },
  { name: 'Plain (Simple)', text: "بسم الله الرحمن الرحيم", expected: false }, // Our helper is strict on Uthmani variants unless added
  { name: 'With Text (Ayah 1)', text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الٓمٓ", expected: true },
  { name: 'Ayah 2 (No Basmalah)', text: "ذَٰلِكَ ٱلْكِتَٰبُ", expected: false }
];

// Add the variants we explicitly support in Helper
const VARIANTS = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ",
  "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ"
];

console.log('--- BISMILLAH UNIT TEST ---');

let passed = 0;
let total = 0;

function assert(condition, label) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${label}`);
  } else {
    console.error(`[FAIL] ${label}`);
  }
}

SAMPLES.forEach(s => {
  const res = hasBasmalaPrefix(s.text);
  assert(res === s.expected, `${s.name}: Expected ${s.expected}, Got ${res}`);

  if (res) {
    const stripped = stripBasmalaPrefix(s.text);
    console.log(`   -> Stripped: "${stripped}"`);
    assert(!hasBasmalaPrefix(stripped), `Stripped text should not have prefix`);
  }
});

// Test Variants
VARIANTS.forEach((v, i) => {
  assert(hasBasmalaPrefix(v), `Variant ${i} detection`);
});

// Test Normalization stability
const raw = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const norm = normalizeText(raw);
assert(raw === norm, "Normalization check runs");

console.log(`\nResult: ${passed}/${total} Passed`);
