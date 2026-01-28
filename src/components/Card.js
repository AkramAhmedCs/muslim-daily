import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme';

const Card = ({
  children,
  style,
  onPress,
  padded = true,
  elevated = true
}) => {
  const { theme } = useTheme();

  // Defensive casting (Corrected)
  const isPadded = padded === 'false' ? false : (padded === 'true' ? true : !!padded);
  const isElevated = elevated === 'false' ? false : (elevated === 'true' ? true : !!elevated);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    isElevated && [
      styles.elevated,
      { shadowColor: theme.shadow }
    ],
    isPadded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: {
    padding: 16,
  },
  elevated: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});

export default Card;
