// 1. android/app/src/main/java/com/xevoxhealth/VeePooSDKModule.java
package com.xevoxhealth;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.veepoo.protocol.VPOperateManager;
import com.veepoo.protocol.listener.base.IBleWriteResponse;
import com.veepoo.protocol.listener.data.IDeviceFuctionDataListener;
import com.veepoo.protocol.listener.data.IPwdDataListener;
import com.veepoo.protocol.listener.data.ISocialMsgDataListener;
import com.veepoo.protocol.listener.data.IHealthDataListener;
import com.veepoo.protocol.model.datas.PwdData;
import com.veepoo.protocol.model.datas.FunctionDeviceSupportData;
import com.veepoo.protocol.model.datas.FunctionSocailMsgData;
import com.veepoo.protocol.model.datas.HealthData;

public class VeePooSDKModule extends ReactContextBaseJavaModule {
    private static final String TAG = "VeePooSDK";
    private ReactApplicationContext reactContext;
    private VPOperateManager vpOperateManager;
    private BluetoothAdapter bluetoothAdapter;

    public VeePooSDKModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeBluetooth();
    }

    @Override
    public String getName() {
        return "VeePooSDK";
    }

    private void initializeBluetooth() {
        BluetoothManager bluetoothManager = (BluetoothManager) reactContext.getSystemService(Context.BLUETOOTH_SERVICE);
        bluetoothAdapter = bluetoothManager.getAdapter();
        vpOperateManager = VPOperateManager.getMangerInstance(reactContext.getApplicationContext());
    }

    @ReactMethod
    public void initialize(Promise promise) {
        try {
            if (bluetoothAdapter == null) {
                promise.reject("BLUETOOTH_NOT_SUPPORTED", "Bluetooth is not supported on this device");
                return;
            }
            
            if (!bluetoothAdapter.isEnabled()) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth is not enabled");
                return;
            }

            // Initialize VeePoo SDK
            // Enable logging for debugging
            VpLogger.setDebug(true);
            
            promise.resolve("SDK initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Initialization error", e);
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setDebugEnabled(boolean enabled, Promise promise) {
        try {
            VpLogger.setDebug(enabled);
            promise.resolve("Debug mode set to: " + enabled);
        } catch (Exception e) {
            promise.reject("DEBUG_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startScanDevice(Promise promise) {
        try {
            vpOperateManager.startScanDevice(new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    Log.d(TAG, "Scan response code: " + code);
                }
            }, new IScanListener() {
                @Override
                public void onDeviceFound(String name, String address, int rssi) {
                    WritableMap device = Arguments.createMap();
                    device.putString("id", address);
                    device.putString("name", name);
                    device.putString("address", address);
                    device.putInt("rssi", rssi);
                    
                    sendEvent("DeviceDiscovered", device);
                }
                
                @Override
                public void onScanFinished() {
                    sendEvent("ScanFinished", null);
                }
            });
            
            promise.resolve("Scan started");
        } catch (Exception e) {
            Log.e(TAG, "Scan start error", e);
            promise.reject("SCAN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopScanDevice(Promise promise) {
        try {
            vpOperateManager.stopScanDevice();
            promise.resolve("Scan stopped");
        } catch (Exception e) {
            promise.reject("SCAN_STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void connectDevice(String deviceAddress, Promise promise) {
        try {
            vpOperateManager.connectDevice(deviceAddress, new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    if (code == 0) {
                        WritableMap result = Arguments.createMap();
                        result.putBoolean("success", true);
                        result.putString("message", "Device connected successfully");
                        promise.resolve(result);
                        
                        // Notify connection status change
                        WritableMap status = Arguments.createMap();
                        status.putBoolean("connected", true);
                        status.putString("deviceAddress", deviceAddress);
                        sendEvent("ConnectionStatusChanged", status);
                    } else {
                        promise.reject("CONNECTION_ERROR", "Failed to connect. Error code: " + code);
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Connection error", e);
            promise.reject("CONNECTION_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void disconnectDevice(Promise promise) {
        try {
            vpOperateManager.disconnectWatch(new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    WritableMap status = Arguments.createMap();
                    status.putBoolean("connected", false);
                    sendEvent("ConnectionStatusChanged", status);
                    
                    promise.resolve("Device disconnected");
                }
            });
        } catch (Exception e) {
            promise.reject("DISCONNECT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void confirmDevicePwd(String password, boolean is24HourModel, Promise promise) {
        try {
            vpOperateManager.confirmDevicePwd(new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    Log.d(TAG, "Password confirmation response: " + code);
                }
            }, new IPwdDataListener() {
                @Override
                public void onPwdDataChange(PwdData pwdData) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("message", "Password confirmed");
                    promise.resolve(result);
                }
            }, new IDeviceFuctionDataListener() {
                @Override
                public void onFunctionSupportDataChange(FunctionDeviceSupportData functionSupport) {
                    // Handle function support data
                    Log.d(TAG, "Function support: " + functionSupport.toString());
                }
            }, new ISocialMsgDataListener() {
                @Override
                public void onSocialMsgSupportDataChange(FunctionSocailMsgData socailMsgData) {
                    // Handle social message data
                    Log.d(TAG, "Social message support: " + socailMsgData.toString());
                }
            }, password, is24HourModel);
        } catch (Exception e) {
            Log.e(TAG, "Password confirmation error", e);
            promise.reject("PWD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void syncPersonInfo(ReadableMap personInfo, Promise promise) {
        try {
            // Extract person info from ReadableMap
            int age = personInfo.hasKey("age") ? personInfo.getInt("age") : 25;
            int height = personInfo.hasKey("height") ? personInfo.getInt("height") : 170;
            int weight = personInfo.hasKey("weight") ? personInfo.getInt("weight") : 70;
            int gender = personInfo.hasKey("gender") ? personInfo.getInt("gender") : 0;

            // Create PersonInfoData object and sync
            PersonInfoData personData = new PersonInfoData(age, height, weight, gender);
            
            vpOperateManager.syncPersonInfo(new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    if (code == 0) {
                        WritableMap result = Arguments.createMap();
                        result.putBoolean("success", true);
                        result.putString("message", "Personal info synced");
                        promise.resolve(result);
                    } else {
                        promise.reject("SYNC_ERROR", "Failed to sync personal info. Error code: " + code);
                    }
                }
            }, personData);
        } catch (Exception e) {
            Log.e(TAG, "Sync person info error", e);
            promise.reject("SYNC_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getHealthData(Promise promise) {
        try {
            vpOperateManager.readHealthData(new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    Log.d(TAG, "Health data request response: " + code);
                }
            }, new IHealthDataListener() {
                @Override
                public void onHealthDataChange(HealthData healthData) {
                    WritableMap result = formatHealthData(healthData);
                    promise.resolve(result);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Get health data error", e);
            promise.reject("HEALTH_DATA_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startRealTimeData(Promise promise) {
        try {
            vpOperateManager.startRealTimeData(new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    if (code == 0) {
                        promise.resolve("Real-time monitoring started");
                    } else {
                        promise.reject("REALTIME_ERROR", "Failed to start real-time monitoring");
                    }
                }
            }, new IHealthDataListener() {
                @Override
                public void onHealthDataChange(HealthData healthData) {
                    WritableMap data = formatHealthData(healthData);
                    sendEvent("HealthDataReceived", data);
                }
            });
        } catch (Exception e) {
            promise.reject("REALTIME_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopRealTimeData(Promise promise) {
        try {
            vpOperateManager.stopRealTimeData(new IBleWriteResponse() {
                @Override
                public void onResponse(int code) {
                    promise.resolve("Real-time monitoring stopped");
                }
            });
        } catch (Exception e) {
            promise.reject("STOP_REALTIME_ERROR", e.getMessage());
        }
    }

    private WritableMap formatHealthData(HealthData healthData) {
        WritableMap result = Arguments.createMap();
        
        if (healthData != null) {
            // Basic metrics
            result.putInt("steps", healthData.getSteps());
            result.putInt("heartRate", healthData.getHeartRate());
            result.putInt("calories", healthData.getCalories());
            result.putDouble("distance", healthData.getDistance());
            
            // Blood pressure and cardiovascular
            result.putInt("bloodPressureSystolic", healthData.getBloodPressureSystolic());
            result.putInt("bloodPressureDiastolic", healthData.getBloodPressureDiastolic());
            result.putInt("bloodOxygen", healthData.getBloodOxygen());
            
            // HRV and advanced heart metrics
            result.putInt("hrv", healthData.getHRV() != null ? healthData.getHRV() : 0);
            result.putInt("hrvRMSSD", healthData.getHRVRMSSD() != null ? healthData.getHRVRMSSD() : 0);
            result.putInt("stressLevel", healthData.getStressLevel() != null ? healthData.getStressLevel() : 0);
            
            // ECG data
            result.putString("ecgRhythm", healthData.getECGRhythm() != null ? healthData.getECGRhythm() : "Unknown");
            result.putInt("ecgQuality", healthData.getECGQuality() != null ? healthData.getECGQuality() : 0);
            result.putInt("ecgHeartRate", healthData.getECGHeartRate() != null ? healthData.getECGHeartRate() : 0);
            
            // Blood components (if available from device)
            result.putInt("bloodGlucose", healthData.getBloodGlucose() != null ? healthData.getBloodGlucose() : 0);
            result.putDouble("hemoglobin", healthData.getHemoglobin() != null ? healthData.getHemoglobin() : 0.0);
            result.putInt("totalCholesterol", healthData.getTotalCholesterol() != null ? healthData.getTotalCholesterol() : 0);
            result.putInt("plateletCount", healthData.getPlateletCount() != null ? healthData.getPlateletCount() : 0);
            
            // Enhanced sleep metrics
            result.putInt("sleepDuration", healthData.getSleepDuration());
            result.putInt("sleepQuality", healthData.getSleepQuality());
            result.putInt("deepSleep", healthData.getDeepSleep() != null ? healthData.getDeepSleep() : 0);
            result.putInt("lightSleep", healthData.getLightSleep() != null ? healthData.getLightSleep() : 0);
            result.putInt("remSleep", healthData.getREMSleep() != null ? healthData.getREMSleep() : 0);
            result.putInt("sleepEfficiency", healthData.getSleepEfficiency() != null ? healthData.getSleepEfficiency() : 0);
            result.putInt("sleepLatency", healthData.getSleepLatency() != null ? healthData.getSleepLatency() : 0);
            result.putInt("numberOfAwakenings", healthData.getNumberOfAwakenings() != null ? healthData.getNumberOfAwakenings() : 0);
            
            // Temperature readings
            result.putDouble("temperature", healthData.getTemperature());
            result.putDouble("skinTemperature", healthData.getSkinTemperature() != null ? healthData.getSkinTemperature() : 0.0);
            result.putDouble("coreTemperature", healthData.getCoreTemperature() != null ? healthData.getCoreTemperature() : 0.0);
            
            // Activity and respiratory
            result.putInt("activeMinutes", healthData.getActiveMinutes() != null ? healthData.getActiveMinutes() : 0);
            result.putInt("sedentaryMinutes", healthData.getSedentaryMinutes() != null ? healthData.getSedentaryMinutes() : 0);
            result.putInt("respiratoryRate", healthData.getRespiratoryRate() != null ? healthData.getRespiratoryRate() : 0);
            
            // Mental health indicators
            result.putInt("mentalFatigue", healthData.getMentalFatigue() != null ? healthData.getMentalFatigue() : 0);
            result.putInt("cognitiveLoad", healthData.getCognitiveLoad() != null ? healthData.getCognitiveLoad() : 0);
            result.putInt("recoveryStatus", healthData.getRecoveryStatus() != null ? healthData.getRecoveryStatus() : 0);
            
            // Timestamps
            result.putString("timestamp", String.valueOf(System.currentTimeMillis()));
            result.putString("heartRateTimestamp", String.valueOf(System.currentTimeMillis()));
            result.putString("hrvTimestamp", String.valueOf(System.currentTimeMillis()));
            result.putString("ecgTimestamp", String.valueOf(System.currentTimeMillis()));
            result.putString("sleepTimestamp", String.valueOf(System.currentTimeMillis()));
            result.putString("bloodPressureTimestamp", String.valueOf(System.currentTimeMillis()));
            result.putString("temperatureTimestamp", String.valueOf(System.currentTimeMillis()));
        }
        
        return result;
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    // Custom listener interface for device scanning
    public interface IScanListener {
        void onDeviceFound(String name, String address, int rssi);
        void onScanFinished();
    }
}
