package com.xevoxmobileapp

import android.app.Application
import android.util.Log

class MainApplication : Application() {

    companion object {
        private const val TAG = "XEVOXMainApplication"
    }

    override fun onCreate() {
        try {
            super.onCreate()
            Log.d(TAG, "✅ XEVOX Mobile App MainApplication started")
            Log.d(TAG, "🔵 Pure Android mode - HBand SDK ready")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in MainApplication: ${e.message}", e)
            // Don't crash, just log the error
        }
    }
}