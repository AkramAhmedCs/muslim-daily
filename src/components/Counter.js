import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const Counter = ({
  count,
  target,
  onIncrement,
  onReset,
  size = 'medium'
}) => {
  const { theme } = useTheme();
  const isComplete = count >= target;
  const progress = Math.min(count / target, 1);

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.border,
              height: size === 'large' ? 8 : 4,
            }
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isComplete ? theme.success : theme.primary,
                width: `${progress * 100}%`,
              }
            ]}
          />
        </View>
        <Text style={[styles.countText, { color: theme.text }]}>
          {count} / {target}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[
            styles.button,
            styles.incrementButton,
            { backgroundColor: isComplete ? theme.success : theme.primary }
          ]}
          onPress={onIncrement}
          disabled={isComplete}
        >
          <Ionicons
            name={isComplete ? 'checkmark' : 'add'}
            size={size === 'large' ? 28 : 24}
            color="#fff"
          />
        </Pressable>

        {count > 0 && (
          <Pressable
            style={[
              styles.button,
              styles.resetButton,
              { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
            onPress={onReset}
          >
            <Ionicons name="refresh" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incrementButton: {
    width: 56,
    height: 56,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
  },
});

export default Counter;
