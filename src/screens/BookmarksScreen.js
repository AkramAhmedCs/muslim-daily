import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { getBookmarks, deleteBookmark, updateBookmarkLastOpened } from '../services';

const BookmarksScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const data = await getBookmarks();
      setBookmarks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

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
      "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteBookmark(item.id);
            loadBookmarks();
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const date = new Date(item.created_at).toLocaleDateString();

    return (
      <Pressable
        style={[styles.item, { backgroundColor: theme.surface }]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="bookmark" size={24} color={theme.primary} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.surahText, { color: theme.text }]}>
            Surah {item.surah}, Ayah {item.ayah}
          </Text>
          {item.label ? (
            <Text style={[styles.labelText, { color: theme.textSecondary }]}>{item.label}</Text>
          ) : null}
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>Saved: {date}</Text>
        </View>

        <Pressable
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error || '#FF6B6B'} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Bookmarks</Text>
      </View>

      <FlatList
        data={bookmarks}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No bookmarks yet</Text>
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
    padding: 16,
    paddingTop: 60, // Adjust for status bar
  },
  backBtn: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  iconContainer: { marginRight: 16 },
  contentContainer: { flex: 1 },
  surahText: { fontSize: 16, fontWeight: '600' },
  labelText: { fontSize: 14, marginTop: 4 },
  dateText: { fontSize: 12, marginTop: 4, opacity: 0.8 },
  deleteBtn: { padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16 }
});

export default BookmarksScreen;
