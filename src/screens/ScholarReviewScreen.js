import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import { isFeatureEnabled } from '../config/features';
import { streamIngestTafsir } from '../services/IngestionService';
import { getPendingReviews, approveItem, rejectItem } from '../services/TafsirService';
import { Ionicons } from '@expo/vector-icons';
// import sampleData from '../../sources/tafsir_muyassar_sample.json'; // Removed in favor of full dynamic load

const ScholarReviewScreen = () => {
  const { theme } = useTheme();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // ID of item being processed

  // Constraint: Guard with feature flag
  if (!isFeatureEnabled('scholar_review')) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.error, fontSize: 18 }}>Access Denied</Text>
      </View>
    );
  }

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingReviews();
      setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleIngestTest = async () => {
    setLoading(true);
    try {
      // Dynamic require to avoid bundling 10MB JSON in initial load
      // Note: In a real app, we'd read this from FS, but for this dev setup, require is easiest.
      const fullData = require('../../sources/tafsir_full.json');
      alert(`Starting Ingestion of ${fullData.length} verses (Full Quran)... Please wait.`);

      const stats = await streamIngestTafsir(fullData);

      alert(`Ingestion Complete!\nInserted: ${stats.inserted}\nRejected: ${stats.rejected}\nErrors: ${stats.errors.length}`);
      loadReviews();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await approveItem(id, 'Admin'); // 'Admin' would be replaced by authenticated user name in real app
      // Optimistic update
      setReviews(prev => prev.filter(item => item.reviewId !== id));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await rejectItem(id, 'Admin', 'Manual Rejection');
      setReviews(prev => prev.filter(item => item.reviewId !== id));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>{item.source}</Text>
        </View>
        <Text style={[styles.reference, { color: theme.textSecondary }]}>{item.reference}</Text>
      </View>

      <Text style={[styles.bookName, { color: theme.textSecondary }]}>{item.book}</Text>

      <Text style={[styles.previewText, { color: theme.text }]} numberOfLines={4}>
        {item.textEn || item.textAr}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { borderColor: theme.error, marginRight: 10 }]}
          onPress={() => handleReject(item.reviewId)}
          disabled={actionLoading === item.reviewId}
        >
          <Ionicons name="close" size={20} color={theme.error} />
          <Text style={{ color: theme.error, marginLeft: 4 }}>Reject</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => handleApprove(item.reviewId)}
          disabled={actionLoading === item.reviewId}
        >
          {actionLoading === item.reviewId ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={{ color: 'white', marginLeft: 4 }}>Approve</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Scholar Verification</Text>
        <View style={{ flexDirection: 'row' }}>
          <Pressable onPress={() => {
            import('../services/TafsirService').then(async (s) => {
              if (confirm('Approve ALL pending items? This cannot be undone.')) return; // React Native doesn't support confirm well, use Alert
              Alert.alert('Confirm Bulk Approval', 'Are you sure you want to approve ALL pending items?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Approve All',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      await s.approveAllPending('Admin');
                      loadReviews();
                      alert('All items approved!');
                    } catch (e) { alert(e.message); }
                    finally { setLoading(false); }
                  }
                }
              ]);
            });
          }} style={{ padding: 8, marginRight: 8 }}>
            <Ionicons name="checkmark-done-circle-outline" size={24} color={theme.primary} />
          </Pressable>

          <Pressable onPress={handleIngestTest} style={{ padding: 8 }}>
            <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      <View style={{ backgroundColor: theme.error + '20', padding: 8, borderRadius: 4, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ color: theme.error, fontWeight: 'bold', fontSize: 12 }}>STRICT PROVENANCE ENFORCED</Text>
      </View>

      <FlatList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={item => item.reviewId}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          !loading && (
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>
              No pending reviews.
            </Text>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badgeContainer: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  reference: { fontSize: 14, fontWeight: 'bold' },
  bookName: { fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  previewText: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 }
});

export default ScholarReviewScreen;
