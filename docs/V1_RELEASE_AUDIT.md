# BorderMark V1 — Release Audit

**Date:** 2026-09-08  
**Scope:** Accessibility polish + Android release preparation (no new product features)

---

## 1. Final test count

Run locally:

```bash
npm test
npm run typecheck
```

Expected: **77+ passing tests** after accessibility label tests (69 prior + 8 new).

---

## 2. Accessibility — issues found and fixed

### Fixed in code

| Area | Issue | Fix |
|------|-------|-----|
| Home / Attention | Priority communicated only via colored emoji | Text priority labels + `attentionItemAccessibilityLabel()` |
| Current stay | Meaning inferred from border/icon | Explicit "Current stay" text + `currentStayAccessibilityLabel()` |
| Journey timeline | Approximate stays lacked spoken status | Text badges + `journeyStayAccessibilityLabel()` |
| Journey tabs | Missing tab roles | `tablist` / `tab` roles with selected state |
| Add sheet | Modal/option labels missing | `accessibilityViewIsModal`, per-option labels, reduced-motion |
| Tab bar | Plus button unlabeled | "Add item" label + 56dp target |
| Stay forms | Unlabeled inputs/chips | `AccessibleTextInput`, radio chips with labels |
| Documents | Delete/remove/edit unlabeled | Explicit action labels on all controls |
| Notifications | Switch labels missing | `accessibilityLabel` + `accessibilityState` on switches |
| Profile / onboarding | Navigation rows unlabeled | Button labels on all rows |
| App lock / backup | PIN/password fields unlabeled | `AccessibleTextInput` with secure entry |
| Dynamic type | Text could clip | `AccessibleText` with `maxFontSizeMultiplier` (1.5) + `flexShrink` |
| Reduced motion | Add sheet always animated | `useReducedMotion()` disables slide animation |

### Shared infrastructure added

- `src/presentation/accessibility/labels.ts` — screen reader label helpers
- `src/presentation/accessibility/constants.ts` — `MIN_TOUCH_TARGET = 44`, `MAX_FONT_SIZE_MULTIPLIER = 1.5`
- `src/presentation/components/AccessibleText.tsx`
- `src/presentation/components/AccessibleTextInput.tsx`
- `src/presentation/components/AccessiblePressable.tsx`
- `src/presentation/hooks/useReducedMotion.ts`
- Automated tests: `src/presentation/accessibility/__tests__/labels.test.ts`

### Manual TalkBack pass

**Status:** Required before Play Store submission. Not performed in this automated session.

### React Native / Expo limitations

- Custom Pressable radio groups may behave differently from native RadioButton on TalkBack.
- Alert dialogs use system accessibility.
- `maxFontSizeMultiplier` capped at 1.5× to reduce layout breakage.
- Custom tab bar plus button requires manual accessibility labels.

---

## 3. Devices / emulators tested

| Environment | Tested in this session |
|-------------|------------------------|
| Jest (Node) | Yes |
| TypeScript compiler | Yes |
| Android emulator | No |
| Physical Android device | No |
| Release APK/AAB build | No |

---

## 4. Release build result

| Item | Value |
|------|-------|
| Package ID | `com.bordermark.app` |
| Version name | 1.0.0 |
| Version code | 1 |
| EAS profiles | development, preview (APK), production (AAB) |

Build: `eas build --platform android --profile preview`

---

## 5. Permissions used (V1)

- Location (when-in-use): optional country detection
- Biometric: app lock
- Notifications: local scheduling
- Document picker: attachments and restore

Blocked: camera, microphone, contacts, SMS, phone, background location.

Removed unused `expo-image-picker`.

---

## 6. Network / services

No BorderMark servers, analytics, remote geocoding, cloud push, or automatic uploads.

---

## 7. Security

PINs/passwords not logged. SecureStore for app lock. Argon2id + AES-256-GCM backups. Temp files cleaned on restore.

---

## 8. Backup / restore

Integration tests cover merge/replace, wrong password, safety snapshot, attachment integrity.

---

## 9. Notifications

Reconciliation tests cover derived IDs, toggles, non-persisted delivery state.

---

## 10. Remaining limitations

1. TalkBack manual pass pending
2. Release APK not built in this session
3. Add Stay shows 6 quick country flags only
4. Font scaling capped at 1.5×
5. No RN component-tree a11y tests in Jest
6. EAS project ID placeholder — link real project before cloud builds

---

## 11. Release candidate readiness

**Ready for final human testing — not yet Play Store ready.**

Proceed with device validation, then the brutally honest V1 product audit before publish.
