import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import {
  getBookmarks,
  deleteBookmark,
  updateBookmarkLastOpened,
  clearAllBookmarks
} from '../services';

const BookmarksScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookmarks = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await getBookmarks();
      setBookmarks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookmarks();
  };

  const handlePress = async (item) => {
    await updateBookmarkLastOpened(item.id);
    // Navigate to Quran with specific params
    navigation.navigate('Quran', {
      surahNumber: item.surah,
      ayahNumber: item.ayah
    });
  };

  const handleDelete = (item) => {
    Alert.alert(
      "Delete Bookmark",
      "Are you sure you want to remove this bookmark?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteBookmark(item.id);
            // Optimistic update
            setBookmarks(prev => prev.filter(b => b.id !== item.id));
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    if (bookmarks.length === 0) return;
    Alert.alert(
      "Clear All Bookmarks",
      "This will permanently remove all your bookmarks. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearAllBookmarks();
            setBookmarks([]);
          }
        }
      ]
    );
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const renderItem = ({ item }) => {
    return (
      <Pressable
        style={[styles.item, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handlePress(item)}
        android_ripple={{ color: theme.primary + '20' }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="bookmark" size={24} color={theme.primary} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.rowBetween}>
            <Text style={[styles.surahText, { color: theme.text }]}>
              Surah {item.surah} : {item.ayah}
            </Text>
            {/* Optional: Add Juz info here if we calculate it or store it */}
          </View>

          {item.label ? (
            <Text style={[styles.labelText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.label}
            </Text>
          ) : null}

          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatTimestamp(item.created_at)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle-outline" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Bookmarks</Text>

        <TouchableOpacity
          onPress={handleClearAll}
          disabled={bookmarks.length === 0}
          style={{ opacity: bookmarks.length === 0 ? 0.3 : 1 }}
        >
          <Text style={{ color: theme.error || '#FF5252', fontSize: 16 }}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={bookmarks}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📖</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No bookmarks yet</Text>
              <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                Tap the bookmark icon while reading to save your place.
              </Text>
              <TouchableOpacity
                style={[styles.readBtn, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('Quran')}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Start Reading</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50, // Safe area approx
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  list: { padding: 16, paddingBottom: 100 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: { marginRight: 16 },
  contentContainer: { flex: 1, marginRight: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  surahText: { fontSize: 16, fontWeight: '600' },
  labelText: { fontSize: 14, marginTop: 4 },
  dateText: { fontSize: 12, marginTop: 6, opacity: 0.7 },
  deleteBtn: { padding: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  readBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
});

export default BookmarksScreen;
