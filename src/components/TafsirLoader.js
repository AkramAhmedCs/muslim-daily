import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { readFirstQuery } from '../services/DatabaseService';
import { streamIngestTafsir } from '../services/IngestionService';

const TafsirLoader = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const checkAndLoad = async () => {
      try {
        // 1. Check for ANY pending items (Fix for existing users)
        const pendingResult = await readFirstQuery('SELECT COUNT(*) as c FROM tafsir_entries WHERE pendingReview=1');
        if (pendingResult && pendingResult.c > 0) {
          setLoading(true);
          setStatus(`Fixing ${pendingResult.c} pending items...`);
          const { approveAllPending } = require('../services/TafsirService');
          await approveAllPending('AutoFix');
          setStatus('Fixed!');
          setTimeout(() => setLoading(false), 2000);
          return;
        }

        // 2. Check if we already have Tafsir (Empty DB check)
        const countResult = await readFirstQuery('SELECT COUNT(*) as c FROM tafsir_entries');
        if (countResult && countResult.c > 100) {
          // Already loaded (assuming >100 verses means meaningful data)
          return;
        }

        setLoading(true);
        setStatus('Initializing Quran Tafsir...');

        // 3. Load Source File dynamically
        // NOTE: In production, consider doing this in a background thread or checking only once.
        const fullData = require('../../sources/tafsir_full.json');

        setStatus(`Installing ${fullData.length} Tafsir entries...`);

        // 4. Ingest with Auto-Approve = true
        await streamIngestTafsir(fullData, true);

        setStatus('Done!');
      } catch (e) {
        console.error('Tafsir Auto-Load Error:', e);
      } finally {
        if (status !== 'Fixed!') setLoading(false);
      }
    };

    checkAndLoad();
  }, []);

  if (!loading) return null;

  return (
    <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#333', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', opacity: 0.9 }}>
      <ActivityIndicator color="#fff" size="small" />
      <Text style={{ color: '#fff', marginLeft: 10, fontSize: 12 }}>{status}</Text>
    </View>
  );
};

export default TafsirLoader;
