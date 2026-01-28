import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card, ArabicText, SourceReference } from '../components';
import duaData from '../../data/dua.json';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DuaScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const duaListRef = useRef(null);

  // Handle hardware back button
  React.useEffect(() => {
    const backAction = () => {
      if (selectedCategory) {
        setSelectedCategory(null);
        setExpandedId(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [selectedCategory]);

  // Handle accordion expansion - only one open at a time with smooth animation
  const handleExpand = (itemId, index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (expandedId === itemId) {
      // Collapse if tapping the same item
      setExpandedId(null);
    } else {
      // Expand new item (auto-collapses previous)
      setExpandedId(itemId);

      // Scroll to make expanded item visible after a short delay
      setTimeout(() => {
        if (duaListRef.current && index !== undefined) {
          duaListRef.current.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.2 // Position near top with some padding
          });
        }
      }, 100);
    }
  };

  const getCategoryIcon = (id) => {
    switch (id) {
      case 'distress': return 'heart-outline';
      case 'forgiveness': return 'refresh-outline';
      case 'guidance': return 'compass-outline';
      case 'travel': return 'airplane-outline';
      case 'eating': return 'restaurant-outline';
      case 'istikhara': return 'help-circle-outline';
      case 'protection': return 'shield-outline';
      case 'sickness': return 'medkit-outline';
      default: return 'hand-left-outline';
    }
  };

  const renderCategory = ({ item }) => (
    <Card
      style={styles.categoryCard}
      onPress={() => setSelectedCategory(item)}
    >
      <View style={styles.categoryContent}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons
            name={getCategoryIcon(item.id)}
            size={28}
            color={theme.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.categoryNameAr, { color: theme.text }]}>
            {item.nameAr}
          </Text>
          <Text style={[styles.categoryNameEn, { color: theme.textSecondary }]}>
            {item.nameEn}
          </Text>
          <Text style={[styles.duaCount, { color: theme.textSecondary }]}>
            {item.duas.length} du'a
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
      </View>
    </Card>
  );

  const renderDua = ({ item, index }) => {
    const isExpanded = expandedId === item.id;

    return (
      <Card
        style={styles.duaCard}
        onPress={() => handleExpand(item.id, index)}
      >
        <View style={styles.duaHeader}>
          <View style={[styles.numberBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.numberText, { color: theme.primary }]}>
              {index + 1}
            </Text>
          </View>
          {item.occasion && (
            <View style={[styles.occasionBadge, { backgroundColor: theme.accent + '20' }]}>
              <Text style={[styles.occasionText, { color: theme.accent }]} numberOfLines={1}>
                {item.occasion}
              </Text>
            </View>
          )}
        </View>

        <ArabicText size="regular" style={styles.arabicText}>
          {item.arabicText}
        </ArabicText>

        {isExpanded && (
          <>
            <Text style={[styles.translation, { color: theme.textSecondary }]}>
              {item.englishTranslation}
            </Text>

            <SourceReference
              source={item.source}
              reference={item.reference}
            />
          </>
        )}

        {!isExpanded && (
          <View style={styles.previewFooter}>
            <Text style={[styles.tapToExpand, { color: theme.textSecondary }]}>
              Tap to see translation
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={theme.textSecondary}
            />
          </View>
        )}
      </Card>
    );
  };

  // If viewing duas in a category
  if (selectedCategory) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Pressable
          style={[styles.backButton, { marginTop: insets.top }]}
          onPress={() => {
            setSelectedCategory(null);
            setExpandedId(null);
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.titleAr, { color: theme.text }]}>
            {selectedCategory.nameAr}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {selectedCategory.nameEn}
          </Text>
        </View>

        <FlatList
          ref={duaListRef}
          data={selectedCategory.duas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDua}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            // Handle scroll failure gracefully
            setTimeout(() => {
              if (duaListRef.current) {
                duaListRef.current.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
              }
            }, 100);
          }}
        />
      </View>
    );
  }

  // Main categories view
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Du'a</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Supplications for every situation
        </Text>
      </View>

      <FlatList
        data={duaData.categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
  },
  backText: {
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  titleAr: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  categoryCard: {
    marginBottom: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  categoryNameAr: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  categoryNameEn: {
    fontSize: 14,
    marginBottom: 2,
  },
  duaCount: {
    fontSize: 12,
  },
  duaCard: {
    marginBottom: 16,
  },
  duaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  occasionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '60%',
  },
  occasionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  arabicText: {
    marginBottom: 12,
  },
  translation: {
    fontSize: 15,
    lineHeight: 24,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapToExpand: {
    fontSize: 13,
  },
});

export default DuaScreen;
