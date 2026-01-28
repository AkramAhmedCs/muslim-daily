# Muslim Daily

A minimalist Islamic practice companion app for Android and iOS. Built with React Native and Expo.

## Features

- **Morning & Evening Adhkar** - From Hisn al-Muslim with Arabic text, translation, and repetition counter
- **Authentic Hadith** - From Sahih al-Bukhari, Sahih Muslim, and Riyad as-Salihin
- **Du'a by Situation** - Supplications for distress, travel, eating, istikhara, and more
- **Quran Reading** - Uthmani script with Saheeh International translation
- **Daily Checklist** - Track prayers, adhkar, and Quran reading
- **Reminders** - Customizable notifications for morning/evening adhkar
- **Dark Mode** - Full dark theme support
- **Offline First** - All content stored locally

## Data Sources (Authenticated Only)

| Content | Source |
|---------|--------|
| Adhkar | Hisn al-Muslim (Fortress of the Muslim) |
| Hadith | Sahih al-Bukhari, Sahih Muslim, Riyad as-Salihin |
| Quran | Tanzil.net (Uthmani script) |
| Translation | Saheeh International |

## Requirements

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode
- For Android: Android Studio with SDK

## Installation

```bash
cd muslim-daily
npm install
```

## Development

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios

# Run on web
npx expo start --web
```

## Building for Production

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android (APK)
eas build --platform android --profile preview

# Build for iOS
eas build --platform ios --profile preview
```

### Local Build

```bash
# Android APK
npx expo run:android --variant release

# iOS (requires Mac)
npx expo run:ios --configuration Release
```

## Project Structure

```
muslim-daily/
├── App.js                 # Entry point
├── app.json               # Expo configuration
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/           # App screens
│   ├── navigation/        # Navigation setup
│   ├── services/          # Storage & notifications
│   └── theme/             # Colors, typography, context
├── data/                  # Islamic content JSON files
│   ├── adhkar.json        # Hisn al-Muslim adhkar
│   ├── hadith.json        # Authentic hadith
│   ├── dua.json           # Supplications
│   └── quran.json         # Quran surahs
└── assets/                # Icons, images, fonts
```

## Privacy

This app:
- Does NOT collect any user data
- Does NOT require user accounts
- Does NOT make network requests
- Stores all data locally on device

See [PRIVACY.md](PRIVACY.md) for full privacy policy.

## License

MIT License - See LICENSE file for details.

## Credits

- Adhkar content from Hisn al-Muslim by Sa'id bin Ali bin Wahf Al-Qahtani
- Quran text from Tanzil.net
- Translations from Saheeh International
