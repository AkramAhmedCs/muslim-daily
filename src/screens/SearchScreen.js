import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

const SearchScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TextInput
        placeholder="Search Quran, Hadith..."
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <Text style={{ color: theme.textSecondary, marginTop: 20, textAlign: 'center' }}>
        Offline Search Index is building...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  input: { padding: 16, borderWidth: 1, borderRadius: 12, fontSize: 16 }
});

export default SearchScreen;
