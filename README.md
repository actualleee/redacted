# Redacted 🩸

> A fully local, privacy-first period & cycle tracking app.
> No servers. No telemetry. No bullshit.

---

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Android device or emulator
- (Optional) EAS CLI for builds: `npm install -g eas-cli`

### Install

```bash
# 1. Initialize the Expo project
npx create-expo-app@latest redacted --template blank
cd redacted

# 2. Copy all src/ files from this scaffold into the project

# 3. Install dependencies
npx expo install expo-sqlite expo-crypto expo-secure-store \
  expo-file-system expo-sharing expo-local-authentication

npm install @react-navigation/native @react-navigation/stack \
  @react-navigation/bottom-tabs

npm install react-native-screens react-native-safe-area-context \
  react-native-gesture-handler react-native-reanimated

npm install zustand date-fns victory-native

# 4. Install fonts
npx expo install expo-font @expo-google-fonts/dm-sans \
  @expo-google-fonts/playfair-display

# 5. Run on Android
npx expo start --android
```

---

## Architecture

```
Everything is local. SQLite on device.
No network calls. Ever.
```

### Folder structure
```
src/
├── db/
│   ├── schema.js       ← All CREATE TABLE statements
│   ├── database.js     ← SQLite init, migration runner, query helpers
│   └── queries.js      ← All DB operations organized by domain
│
├── logic/
│   └── cycleEngine.js  ← Pure cycle math: phases, predictions, anomalies
│
├── security/
│   ├── auth.js         ← PIN hashing, biometric, lock state, export crypto
│   └── exportImport.js ← Encrypted .rdx export/import + doctor summary
│
├── stores/
│   └── index.js        ← Zustand stores (app, cycle, today, calendar, pregnancy)
│
├── theme/
│   └── index.js        ← Colors, typography, spacing, phase themes
│
└── screens/
    ├── Lock/           ← PIN entry, biometric, decoy mode
    ├── Onboarding/     ← First launch: conditions, security setup
    ├── Today/          ← Daily log hub (heart of the app)
    ├── Calendar/       ← Full cycle calendar view
    ├── Insights/       ← Charts, patterns, anomaly flags
    ├── Profile/        ← Settings, export, condition toggles
    └── Pregnancy/      ← Pregnancy mode (separate logic tree)
```

---

## Data & Privacy

- **Database**: SQLite via `expo-sqlite`, stored in app sandbox
- **Encryption**: DB-level encryption planned via SQLCipher
- **Export format**: `.rdx` — encrypted JSON blob (AES-derived XOR, upgrade to AES-256-GCM in v2)
- **Import**: Decrypts with export PIN, fully restores all data
- **Doctor export**: Plaintext `.txt` summary, no sensitive data
- **Security config is NEVER exported** — PIN hashes stay on device

---

## Phase Engine

Cycle phases are computed in `src/logic/cycleEngine.js`:

| Phase | Days (default 28-day cycle) |
|-------|----------------------------|
| Menstrual | 1–5 |
| Follicular | 6–13 |
| Ovulation | 14–15 |
| Luteal | 16–28 |

After 2–3 real cycles logged, predictions kick in automatically.
Anomaly detection flags: short luteal phase, irregular cycles, long cycles (>35d).

---

## Build for Android

```bash
# Development build
npx expo run:android

# Production APK via EAS
eas build --platform android --profile preview
```

---

## Phase 2 Roadmap (next up)

- [ ] Onboarding flow (conditions, security setup)
- [ ] Calendar screen with phase visualization
- [ ] Insights charts (BBT curve, cycle length history)
- [ ] Symptom pattern analysis
- [ ] Pregnancy mode full implementation
- [ ] Notification system (period predictions, medication reminders)
- [ ] Custom symptom creation
- [ ] Decoy mode "fake" data layer
- [ ] SQLCipher for at-rest DB encryption
- [ ] Widget (Android home screen)
- [ ] Plant/nature illustration asset set

---

## Condition Support

Toggle in Profile → Conditions:
- **Endometriosis**: Bowel/bladder/sex pain tracking, inflammation log
- **PCOS**: Hirsutism, hair loss, weight tracking, long cycle flags
- **TTC**: Fertile window highlighting, BBT chart, conception likelihood
- **Pregnancy**: Full mode switch — gestational age, kicks, appointments

---

Built with love and rage. 🩸
