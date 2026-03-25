#!/bin/bash
# Post-install patches for libraries incompatible with AGP 8+ / Gradle 8+

I18N_GRADLE="node_modules/react-native-i18n/android/build.gradle"
if [ -f "$I18N_GRADLE" ]; then
  # Replace compile() with implementation() (removed in Gradle 8)
  sed -i 's/compile "com.facebook.react/implementation "com.facebook.react/' "$I18N_GRADLE"
  # Replace lintOptions with lint (deprecated in AGP 8)
  sed -i 's/lintOptions {/lint {/' "$I18N_GRADLE"
  # Add namespace if missing (required by AGP 8+)
  if ! grep -q 'namespace' "$I18N_GRADLE"; then
    sed -i 's/android {/android {\n  namespace "com.AlexanderZaytsev.RNI18n"/' "$I18N_GRADLE"
  fi
  echo "Patched react-native-i18n for AGP 8+ compatibility"
fi
