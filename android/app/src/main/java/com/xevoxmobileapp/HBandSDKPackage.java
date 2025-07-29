package com.xevoxmobileapp;

import android.util.Log;

// TODO: Uncomment when React Native dependencies are working
// import com.facebook.react.ReactPackage;
// import com.facebook.react.bridge.NativeModule;
// import com.facebook.react.bridge.ReactApplicationContext;
// import com.facebook.react.uimanager.ViewManager;
// import java.util.ArrayList;
// import java.util.Collections;
// import java.util.List;

/**
 * HBand SDK Package for React Native
 * Currently disabled until React Native dependencies are properly configured
 */
public class HBandSDKPackage {
    private static final String TAG = "HBandSDKPackage";
    
    public HBandSDKPackage() {
        Log.d(TAG, "📝 HBandSDKPackage created (React Native bridge disabled)");
        Log.d(TAG, "💡 HBand SDK functionality available through HBandAndroidManager");
    }
    
    // TODO: Restore React Native package methods when RN dependencies are working
    /*
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new HBandSDKModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
    */
}