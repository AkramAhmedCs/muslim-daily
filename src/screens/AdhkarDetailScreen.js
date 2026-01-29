import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Card, ArabicText, SourceReference, Counter } from '../components';
import { useLanguage } from '../context';
import { getAdhkarProgress, updateAdhkarProgress, resetAdhkarProgress } from '../services';

const AdhkarDetailScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { language, bilingualMode, t } = useLanguage();
  const { category } = route.params;
  const [progress, setProgress] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      title: language === 'ar' ? category.nameAr : category.nameEn,
    });
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const data = await getAdhkarProgress();
    setProgress(data);
  };

  const handleIncrement = async (adhkarId, currentCount, target) => {
    if (currentCount >= target) return;

    // Haptic feedback on successful increment
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newCount = currentCount + 1;
    await updateAdhkarProgress(adhkarId, newCount);
    setProgress(prev => ({ ...prev, [adhkarId]: newCount }));
  };

  const handleReset = async (adhkarId) => {
    await resetAdhkarProgress(adhkarId);
    setProgress(prev => {
      const updated = { ...prev };
      delete updated[adhkarId];
      return updated;
    });
  };

  const renderAdhkar = ({ item, index }) => {
    const isExpanded = expandedId === item.id;
    const currentCount = progress[item.id] || 0;
    const isComplete = currentCount >= item.repetitions;

    return (
      <Card
        style={[
          styles.adhkarCard,
          isComplete && { borderColor: theme.success, borderWidth: 1 }
        ]}
        onPress={() => {
          if (isExpanded) {
            // If expanded, tap increments the counter (UX Requirement)
            handleIncrement(item.id, currentCount, item.repetitions);
          } else {
            // If collapsed, tap expands
            setExpandedId(item.id);
          }
        }}
      >
        <View style={styles.adhkarHeader}>
          <View style={[styles.numberBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.numberText, { color: theme.primary }]}>
              {index + 1}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isComplete && (
              <View style={[styles.completeBadge, { marginRight: isExpanded ? 12 : 0 }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              </View>
            )}

            {/* Explicit Close Button for expanded state */}
            {isExpanded && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setExpandedId(null);
                }}
                hitSlop={12}
              >
                <Ionicons name="close-circle" size={24} color={theme.textSecondary} opacity={0.5} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Text Display Logic */}
        <View style={styles.textContainer}>
          {(language === 'ar' || bilingualMode) && (
            <ArabicText size="regular" style={styles.arabicText}>
              {item.textAr}
            </ArabicText>
          )}

          {(language === 'en' || bilingualMode) && (
            <Text style={[styles.translation, {
              color: theme.textSecondary,
              marginTop: (language === 'ar' || bilingualMode) ? 12 : 0
            }]}>
              {item.textEn}
            </Text>
          )}
        </View>

        {isExpanded && (
          <>
            {item.notes && (
              <View style={[styles.noteContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="information-circle" size={16} color={theme.primary} />
                <Text style={[styles.noteText, { color: theme.primary }]}>
                  {item.notes}
                </Text>
              </View>
            )}

            <View style={styles.counterSection}>
              <Text style={[styles.repetitionLabel, { color: theme.textSecondary }]}>
                Repeat {item.repetitions} time{item.repetitions > 1 ? 's' : ''}
              </Text>
              <Counter
                count={currentCount}
                target={item.repetitions}
                onIncrement={() => handleIncrement(item.id, currentCount, item.repetitions)}
                onReset={() => handleReset(item.id)}
              />
            </View>

            <SourceReference
              source={item.source}
              reference={item.reference}
            />
          </>
        )}

        {!isExpanded && (
          <View style={styles.previewFooter}>
            <Text style={[styles.repetitionBadge, { color: theme.textSecondary }]}>
              ×{item.repetitions}
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.titleAr, { color: theme.text }]}>
          {language === 'ar' ? category.nameAr : category.nameEn}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {category.description}
        </Text>
      </View>

      <FlatList
        data={category.adhkar}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAdhkar}
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
  header: {
    padding: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  titleAr: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  adhkarCard: {
    marginBottom: 16,
  },
  adhkarHeader: {
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
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arabicText: {
    marginBottom: 12,
  },
  translation: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    lineHeight: 20,
  },
  counterSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  repetitionLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  repetitionBadge: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AdhkarDetailScreen;
