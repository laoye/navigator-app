#!/bin/bash
# Post-install patches for libraries incompatible with RN 0.84 / AGP 8+ / Gradle 8+

# --- react-native-i18n: AGP 8+ compatibility ---
I18N_GRADLE="node_modules/react-native-i18n/android/build.gradle"
if [ -f "$I18N_GRADLE" ]; then
  sed -i 's/compile "com.facebook.react/implementation "com.facebook.react/' "$I18N_GRADLE"
  sed -i 's/lintOptions {/lint {/' "$I18N_GRADLE"
  if ! grep -q 'namespace' "$I18N_GRADLE"; then
    sed -i 's/android {/android {\n  namespace "com.AlexanderZaytsev.RNI18n"/' "$I18N_GRADLE"
  fi
  echo "Patched react-native-i18n for AGP 8+ compatibility"
fi

# --- react-native-notifications: Bridgeless mode compatibility ---
FCM_TOKEN="node_modules/react-native-notifications/lib/android/app/src/main/java/com/wix/reactnativenotifications/fcm/FcmToken.java"
if [ -f "$FCM_TOKEN" ]; then
  # Replace sendTokenToJS to try ReactHost (Bridgeless) first, fallback to ReactInstanceManager
  if grep -q "final ReactInstanceManager instanceManager = ((ReactApplication) mAppContext)" "$FCM_TOKEN"; then
    sed -i '/protected void sendTokenToJS() {/,/Note: Cannot assume react-context/{
      /protected void sendTokenToJS() {/!{
        /Note: Cannot assume react-context/!d
      }
    }' "$FCM_TOKEN"
    sed -i 's/protected void sendTokenToJS() {/protected void sendTokenToJS() {\
        ReactContext reactContext = null;\
        try {\
            reactContext = ((ReactApplication) mAppContext).getReactHost().getCurrentReactContext();\
        } catch (Exception e) { }\
        if (reactContext == null) {\
            try {\
                final ReactInstanceManager instanceManager = ((ReactApplication) mAppContext).getReactNativeHost().getReactInstanceManager();\
                reactContext = instanceManager.getCurrentReactContext();\
            } catch (Exception e) {\
                if (BuildConfig.DEBUG) Log.w(LOGTAG, "Could not get ReactContext for FCM token", e);\
                return;\
            }\
        }/' "$FCM_TOKEN"
    echo "Patched react-native-notifications for Bridgeless mode"
  fi
fi
