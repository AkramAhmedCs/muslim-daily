import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * DatePicker Component
 * 
 * @param {Object} props
 * @param {Date} props.value - Currently selected date
 * @param {Function} props.onChange - Callback when date changes (receives Date object)
 * @param {Date} props.minimumDate - Minimum selectable date (optional)
 * @param {Date} props.maximumDate - Maximum selectable date (optional)
 * @param {string} props.label - Label text (optional)
 */
export default function DatePicker({
  value,
  onChange,
  minimumDate = new Date(), // Default: today
  maximumDate = null,
  label = 'Select Date',
  theme = null, // Theme object with text, textSecondary, surface, border colors
}) {
  // Default colors (dark mode fallback)
  const colors = {
    text: theme?.text || '#FFFFFF',
    textSecondary: theme?.textSecondary || 'rgba(255, 255, 255, 0.7)',
    surface: theme?.surface || 'rgba(255, 255, 255, 0.05)',
    border: theme?.border || 'rgba(255, 255, 255, 0.2)',
  };
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());

  /**
   * Handle date change from picker
   * iOS: Called on every scroll
   * Android: Called on confirm
   */
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      // Android: Picker closes automatically
      setShowPicker(false);

      if (event.type === 'set' && selectedDate) {
        // User confirmed
        setTempDate(selectedDate);
        onChange(selectedDate);
      }
      // If dismissed, do nothing

    } else {
      // iOS: Update temp date as user scrolls
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  /**
   * Confirm selection (iOS only)
   */
  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  /**
   * Cancel selection (iOS only)
   */
  const handleCancel = () => {
    setTempDate(value || new Date());
    setShowPicker(false);
  };

  /**
   * Format date for display
   */
  const formatDate = (date) => {
    if (!date) return 'No date selected';

    // Check if valid date
    if (!(date instanceof Date) || isNaN(date)) return 'Invalid Date';

    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return date.toLocaleDateString('en-US', options);
    // Example output: "April 15, 2026"
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}

      {/* Date Display Button */}
      <TouchableOpacity
        style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dateText, { color: colors.text }]}>
          {formatDate(value || new Date())}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {/* Android: Modal wraps picker implicitly by library but we manage show state */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* iOS: Custom modal with picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{label}</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.confirmButton}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Date Picker */}
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.picker}
                textColor="#FFFFFF"
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },

  label: {
    fontSize: 16, // Matched user's GoalScreen label size
    fontWeight: 'bold',
    color: '#FFFFFF', // Will be overridden by theme usually but defaults ok
    marginBottom: 12,
  },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle background
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  dateText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  calendarIcon: {
    fontSize: 20,
  },

  // iOS Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  modalContent: {
    backgroundColor: '#1E1E1E', // Dark theme standard
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40, // Safe area
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  cancelButton: {
    fontSize: 16,
    color: '#FF5252',
  },

  confirmButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },

  picker: {
    backgroundColor: '#1E1E1E',
  },
});
