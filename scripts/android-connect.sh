#!/usr/bin/env bash
set -euo pipefail

METRO_PORT="${METRO_PORT:-8081}"
PACKAGER_HOST="${REACT_NATIVE_PACKAGER_HOSTNAME:-10.0.2.2}"
URL="bordermark://expo-development-client/?url=http%3A%2F%2F${PACKAGER_HOST}%3A${METRO_PORT}"
WAIT_SECONDS="${ANDROID_CONNECT_WAIT:-180}"

echo "Waiting for an Android device or emulator (up to ${WAIT_SECONDS}s)..."
elapsed=0
until adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { found=1 } END { exit !found }'; do
  if (( elapsed >= WAIT_SECONDS )); then
    echo "No device found. Start the emulator first:"
    echo "  npm run android:emulator"
    echo "Or open Device Manager in Android Studio, then run this script again."
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo "Waiting for Android to finish booting..."
boot_elapsed=0
until adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do
  if (( boot_elapsed >= WAIT_SECONDS )); then
    echo "Emulator did not finish booting in time. If qemu crashed, cold-boot the AVD from Android Studio."
    exit 1
  fi
  sleep 2
  boot_elapsed=$((boot_elapsed + 2))
done

if ! adb shell pm list packages 2>/dev/null | grep -q '^package:com.bordermark.app$'; then
  echo "BorderMark dev build is not installed. Run: npm run android:install"
  exit 1
fi

adb reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}"
adb shell am force-stop com.bordermark.app
sleep 1
adb shell am start -a android.intent.action.VIEW -d "$URL"
