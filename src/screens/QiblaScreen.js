/**
 * QiblaScreen.js
 *
 * Finds direction of Qibla using device GPS and compass.
 *
 * KAABA COORDINATES: Verified against Google Maps and major Islamic apps
 * Lat: 21.4225° N, Lng: 39.8262° E
 *
 * Uses expo-location for both GPS and compass heading (watchHeadingAsync).
 * Great Circle bearing formula for Qibla direction.
 * Haversine formula for distance to Mecca.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Animated,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../theme';
import { useLanguage } from '../context';

// Verified Kaaba coordinates
const KAABA = {
  latitude: 21.4225,
  longitude: 39.8262,
};

/**
 * Calculate Qibla direction from user's location.
 * Uses the Great Circle bearing formula.
 *
 * @param {number} userLat - User's latitude in degrees
 * @param {number} userLng - User's longitude in degrees
 * @returns {number} Qibla bearing in degrees (0-360, 0 = North)
 */
const calculateQiblaDirection = (userLat, userLng) => {
  const toRad = (deg) => deg * (Math.PI / 180);

  const φ1 = toRad(userLat);
  const φ2 = toRad(KAABA.latitude);
  const Δλ = toRad(KAABA.longitude - userLng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180 / Math.PI) + 360) % 360;

  return bearing;
};

/**
 * Calculate distance to Kaaba using Haversine formula.
 *
 * @param {number} userLat
 * @param {number} userLng
 * @returns {number} Distance in kilometers
 */
const calculateDistanceToMecca = (userLat, userLng) => {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(KAABA.latitude - userLat);
  const dLon = toRad(KAABA.longitude - userLng);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) * Math.cos(toRad(KAABA.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const QiblaScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState(null);
  const [qiblaDirection, setQiblaDirection] = useState(null);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [distance, setDistance] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compassAvailable, setCompassAvailable] = useState(true);

  const compassRotation = useRef(new Animated.Value(0)).current;
  const headingSubscription = useRef(null);

  // ==========================================
  // REQUEST PERMISSIONS & GET LOCATION
  // ==========================================
  useEffect(() => {
    const initialize = async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDenied(true);
          setLoading(false);
          return;
        }

        // Get current position
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        // Calculate Qibla direction
        const qibla = calculateQiblaDirection(latitude, longitude);
        setQiblaDirection(qibla);

        // Calculate distance to Mecca
        const dist = calculateDistanceToMecca(latitude, longitude);
        setDistance(dist);

        setLoading(false);
      } catch (error) {
        console.error('[Qibla] Initialize error:', error);
        setLoading(false);
        Alert.alert(
          'Location Error',
          'Could not get your location. Please check your GPS settings.',
          [{ text: 'OK' }]
        );
      }
    };

    initialize();

    // Cleanup heading subscription on unmount
    return () => {
      if (headingSubscription.current) {
        headingSubscription.current.remove();
        headingSubscription.current = null;
      }
    };
  }, []);

  // ==========================================
  // CONTINUOUS COMPASS HEADING (watchHeadingAsync)
  // ==========================================
  useEffect(() => {
    const startWatchingHeading = async () => {
      try {
        headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
          // trueHeading is the direction relative to true north
          // magHeading is relative to magnetic north
          const heading = headingData.trueHeading >= 0
            ? headingData.trueHeading
            : headingData.magHeading;

          setDeviceHeading(heading);
        });
      } catch (error) {
        console.warn('[Qibla] Heading not available:', error);
        setCompassAvailable(false);
      }
    };

    startWatchingHeading();

    return () => {
      if (headingSubscription.current) {
        headingSubscription.current.remove();
        headingSubscription.current = null;
      }
    };
  }, []);

  // ==========================================
  // ANIMATE COMPASS NEEDLE
  // ==========================================
  useEffect(() => {
    if (qiblaDirection !== null) {
      // The needle should rotate: qibla direction minus device heading
      const needleRotation = qiblaDirection - deviceHeading;

      Animated.spring(compassRotation, {
        toValue: needleRotation,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    }
  }, [deviceHeading, qiblaDirection]);

  const spin = compassRotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  // ==========================================
  // PERMISSION DENIED STATE
  // ==========================================
  if (permissionDenied) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('qiblaFinder') || 'Qibla Finder'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.errorState}>
          <Ionicons name="location-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>
            {t('locationRequired') || 'Location Access Required'}
          </Text>
          <Text style={[styles.errorDescription, { color: theme.textSecondary }]}>
            Please allow location access in Settings to find the Qibla direction.
          </Text>
          <Pressable
            style={[styles.errorButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          >
            <Text style={styles.errorButtonText}>
              {t('openSettings') || 'Open Settings'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingState}>
          <Ionicons name="compass-outline" size={64} color={theme.primary} />
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 16 }} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('findingLocation') || 'Finding your location...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('qiblaFinder') || 'Qibla Finder'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Compass */}
      <View style={styles.compassContainer}>
        {/* Compass Rose */}
        <View style={[styles.compassRose, { borderColor: theme.border }]}>
          {/* Direction labels */}
          <Text style={[styles.dirLabel, styles.north, { color: theme.primary }]}>N</Text>
          <Text style={[styles.dirLabel, styles.south, { color: theme.textSecondary }]}>S</Text>
          <Text style={[styles.dirLabel, styles.east, { color: theme.textSecondary }]}>E</Text>
          <Text style={[styles.dirLabel, styles.west, { color: theme.textSecondary }]}>W</Text>

          {/* Degree markers */}
          <View style={[styles.compassCenter, { backgroundColor: theme.surface }]}>
            <Text style={[styles.degreeText, { color: theme.text }]}>
              {qiblaDirection !== null ? `${Math.round(qiblaDirection)}°` : '--'}
            </Text>
          </View>

          {/* Qibla Needle */}
          <Animated.View
            style={[
              styles.needle,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <View style={styles.needlePointer}>
              <Text style={styles.needleKaaba}>🕋</Text>
            </View>
            <View style={[styles.needleLine, { backgroundColor: theme.primary }]} />
            <View style={styles.needleBottom} />
          </Animated.View>
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        {qiblaDirection !== null && (
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="compass-outline" size={22} color={theme.primary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              {t('qiblaDirection') || 'Qibla Direction'}
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {Math.round(qiblaDirection)}°
            </Text>
          </View>
        )}

        {distance !== null && (
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="navigate-outline" size={22} color={theme.primary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              {t('distanceToMecca') || 'Distance to Mecca'}
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {distance.toLocaleString()} km
            </Text>
          </View>
        )}
      </View>

      {/* No Compass Warning */}
      {!compassAvailable && (
        <View style={styles.warning}>
          <Text style={[styles.warningText, { color: '#FFD700' }]}>
            ⚠️ {t('compassNotAvailable') || 'Compass not available'}. Showing calculated direction only.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  compassContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassRose: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  compassCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  degreeText: {
    fontSize: 22,
    fontWeight: '700',
  },
  dirLabel: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '700',
  },
  north: { top: 14 },
  south: { bottom: 14 },
  east: { right: 16 },
  west: { left: 16 },
  needle: {
    alignItems: 'center',
    position: 'absolute',
    height: 240,
    justifyContent: 'flex-start',
  },
  needlePointer: {
    alignItems: 'center',
  },
  needleKaaba: {
    fontSize: 32,
  },
  needleLine: {
    width: 3,
    height: 80,
    borderRadius: 2,
  },
  needleBottom: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  infoSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  warning: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  warningText: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
});

export default QiblaScreen;
