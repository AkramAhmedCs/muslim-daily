import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useLanguage } from '../context';
import { Card } from '../components';
import adhkarData from '../../data/adhkar.json';

const AdhkarScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { language, bilingualMode, t } = useLanguage();
  const insets = useSafeAreaInsets();

  const getCategoryIcon = (id) => {
    switch (id) {
      case 'morning': return 'sunny-outline';
      case 'evening': return 'moon-outline';
      case 'afterPrayer': return 'hand-left-outline';
      case 'sleep': return 'bed-outline';
      case 'waking': return 'alarm-outline';
      default: return 'book-outline';
    }
  };

  const renderCategory = ({ item }) => (
    <Card
      style={styles.categoryCard}
      onPress={() => navigation.navigate('AdhkarDetail', { category: item })}
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
          {(language === 'ar' || bilingualMode) && (
            <Text style={[styles.categoryNameAr, { color: theme.text }]}>
              {item.nameAr}
            </Text>
          )}
          {(language === 'en' || bilingualMode) && (
            <Text style={[
              language === 'en' ? styles.categoryNameAr : styles.categoryNameEn,
              { color: language === 'en' ? theme.text : theme.textSecondary }
            ]}>
              {item.nameEn}
            </Text>
          )}
          <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
            {item.adhkar.length} {t('adhkar')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('adhkar')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {language === 'ar' ? 'أذكار من حصن المسلم' : 'Remembrance of Allah from Hisn al-Muslim'}
        </Text>
      </View>

      <FlatList
        data={adhkarData.categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  subtitle: {
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  categoryNameEn: {
    fontSize: 14,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
});

export default AdhkarScreen;
