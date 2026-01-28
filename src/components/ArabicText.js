import React from 'react';
import { Text, StyleSheet, I18nManager } from 'react-native';
import { useTheme } from '../theme';

// Force RTL for Arabic text display
I18nManager.allowRTL(true);

const ArabicText = ({
  children,
  size = 'regular',
  style,
  numberOfLines,
  selectable = true
}) => {
  const { theme } = useTheme();

  const getSizeStyle = () => {
    switch (size) {
      case 'xlarge':
        return styles.xlarge;
      case 'large':
        return styles.large;
      case 'small':
        return styles.small;
      default:
        return styles.regular;
    }
  };

  return (
    <Text
      style={[
        styles.base,
        getSizeStyle(),
        { color: theme.arabicText },
        style,
      ]}
      numberOfLines={numberOfLines}
      selectable={selectable === true || selectable === 'true'}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  xlarge: {
    fontSize: 34,
    lineHeight: 64,
  },
  regular: {
    fontSize: 22,
    lineHeight: 42,
  },
  large: {
    fontSize: 28,
    lineHeight: 52,
  },
  small: {
    fontSize: 18,
    lineHeight: 34,
  },
});

export default ArabicText;
