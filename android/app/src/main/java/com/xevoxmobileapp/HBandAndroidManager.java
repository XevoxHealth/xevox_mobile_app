package com.xevoxmobileapp;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.core.content.ContextCompat;
import android.Manifest;
import android.os.Build;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * HBand Android Manager integrated with React Native
 * Sends events to JavaScript layer via React Native bridge
 */
public class HBandAndroidManager {
    private static final String TAG = "HBandAndroidManager";
    
    private Context context;
    private ReactApplicationContext reactContext;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bluetoothScanner;
    private boolean isScanning = false;
    private boolean isConnected = false;
    private String connectedDeviceAddress = null;
    private Handler mainHandler;
    
    // Track discovered devices to avoid duplicates
    private Set<String> discoveredDevices = new HashSet<>();
    
    // For React Native integration
    public HBandAndroidManager(ReactApplicationContext reactContext) {
        this.context = reactContext;
        this.reactContext = reactContext;
        this.mainHandler = new Handler(Looper.getMainLooper());
        initializeBluetooth();
    }
    
    // For standalone usage (if needed)
    public HBandAndroidManager(Context context) {
        this.context = context;
        this.mainHandler = new Handler(Looper.getMainLooper());
        initializeBluetooth();
    }

    private void initializeBluetooth() {
        try {
            BluetoothManager bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager != null) {
                bluetoothAdapter = bluetoothManager.getAdapter();
                if (bluetoothAdapter != null && bluetoothAdapter.isEnabled()) {
                    bluetoothScanner = bluetoothAdapter.getBluetoothLeScanner();
                    Log.d(TAG, "✅ Bluetooth initialized successfully");
                    emitEvent("bluetoothInitialized", null);
                } else {
                    Log.w(TAG, "⚠️ Bluetooth adapter not enabled");
                    emitEvent("bluetoothError", createErrorMap("Bluetooth not enabled"));
                }
            } else {
                Log.e(TAG, "❌ Bluetooth manager not available");
                emitEvent("bluetoothError", createErrorMap("Bluetooth not available"));
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to initialize Bluetooth", e);
            emitEvent("bluetoothError", createErrorMap("Failed to initialize: " + e.getMessage()));
        }
    }

    public boolean initialize() {
        try {
            Log.d(TAG, "🔧 Initializing HBand SDK...");
            
            // Log device info for debugging
            Log.d(TAG, "📱 Device: " + android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL);
            Log.d(TAG, "📱 Android: " + android.os.Build.VERSION.RELEASE + " (API " + android.os.Build.VERSION.SDK_INT + ")");
            
            // Verify permissions are granted
            if (!hasRequiredPermissions()) {
                Log.e(TAG, "❌ Required permissions not granted");
                emitEvent("bluetoothError", createErrorMap("Bluetooth permissions not granted"));
                return false;
            }
            
            // Re-initialize Bluetooth if needed
            initializeBluetooth();
            
            Log.d(TAG, "📝 HBand SDK initialized successfully");
            emitEvent("sdkInitialized", null);
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ HBand SDK initialization failed", e);
            emitEvent("bluetoothError", createErrorMap("SDK initialization failed: " + e.getMessage()));
            return false;
        }
    }

    private boolean hasRequiredPermissions() {
        List<String> requiredPermissions = new ArrayList<>();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+
            requiredPermissions.add(Manifest.permission.BLUETOOTH_SCAN);
            requiredPermissions.add(Manifest.permission.BLUETOOTH_CONNECT);
        } else {
            // Android < 12
            requiredPermissions.add(Manifest.permission.BLUETOOTH);
            requiredPermissions.add(Manifest.permission.BLUETOOTH_ADMIN);
        }
        
        requiredPermissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        
        for (String permission : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "❌ Missing permission: " + permission);
                return false;
            }
        }
        
        return true;
    }

    public boolean startScan() {
        try {
            Log.d(TAG, "🔍 Starting device scan...");
            
            // Check permissions first
            if (!hasRequiredPermissions()) {
                Log.e(TAG, "❌ Required permissions not granted for scanning");
                emitEvent("scanError", createErrorMap("Bluetooth permissions not granted"));
                return false;
            }
            
            // Check Bluetooth adapter
            if (bluetoothAdapter == null) {
                Log.e(TAG, "❌ Bluetooth adapter not available");
                emitEvent("scanError", createErrorMap("Bluetooth adapter not available"));
                return false;
            }
            
            if (!bluetoothAdapter.isEnabled()) {
                Log.e(TAG, "❌ Bluetooth not enabled");
                emitEvent("scanError", createErrorMap("Bluetooth not enabled"));
                return false;
            }
            
            // Get fresh scanner instance
            bluetoothScanner = bluetoothAdapter.getBluetoothLeScanner();
            if (bluetoothScanner == null) {
                Log.e(TAG, "❌ Bluetooth LE scanner not available");
                emitEvent("scanError", createErrorMap("BLE scanner not available"));
                return false;
            }

            if (isScanning) {
                Log.w(TAG, "⚠️ Already scanning - stopping first");
                stopScan();
                // Wait before restarting
                mainHandler.postDelayed(() -> startScanInternal(), 2000);
                return true;
            }

            // Add delay to avoid registration conflicts (common on Motorola devices)
            Log.d(TAG, "⏳ Starting scan with 1 second delay...");
            mainHandler.postDelayed(() -> startScanInternal(), 1000);
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to start scan", e);
            emitEvent("scanError", createErrorMap("Failed to start scan: " + e.getMessage()));
            isScanning = false;
            return false;
        }
    }
    
    private void startScanInternal() {
        try {
            // Clear previous discoveries
            discoveredDevices.clear();
            isScanning = true;
            
            Log.d(TAG, "🔧 Starting simple BLE scan...");
            
            // Use the most basic scan possible to avoid Motorola registration issues
            bluetoothScanner.startScan(scanCallback);
            
            Log.d(TAG, "✅ Simple Bluetooth LE scan started");
            Log.d(TAG, "📡 Scanning for ALL Bluetooth LE devices...");
            
            emitEvent("scanStarted", null);
            
            // Auto-stop scan after 30 seconds
            mainHandler.postDelayed(() -> {
                if (isScanning) {
                    Log.d(TAG, "⏱️ Auto-stopping scan after 30 seconds");
                    stopScan();
                }
            }, 30000);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Simple scan failed", e);
            isScanning = false;
            emitEvent("scanError", createErrorMap("Scan failed: " + e.getMessage()));
            
            Log.e(TAG, "💡 Scan failed suggestions:");
            Log.e(TAG, "   1. Restart Bluetooth in device settings");
            Log.e(TAG, "   2. Reboot device");
            Log.e(TAG, "   3. Try on different Android device");
        }
    }

    public void stopScan() {
        try {
            if (bluetoothScanner != null && isScanning) {
                bluetoothScanner.stopScan(scanCallback);
                isScanning = false;
                Log.d(TAG, "⏹️ Scan stopped");
                Log.d(TAG, "📊 Total unique devices discovered: " + discoveredDevices.size());
                emitEvent("scanStopped", null);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error stopping scan", e);
            isScanning = false;
        }
    }

    public boolean connectDevice(String deviceAddress) {
        try {
            Log.d(TAG, "🔗 Connecting to device: " + deviceAddress);
            
            if (!hasRequiredPermissions()) {
                Log.e(TAG, "❌ Missing permissions for connection");
                emitEvent("connectionError", createErrorMap("Missing Bluetooth permissions"));
                return false;
            }
            
            // Stop scanning before connecting
            if (isScanning) {
                stopScan();
            }
            
            // For now, simulate connection (replace with actual HBand SDK connection)
            connectedDeviceAddress = deviceAddress;
            isConnected = true;
            
            WritableMap deviceInfo = Arguments.createMap();
            deviceInfo.putString("address", deviceAddress);
            deviceInfo.putBoolean("connected", true);
            emitEvent("connectionStatusChanged", deviceInfo);
            
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Connection error", e);
            emitEvent("connectionError", createErrorMap("Connection failed: " + e.getMessage()));
            return false;
        }
    }

    public void disconnect() {
        try {
            isConnected = false;
            String disconnectedAddress = connectedDeviceAddress;
            connectedDeviceAddress = null;
            
            WritableMap deviceInfo = Arguments.createMap();
            deviceInfo.putString("address", disconnectedAddress);
            deviceInfo.putBoolean("connected", false);
            emitEvent("connectionStatusChanged", deviceInfo);
            
            Log.d(TAG, "🔌 Disconnected");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Disconnect error", e);
        }
    }

    public boolean getHealthData() {
        try {
            Log.d(TAG, "📊 Getting health data...");
            
            if (!isConnected) {
                Log.w(TAG, "⚠️ Not connected to any device");
                emitEvent("healthDataError", createErrorMap("No device connected"));
                return false;
            }
            
            // Return mock data (simulate async operation)
            mainHandler.postDelayed(() -> {
                WritableMap healthData = Arguments.createMap();
                healthData.putInt("steps", 8543);
                healthData.putInt("heartRate", 78);
                healthData.putInt("calories", 324);
                healthData.putDouble("distance", 6.2);
                healthData.putString("timestamp", java.time.Instant.now().toString());
                
                emitEvent("healthDataReceived", healthData);
            }, 1000);
            
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Health data error", e);
            emitEvent("healthDataError", createErrorMap("Health data error: " + e.getMessage()));
            return false;
        }
    }

    // Simple scan callback
    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            try {
                BluetoothDevice device = result.getDevice();
                if (device == null) return;
                
                String deviceName = device.getName();
                String deviceAddress = device.getAddress();
                int rssi = result.getRssi();

                // Avoid duplicate discoveries
                if (discoveredDevices.contains(deviceAddress)) {
                    return;
                }
                discoveredDevices.add(deviceAddress);

                // Show ALL devices (no filtering)
                String displayName = deviceName != null ? deviceName : "Unknown Device";
                
                Log.d(TAG, "📱 DISCOVERED: " + displayName + " (" + deviceAddress + ") RSSI: " + rssi + " dBm");
                
                // Check if this looks like a fitness device
                boolean isPotentialFitnessDevice = false;
                if (deviceName != null) {
                    String lowerName = deviceName.toLowerCase();
                    isPotentialFitnessDevice = lowerName.contains("veepoo") ||
                                             lowerName.contains("hband") ||
                                             lowerName.contains("watch") ||
                                             lowerName.contains("fitness") ||
                                             lowerName.contains("band") ||
                                             lowerName.contains("smart") ||
                                             lowerName.contains("tracker") ||
                                             lowerName.contains("health") ||
                                             lowerName.contains("mi") ||
                                             lowerName.contains("xiaomi") ||
                                             lowerName.contains("amazfit") ||
                                             lowerName.contains("huawei") ||
                                             lowerName.contains("samsung") ||
                                             lowerName.contains("garmin") ||
                                             lowerName.contains("fitbit");
                }
                
                if (isPotentialFitnessDevice) {
                    Log.d(TAG, "🎯 POTENTIAL FITNESS DEVICE: " + displayName);
                }
                
                // Send device info to React Native
                WritableMap deviceInfo = Arguments.createMap();
                deviceInfo.putString("name", displayName);
                deviceInfo.putString("address", deviceAddress);
                deviceInfo.putInt("rssi", rssi);
                deviceInfo.putBoolean("isFitnessDevice", isPotentialFitnessDevice);
                
                emitEvent("deviceFound", deviceInfo);
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Error processing scan result", e);
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            Log.e(TAG, "❌ Bluetooth scan failed with error code: " + errorCode);
            
            String errorMessage;
            switch (errorCode) {
                case SCAN_FAILED_ALREADY_STARTED:
                    errorMessage = "Scan already started";
                    break;
                case SCAN_FAILED_APPLICATION_REGISTRATION_FAILED:
                    errorMessage = "Application registration failed - try restarting Bluetooth";
                    break;
                case SCAN_FAILED_FEATURE_UNSUPPORTED:
                    errorMessage = "BLE feature unsupported";
                    break;
                case SCAN_FAILED_INTERNAL_ERROR:
                    errorMessage = "Internal Bluetooth error";
                    break;
                case SCAN_FAILED_OUT_OF_HARDWARE_RESOURCES:
                    errorMessage = "Out of hardware resources";
                    break;
                default:
                    errorMessage = "Unknown error: " + errorCode;
                    break;
            }
            
            Log.e(TAG, "❌ Scan failure details: " + errorMessage);
            Log.e(TAG, "💡 Try: Restart Bluetooth, reboot device, or test on different phone");
            isScanning = false;
            
            emitEvent("scanError", createErrorMap(errorMessage));
        }
    };

    // Helper methods for React Native bridge
    private void emitEvent(String eventName, WritableMap data) {
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, data);
        }
    }

    private WritableMap createErrorMap(String message) {
        WritableMap errorMap = Arguments.createMap();
        errorMap.putString("message", message);
        return errorMap;
    }

    // Getters
    public boolean isScanning() { return isScanning; }
    public boolean isConnected() { return isConnected; }
    public String getConnectedDeviceAddress() { return connectedDeviceAddress; }
    public boolean isBluetoothAvailable() { 
        return bluetoothAdapter != null && bluetoothAdapter.isEnabled(); 
    }
}