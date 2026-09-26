#!/usr/bin/env bash
set -euo pipefail

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMULATOR="$SDK/emulator/emulator"
AVD="${ANDROID_AVD:-Pixel_10_Pro}"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android SDK platform-tools or set ANDROID_HOME."
  exit 1
fi

if adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { found=1 } END { exit !found }'; then
  echo "Android device or emulator already connected."
  adb devices
  exit 0
fi

if [[ ! -x "$EMULATOR" ]]; then
  echo "Emulator not found at: $EMULATOR"
  echo "Start “${AVD}” from Android Studio → Device Manager, or set ANDROID_AVD to your AVD name."
  exit 1
fi

echo "Starting emulator “${AVD}” in the background (uses a lot of RAM; keep Metro in a separate terminal)..."
nohup "$EMULATOR" -avd "$AVD" -no-boot-anim >/dev/null 2>&1 &
echo "Waiting for adb..."
adb wait-for-device
echo "Booting — wait for the home screen, then: npm run android:connect"
