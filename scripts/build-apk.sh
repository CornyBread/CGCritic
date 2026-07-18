#!/usr/bin/env bash
set -euo pipefail

# Builds a standalone debug APK locally with Gradle.
#   1. Production web build  -> www/
#   2. Sync assets + native config to Android (no server.url = no live-reload)
#   3. Gradle assembleDebug
#
# Usage: npm run build:apk           (debug APK)
#        npm run build:apk -- release (release APK, needs a signing keystore)

cd "$(dirname "$0")/.."

VARIANT="${1:-debug}"
export JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"

if [ ! -d "$JAVA_HOME" ]; then
  echo "✗ No se encontró el JDK 21 en $JAVA_HOME" >&2
  exit 1
fi

echo "→ [1/3] Build web de producción…"
npm run build

echo "→ [2/3] Sincronizando con Android…"
npx cap sync android

echo "→ [3/3] Compilando APK ($VARIANT) con Gradle…"
if [ "$VARIANT" = "release" ]; then
  GRADLE_TASK="assembleRelease"
  APK_DIR="app/build/outputs/apk/release"
else
  GRADLE_TASK="assembleDebug"
  APK_DIR="app/build/outputs/apk/debug"
fi

( cd android && ./gradlew "$GRADLE_TASK" )

APK_PATH=$(ls -t "android/$APK_DIR"/*.apk 2>/dev/null | head -1 || true)
if [ -z "$APK_PATH" ]; then
  echo "✗ No se generó ningún APK. Revisa la salida de Gradle arriba." >&2
  exit 1
fi

echo
echo "✓ APK generado: $APK_PATH"
echo "  Instalar en un teléfono conectado:  adb install -r \"$APK_PATH\""
