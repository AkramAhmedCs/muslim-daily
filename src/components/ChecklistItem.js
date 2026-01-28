import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const ChecklistItem = ({
  title,
  subtitle,
  completed,
  onToggle,
  icon = 'checkbox-outline'
}) => {
  const { theme } = useTheme();

  // Defensive: ensure completed is always a boolean
  const isCompleted = completed === true || completed === 'true';

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: isCompleted ? theme.primary + '15' : theme.surface,
          borderColor: isCompleted ? theme.primary : theme.border,
        }
      ]}
      onPress={onToggle}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={isCompleted ? 'checkbox' : icon}
          size={24}
          color={isCompleted ? theme.primary : theme.textSecondary}
        />
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            { color: theme.text },
            isCompleted && styles.completedText
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {isCompleted && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={theme.success}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
});

export default ChecklistItem;
