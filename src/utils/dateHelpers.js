/**
 * Date conversion helpers
 * Ensures compatibility between Date picker and storage
 */

/**
 * Convert value to Date object for the Picker
 * Handles: YYYY-MM-DD string (Storage format)
 */
export const parseStoredDate = (storedValue) => {
  if (!storedValue) return new Date(); // Default to today if null

  try {
    // Format: YYYY-MM-DD string (Expected from SQLite/User Input)
    if (typeof storedValue === 'string' && storedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(storedValue);
    }

    // Fallback: Try direct conversion
    const d = new Date(storedValue);
    return isNaN(d.getTime()) ? new Date() : d;

  } catch (error) {
    console.error('[Date] Error parsing date:', error);
    return new Date();
  }
};

/**
 * Convert Date object to storage format
 * REQUIRED FORMAT: "YYYY-MM-DD"
 */
export const formatDateForStorage = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj)) {
    console.error('[Date] Invalid date object for storage:', dateObj);
    return new Date().toISOString().split('T')[0]; // Fallback to today
  }

  // Return YYYY-MM-DD
  return dateObj.toISOString().split('T')[0];
};

/**
 * Validate date is valid and in acceptable range
 */
export const isValidDate = (date) => {
  if (!(date instanceof Date)) return false;
  if (isNaN(date.getTime())) return false;

  // Reasonable range: 2020 - 2050
  const minDate = new Date('2020-01-01');
  const maxDate = new Date('2050-12-31');

  return date >= minDate && date <= maxDate;
};
