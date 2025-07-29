package com.xevoxmobileapp

import android.os.Build
import android.os.Bundle
import expo.modules.ReactActivityDelegateWrapper
import android.util.Log

// Simple Activity for Expo development builds
class MainActivity : expo.modules.devlauncher.DevLauncherActivity() {
    
    companion object {
        private const val TAG = "XEVOX_MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Set the theme to AppTheme BEFORE onCreate to support
        // coloring the background, status bar, and navigation bar.
        // This is required for expo-splash-screen.
        setTheme(android.R.style.Theme_DeviceDefault_Light_NoActionBar)
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "🚀 XEVOX Health App - Expo Development Build")
        Log.d(TAG, "📱 Device: ${Build.MANUFACTURER} ${Build.MODEL}")
        Log.d(TAG, "📱 Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        Log.d(TAG, "✅ MainActivity created - loading React Native app")
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "main"

    /**
     * Align the back button behavior with Android S
     * where moving root activities to background instead of finishing activities.
     * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
     */
    override fun onBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                // For non-root activities, use the default implementation to finish them.
                super.onBackPressed()
            }
            return
        }

        // Use the default back button implementation on Android S
        // because it's doing more than [Activity.moveTaskToBack] in fact.
        super.onBackPressed()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "🔚 MainActivity destroyed")
    }
}