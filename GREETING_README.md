# Intelligent Greeting System

## Overview
The greeting ("صباح الخير" / "مساء الخير") is now determined intelligently using Prayer Times (Fajr/Maghrib) with a robust fallback mechanism.

## Implementation Details
1.  **Logic (`src/hooks/useGreeting.js`)**:
    -   **Primary**: Uses `Fajr` (Morning start) and `Maghrib` (Evening start) from `PrayerContext`.
    -   **Fallback**: Uses fixed hours (Morning: 04:00, Evening: 18:00) if prayer times are unavailable.
    -   **Persistance**: Caches the last calculated greeting to `AsyncStorage` for instant display on app launch.

2.  **Updates**:
    -   **Foreground**: Updates every 60 seconds while active.
    -   **Resume**: Updates immediately when app comes to foreground (`AppState` listener).
    -   **Background**: Uses `expo-background-fetch` (Best Effort, ~1 hr interval) to pre-calculate and cache the greeting, ensuring the correct greeting is ready before the user even opens the app.

## Configuration
-   **Thresholds**: Defined in `src/hooks/useGreeting.js` and `src/services/backgroundTask.js`.
    -   `DEFAULT_MORNING_START`: 4 (04:00)
    -   `DEFAULT_EVENING_START`: 18 (18:00)

## Libraries Used
-   `expo-background-fetch` & `expo-task-manager`: Chosen for battery-efficient, OS-compliant background scheduling. This avoids high-frequency wake-ups while ensuring the app stays relatively fresh.

## Testing Steps
1.  **Resume Test**: Open app in evening (after Maghrib). Background it. Wait until morning (or manually change device time to 08:00). Open app. -> Greeting should be "صباح الخير".
2.  **Foreground Crossing**: Set device time to 1 minute before Maghrib. Keep app open. Wait 1 minute. -> Greeting should switch to "مساء الخير".
3.  **Background Check**: Harder to test manually as OS controls timing. You can verify `console.log` ("Background Greeting Task Registered") in development logs.
