// android/app/src/main/java/com/xevoxmobileapp/HBandAndroidSDKModule.java
package com.xevoxmobileapp;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

// HBand SDK imports
import com.hband.sdk.HBandSDK;
import com.hband.sdk.callback.ScanCallback;
import com.hband.sdk.callback.ConnectCallback;
import com.hband.sdk.callback.DataCallback;
import com.hband.sdk.model.DeviceInfo;
import com.hband.sdk.model.HealthData;
import com.hband.sdk.model.UserProfile;

import java.util.HashMap;
import java.util.Map;

public class HBandAndroidSDKModule extends ReactContextBaseJavaModule {
    private static final String TAG = "HBandAndroidSDK";
    private static final String MODULE_NAME = "HBandAndroidSDK";

    private ReactApplicationContext reactContext;
    private HBandSDK hBandSDK;
    private BluetoothAdapter bluetoothAdapter;
    private boolean isScanning = false;
    private boolean isConnected = false;
    private DeviceInfo connectedDevice = null;

    public HBandAndroidSDKModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeSDK();
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void initializeSDK() {
        try {
            // Initialize HBand SDK
            hBandSDK = HBandSDK.getInstance();
            
            // Get Bluetooth adapter
            BluetoothManager bluetoothManager = (BluetoothManager) reactContext.getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager != null) {
                bluetoothAdapter = bluetoothManager.getAdapter();
            }
            
            Log.d(TAG, "HBand SDK initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize HBand SDK: " + e.getMessage());
        }
    }

    @ReactMethod
    public void initialize(Promise promise) {
        try {
            // Check if device supports Bluetooth LE
            if (!reactContext.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", "Bluetooth LE not supported");
                promise.resolve(result);
                return;
            }

            // Check if Bluetooth is enabled
            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", "Bluetooth not enabled");
                promise.resolve(result);
                return;
            }

            // Initialize HBand SDK
            hBandSDK.initialize(reactContext, new HBandSDK.InitCallback() {
                @Override
                public void onSuccess() {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("message", "SDK initialized successfully");
                    promise.resolve(result);
                }

                @Override
                public void onFailure(String error) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", false);
                    result.putString("message", error);
                    promise.resolve(result);
                }
            });

        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void startScan(int timeoutMs, Promise promise) {
        try {
            if (isScanning) {
                hBandSDK.stopScan();
                isScanning = false;
            }

            isScanning = true;
            
            hBandSDK.startScan(new ScanCallback() {
                @Override
                public void onDeviceFound(DeviceInfo device) {
                    Log.d(TAG, "Device found: " + device.getName());
                    
                    WritableMap deviceMap = Arguments.createMap();
                    deviceMap.putString("id", device.getId());
                    deviceMap.putString("name", device.getName());
                    deviceMap.putString("address", device.getAddress());
                    deviceMap.putInt("rssi", device.getRssi());
                    deviceMap.putString("manufacturer", device.getManufacturer());
                    deviceMap.putString("deviceType", "smartwatch");
                    if (device.getBatteryLevel() > 0) {
                        deviceMap.putInt("batteryLevel", device.getBatteryLevel());
                    }
                    
                    sendEvent("onDeviceFound", deviceMap);
                }

                @Override
                public void onScanCompleted() {
                    Log.d(TAG, "Scan completed");
                    isScanning = false;
                    sendEvent("onScanStopped", Arguments.createMap());
                }

                @Override
                public void onError(String error) {
                    Log.e(TAG, "Scan error: " + error);
                    isScanning = false;
                    
                    WritableMap errorMap = Arguments.createMap();
                    errorMap.putString("message", error);
                    sendEvent("onError", errorMap);
                }
            });

            // Auto-stop scan after timeout
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (isScanning) {
                    stopScan(null);
                }
            }, timeoutMs);

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Scan started");
            promise.resolve(result);

        } catch (Exception e) {
            isScanning = false;
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void stopScan(Promise promise) {
        try {
            if (isScanning) {
                hBandSDK.stopScan();
                isScanning = false;
                sendEvent("onScanStopped", Arguments.createMap());
            }

            if (promise != null) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                promise.resolve(result);
            }

        } catch (Exception e) {
            if (promise != null) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", e.getMessage());
                promise.resolve(result);
            }
        }
    }

    @ReactMethod
    public void connectDevice(String deviceAddress, Promise promise) {
        try {
            hBandSDK.connect(deviceAddress, new ConnectCallback() {
                @Override
                public void onConnected(DeviceInfo device) {
                    Log.d(TAG, "Device connected: " + device.getName());
                    isConnected = true;
                    connectedDevice = device;
                    
                    WritableMap deviceMap = Arguments.createMap();
                    deviceMap.putString("id", device.getId());
                    deviceMap.putString("name", device.getName());
                    deviceMap.putString("address", device.getAddress());
                    deviceMap.putString("manufacturer", device.getManufacturer());
                    
                    WritableMap statusMap = Arguments.createMap();
                    statusMap.putBoolean("connected", true);
                    statusMap.putMap("device", deviceMap);
                    statusMap.putString("message", "Connected successfully");
                    
                    sendEvent("onConnectionStateChanged", statusMap);
                }

                @Override
                public void onDisconnected() {
                    Log.d(TAG, "Device disconnected");
                    isConnected = false;
                    connectedDevice = null;
                    
                    WritableMap statusMap = Arguments.createMap();
                    statusMap.putBoolean("connected", false);
                    statusMap.putString("message", "Disconnected");
                    
                    sendEvent("onConnectionStateChanged", statusMap);
                }

                @Override
                public void onError(String error) {
                    Log.e(TAG, "Connection error: " + error);
                    isConnected = false;
                    connectedDevice = null;
                    
                    WritableMap errorMap = Arguments.createMap();
                    errorMap.putString("message", error);
                    sendEvent("onError", errorMap);
                }
            });

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Connection initiated");
            promise.resolve(result);

        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        try {
            if (isConnected && connectedDevice != null) {
                hBandSDK.disconnect();
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);

        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void syncUserProfile(ReadableMap profileData, Promise promise) {
        try {
            if (!isConnected) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", "No device connected");
                promise.resolve(result);
                return;
            }

            // Create user profile from React Native data
            UserProfile profile = new UserProfile();
            profile.setAge(profileData.hasKey("age") ? profileData.getInt("age") : 25);
            profile.setHeight(profileData.hasKey("height") ? profileData.getInt("height") : 170);
            profile.setWeight(profileData.hasKey("weight") ? profileData.getInt("weight") : 70);
            profile.setGender(profileData.hasKey("gender") ? profileData.getInt("gender") : 0);
            profile.setTargetSteps(profileData.hasKey("targetSteps") ? profileData.getInt("targetSteps") : 10000);

            hBandSDK.syncUserProfile(profile, new DataCallback<Boolean>() {
                @Override
                public void onSuccess(Boolean result) {
                    WritableMap response = Arguments.createMap();
                    response.putBoolean("success", result);
                    promise.resolve(response);
                }

                @Override
                public void onError(String error) {
                    WritableMap response = Arguments.createMap();
                    response.putBoolean("success", false);
                    response.putString("message", error);
                    promise.resolve(response);
                }
            });

        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void getHealthData(Promise promise) {
        try {
            if (!isConnected) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", "No device connected");
                promise.resolve(result);
                return;
            }

            hBandSDK.getHealthData(new DataCallback<HealthData>() {
                @Override
                public void onSuccess(HealthData healthData) {
                    WritableMap dataMap = Arguments.createMap();
                    dataMap.putInt("steps", healthData.getSteps());
                    dataMap.putInt("heartRate", healthData.getHeartRate());
                    dataMap.putInt("systolicBP", healthData.getSystolicBP());
                    dataMap.putInt("diastolicBP", healthData.getDiastolicBP());
                    dataMap.putInt("bloodOxygen", healthData.getBloodOxygen());
                    dataMap.putDouble("sleepDuration", healthData.getSleepDuration());
                    dataMap.putInt("sleepQuality", healthData.getSleepQuality());
                    dataMap.putInt("calories", healthData.getCalories());
                    dataMap.putDouble("distance", healthData.getDistance());

                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putMap("data", dataMap);
                    promise.resolve(result);
                }

                @Override
                public void onError(String error) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", false);
                    result.putString("message", error);
                    promise.resolve(result);
                }
            });

        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void startRealTimeMonitoring(Promise promise) {
        try {
            if (!isConnected) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", "No device connected");
                promise.resolve(result);
                return;
            }

            hBandSDK.startRealTimeMonitoring(new DataCallback<HealthData>() {
                @Override
                public void onSuccess(HealthData healthData) {
                    WritableMap dataMap = Arguments.createMap();
                    dataMap.putInt("steps", healthData.getSteps());
                    dataMap.putInt("heartRate", healthData.getHeartRate());
                    dataMap.putInt("systolicBP", healthData.getSystolicBP());
                    dataMap.putInt("diastolicBP", healthData.getDiastolicBP());
                    dataMap.putInt("bloodOxygen", healthData.getBloodOxygen());
                    dataMap.putInt("calories", healthData.getCalories());

                    sendEvent("onHealthDataReceived", dataMap);
                }

                @Override
                public void onError(String error) {
                    WritableMap errorMap = Arguments.createMap();
                    errorMap.putString("message", error);
                    sendEvent("onError", errorMap);
                }
            });

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);

        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void stopRealTimeMonitoring(Promise promise) {
        try {
            hBandSDK.stopRealTimeMonitoring();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);

        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", e.getMessage());
            promise.resolve(result);
        }
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("MODULE_NAME", MODULE_NAME);
        return constants;
    }
}