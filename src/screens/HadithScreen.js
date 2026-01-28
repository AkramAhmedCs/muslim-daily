import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card, ArabicText, SourceReference } from '../components';

// Import the expanded hadith data
import hadithData from '../../data/hadith.json';

const HadithScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedHadith, setSelectedHadith] = useState(null);

  // Handle hardware back button for internal navigation
  React.useEffect(() => {
    const backAction = () => {
      if (selectedHadith) {
        setSelectedHadith(null);
        return true;
      }
      if (selectedCollection) {
        setSelectedCollection(null);
        return true;
      }
      return false; // Let default behavior happen (go back to previous tab/screen)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [selectedHadith, selectedCollection]);

  const collections = hadithData.collections || [];

  const getCollectionIcon = (id) => {
    const icons = {
      bukhari: 'library',
      muslim: 'book',
      riyad: 'heart',
    };
    return icons[id] || 'document';
  };

  const renderCollectionList = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}>
      {collections.map((collection) => (
        <Pressable key={collection.id} onPress={() => setSelectedCollection(collection)}>
          <Card style={styles.collectionCard}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name={getCollectionIcon(collection.id)} size={28} color={theme.primary} />
            </View>
            <View style={styles.collectionInfo}>
              <Text style={[styles.collectionName, { color: theme.text }]}>{collection.name}</Text>
              <Text style={[styles.collectionArabic, { color: theme.arabicText }]}>{collection.arabicName}</Text>
              <Text style={[styles.collectionMeta, { color: theme.textSecondary }]}>
                {collection.compiler} • {collection.hadith.length} hadith
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderHadithList = () => {
    if (!selectedCollection) return null;

    // Group hadith by book
    const books = {};
    selectedCollection.hadith.forEach(h => {
      if (!books[h.bookName]) books[h.bookName] = [];
      books[h.bookName].push(h);
    });

    return (
      <View style={styles.detail}>
        <View style={[styles.detailHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
          <Pressable style={styles.backButton} onPress={() => setSelectedCollection(null)}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedCollection.name}</Text>
            <Text style={[styles.detailSubtitle, { color: theme.textSecondary }]}>
              {selectedCollection.hadith.length} authentic hadith
            </Text>
          </View>
        </View>

        <ScrollView style={styles.hadithListScroll} contentContainerStyle={styles.hadithListContent}>
          {Object.entries(books).map(([bookName, hadithList]) => (
            <View key={bookName} style={styles.bookSection}>
              <Text style={[styles.bookTitle, { color: theme.primary }]}>{bookName}</Text>
              {hadithList.map((hadith) => (
                <Pressable key={hadith.id} onPress={() => setSelectedHadith(hadith)}>
                  <Card style={styles.hadithCard}>
                    <View style={styles.hadithPreview}>
                      <Text style={[styles.hadithNumber, { color: theme.primary }]}>
                        #{hadith.hadithNumber}
                      </Text>
                      <Text
                        style={[styles.hadithText, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {hadith.english}
                      </Text>
                      <Text style={[styles.narratorName, { color: theme.textSecondary }]}>
                        — {hadith.narrator}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </Card>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderHadithDetail = () => {
    if (!selectedHadith) return null;

    return (
      <View style={styles.detail}>
        <View style={[styles.detailHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
          <Pressable style={styles.backButton} onPress={() => setSelectedHadith(null)}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.detailTitle, { color: theme.text }]}>Hadith #{selectedHadith.hadithNumber}</Text>
            <Text style={[styles.detailSubtitle, { color: theme.textSecondary }]}>
              {selectedHadith.bookName}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.hadithDetailScroll} contentContainerStyle={styles.hadithDetailContent}>
          <Card style={styles.fullHadithCard}>
            <ArabicText size="regular" style={styles.arabicHadith}>
              {selectedHadith.arabic}
            </ArabicText>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.englishHadith, { color: theme.text }]}>
              {selectedHadith.english}
            </Text>

            <View style={[styles.sourceBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.narratorLabel, { color: theme.textSecondary }]}>Narrated by:</Text>
              <Text style={[styles.narratorValue, { color: theme.text }]}>{selectedHadith.narrator}</Text>

              <Text style={[styles.sourceLabel, { color: theme.textSecondary }]}>Source:</Text>
              <Text style={[styles.sourceValue, { color: theme.text }]}>
                {selectedCollection.name}, Hadith #{selectedHadith.hadithNumber}
              </Text>

              <Text style={[styles.gradeLabel, { color: theme.textSecondary }]}>Grade:</Text>
              <View style={[styles.gradeBadge, { backgroundColor: theme.success + '20' }]}>
                <Text style={[styles.gradeText, { color: theme.success }]}>
                  {selectedCollection.grade}
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  };

  const getCurrentView = () => {
    if (selectedHadith) return renderHadithDetail();
    if (selectedCollection) return renderHadithList();
    return renderCollectionList();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!selectedCollection && !selectedHadith && (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={[styles.title, { color: theme.text }]}>Hadith</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Authenticated Collections
          </Text>
        </View>
      )}

      {getCurrentView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  scrollView: { flex: 1 },
  listContainer: { padding: 16 },
  collectionCard: { flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 16 },
  iconContainer: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  collectionInfo: { flex: 1 },
  collectionName: { fontSize: 18, fontWeight: '600' },
  collectionArabic: { fontSize: 16, marginTop: 2 },
  collectionMeta: { fontSize: 13, marginTop: 4 },
  detail: { flex: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backButton: { padding: 8, marginRight: 8 },
  headerInfo: { flex: 1 },
  detailTitle: { fontSize: 18, fontWeight: 'bold' },
  detailSubtitle: { fontSize: 13 },
  hadithListScroll: { flex: 1 },
  hadithListContent: { padding: 16 },
  bookSection: { marginBottom: 24 },
  bookTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  hadithCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 8 },
  hadithPreview: { flex: 1 },
  hadithNumber: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  hadithText: { fontSize: 14, lineHeight: 20 },
  narratorName: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  hadithDetailScroll: { flex: 1 },
  hadithDetailContent: { padding: 16 },
  fullHadithCard: { padding: 24 },
  arabicHadith: { marginBottom: 20 },
  divider: { height: 1, marginVertical: 20 },
  englishHadith: { fontSize: 17, lineHeight: 28 },
  sourceBox: { marginTop: 24, padding: 16, borderRadius: 12 },
  narratorLabel: { fontSize: 12, marginBottom: 4 },
  narratorValue: { fontSize: 15, fontWeight: '500', marginBottom: 12 },
  sourceLabel: { fontSize: 12, marginBottom: 4 },
  sourceValue: { fontSize: 15, marginBottom: 12 },
  gradeLabel: { fontSize: 12, marginBottom: 8 },
  gradeBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  gradeText: { fontSize: 13, fontWeight: '600' },
});

export default HadithScreen;
