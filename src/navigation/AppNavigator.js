import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import {
  HomeScreen,
  AdhkarScreen,
  AdhkarDetailScreen,
  HadithScreen,
  DuaScreen,
  QuranScreen,
  SettingsScreen,
  PrayerTimesScreen,
  PrayerCalendarScreen,
  PrayerSettingsScreen,
  BookmarksScreen,
  MemorizationScreen,
  ReviewSessionScreen,
  MemorizeFlow,
} from '../screens';

const Tab = createBottomTabNavigator();

// Custom tab bar adapter
const CustomTabBar = ({ state, descriptors, navigation, theme }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBar,
      {
        backgroundColor: theme.surface,
        borderTopColor: theme.border,
        paddingBottom: Math.max(insets.bottom, 8)
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        // Skip hidden tabs (like Details) from the bar
        if (options.tabBarButton && options.tabBarButton() === null) {
          return null;
        }

        const isFocused = state.index === index;

        // Map route names to icons
        const icons = {
          Home: 'home',
          Adhkar: 'book',
          Hadith: 'library',
          Dua: 'hand-left',
          Quran: 'reader',
          PrayerTimes: 'time',
          Settings: 'settings',
        };

        const iconName = icons[route.name] || 'circle';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
          >
            <Ionicons
              name={isFocused ? iconName : `${iconName}-outline`}
              size={24}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: isFocused ? theme.primary : theme.textSecondary }]}>
              {route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const AppNavigator = () => {
  const { theme, isDarkMode } = useTheme();

  return (
    <NavigationContainer
      theme={{
        ...(isDarkMode ? DarkTheme : DefaultTheme),
        colors: {
          ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
          background: theme.background,
          card: theme.surface,
          text: theme.text,
          border: theme.border,
          primary: theme.primary,
          notification: theme.primary,
        },
      }}
    >
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} theme={theme} />}
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
        }}
        backBehavior="history"
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Adhkar" component={AdhkarScreen} />
        <Tab.Screen name="Hadith" component={HadithScreen} />
        <Tab.Screen name="Dua" component={DuaScreen} />
        <Tab.Screen name="PrayerTimes" component={PrayerTimesScreen} options={{ title: 'Prayer' }} />
        <Tab.Screen name="Quran" component={QuranScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />

        {/* Hifz Features */}
        <Tab.Screen
          name="Memorization"
          component={MemorizationScreen}
          options={{
            title: 'Hifz Journey',
            tabBarButton: () => null, // Hide from tab bar
            tabBarStyle: { display: 'none' }
          }}
        />
        <Tab.Screen
          name="ReviewSession"
          component={ReviewSessionScreen}
          options={{
            headerShown: false, // Full screen for focus
            tabBarButton: () => null, // Hide from tab bar
            tabBarStyle: { display: 'none' }
          }}
        />
        <Tab.Screen
          name="MemorizeFlow"
          component={MemorizeFlow}
          options={{
            headerShown: false,
            tabBarButton: () => null, // Hide from tab bar
            tabBarStyle: { display: 'none' }
          }}
        />

        <Tab.Screen
          name="AdhkarDetail"
          component={AdhkarDetailScreen}
          options={{
            tabBarButton: () => null,
            tabBarStyle: { display: 'none' } // Hide tab bar on details
          }}
        />
        <Tab.Screen
          name="PrayerCalendar"
          component={PrayerCalendarScreen}
          options={{
            tabBarButton: () => null,
            tabBarStyle: { display: 'none' }
          }}
        />
        <Tab.Screen
          name="PrayerSettings"
          component={PrayerSettingsScreen}
          options={{
            tabBarButton: () => null,
            tabBarStyle: { display: 'none' }
          }}
        />
        <Tab.Screen
          name="Bookmarks"
          component={BookmarksScreen}
          options={{
            tabBarButton: () => null,
            tabBarStyle: { display: 'none' }
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'web' ? 8 : 24,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default AppNavigator;
