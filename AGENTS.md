# Redacted — agent/build notes

Privacy-first, fully-local period & cycle tracker. No network calls, no accounts, no analytics. All data lives on-device in SQLite.

## Environment (do not "upgrade" blindly)
- **Expo SDK 54** (`expo ^54.0.35`). Read the versioned docs at https://docs.expo.dev/versions/v54.0.0/ before changing native/config.
- **Node 20.18.0** via nvm-windows. Not 20.19+, not 24.
- Runs on a physical Android device through **Expo Go** (QR scan). No custom dev build yet, so native-only modules (SQLCipher, react-native-aes-crypto, quick-crypto) will NOT work until we move to a dev build.

## Start command (PowerShell)
```
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx expo start --clear
```
`--clear` is mandatory after any file change — Metro caches aggressively.

## Conventions
- Theming flows through `useTheme()` → `getTheme(isDark)`. Never import the static `colors` object directly into components; it breaks dark mode.
- All cycle math lives in `src/logic/cycleEngine.js` (pure, no DB/UI).
- DB access goes through the query objects in `src/db/queries.js`. Schema + migrations in `src/db/`.
- Encrypted backups: format `REDACTED_EXPORT_V2::` (AES-256-GCM + PBKDF2). Requires `@noble/ciphers` and `@noble/hashes` once the crypto module is in use.
- Security config is never exported.
