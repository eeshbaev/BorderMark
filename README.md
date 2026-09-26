# BorderMark

Your life across borders — a private, cross-platform React Native + Expo app for recording stays, documents, rules, reminders, and encrypted backups.

## Stack

- React Native + Expo SDK 57
- expo-router (Home · Journey · Profile)
- expo-sqlite (local data)
- Argon2id + AES-256-GCM encrypted `.bm` backups
- Offline bundled country dataset

## Run

```bash
npm install
npm start
```

Android first release target; iOS follows with the same codebase.

## Architecture

```
app/                     Expo Router screens
src/domain/              Entities, rule engine, validation, date semantics
src/data/                SQLite repositories and bundled dataset
src/infrastructure/      Platform providers, backup, crypto
src/presentation/        UI components, theme, store
```

## Locked product rules implemented

- At most one current country-level stay
- Schengen/custom rules use interval union / unique calendar dates
- Separate US SPT and US 183-day counter
- Document is a first-class entity (attachments are separate)
- Approximate dates never fabricated into exact dates
- App lock PIN and backup password are independent
- No network-dependent APIs in V1

## Test

```bash
npm test        # 69 tests
npm run typecheck
```

## Status

Attachments, Document Wallet, Backup/Restore, Local Notification Reconciliation, Approximate Historical Stay UI, and Country Chapter / Places view are implemented with tests. Next: accessibility polish, Android release prep.
