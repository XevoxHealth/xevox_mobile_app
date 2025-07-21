// ios/xevoxmobileapp/HBandSDK.h
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface HBandSDK : RCTEventEmitter <RCTBridgeModule>

@end

// ios/xevoxmobileapp/HBandSDK.m
#import "HBandSDK.h"
#import <CoreBluetooth/CoreBluetooth.h>

// Import HBand iOS SDK
#import <HBandSDK/HBandSDK.h>

@interface HBandSDK () <CBCentralManagerDelegate, HBandSDKDelegate>

@property (nonatomic, strong) CBCentralManager *centralManager;
@property (nonatomic, strong) HBandManager *hbandManager;
@property (nonatomic, strong) NSMutableArray *discoveredDevices;
@property (nonatomic, assign) BOOL isScanning;
@property (nonatomic, assign) BOOL isConnected;
@property (nonatomic, strong) HBandDevice *connectedDevice;

@end

@implementation HBandSDK

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        _discoveredDevices = [[NSMutableArray alloc] init];
        _isScanning = NO;
        _isConnected = NO;
        
        // Initialize Core Bluetooth
        _centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:nil];
        
        // Initialize HBand SDK
        _hbandManager = [HBandManager sharedInstance];
        _hbandManager.delegate = self;
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"onDeviceFound",
        @"onConnectionStateChanged",
        @"onHealthDataReceived",
        @"onBatteryLevelChanged",
        @"onScanStopped",
        @"onError"
    ];
}

RCT_EXPORT_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    // Check if Bluetooth is supported
    if (self.centralManager.state == CBManagerStateUnsupported) {
        NSDictionary *result = @{
            @"success": @NO,
            @"message": @"Bluetooth not supported on this device"
        };
        resolve(result);
        return;
    }
    
    // Initialize HBand SDK
    [self.hbandManager initializeWithCompletion:^(BOOL success, NSError *error) {
        if (success) {
            NSDictionary *result = @{
                @"success": @YES,
                @"message": @"SDK initialized successfully"
            };
            resolve(result);
        } else {
            NSDictionary *result = @{
                @"success": @NO,
                @"message": error.localizedDescription ?: @"SDK initialization failed"
            };
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(startScan:(NSInteger)timeoutMs
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    // Check Bluetooth state
    if (self.centralManager.state != CBManagerStatePoweredOn) {
        NSDictionary *result = @{
            @"success": @NO,
            @"message": @"Bluetooth is not powered on"
        };
        resolve(result);
        return;
    }
    
    // Stop any existing scan
    if (self.isScanning) {
        [self.hbandManager stopScan];
    }
    
    // Clear previous discoveries
    [self.discoveredDevices removeAllObjects];
    self.isScanning = YES;
    
    // Start scanning
    [self.hbandManager startScanWithCompletion:^(NSError *error) {
        if (error) {
            self.isScanning = NO;
            NSDictionary *result = @{
                @"success": @NO,
                @"message": error.localizedDescription
            };
            resolve(result);
        } else {
            NSDictionary *result = @{
                @"success": @YES,
                @"message": @"Scan started"
            };
            resolve(result);
            
            // Auto-stop scan after timeout
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeoutMs / 1000.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                if (self.isScanning) {
                    [self stopScanWithResolver:nil rejecter:nil];
                }
            });
        }
    }];
}

RCT_EXPORT_METHOD(stopScan:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    [self stopScanWithResolver:resolve rejecter:reject];
}

- (void)stopScanWithResolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    if (self.isScanning) {
        [self.hbandManager stopScan];
        self.isScanning = NO;
        [self sendEventWithName:@"onScanStopped" body:@{}];
    }
    
    if (resolve) {
        NSDictionary *result = @{
            @"success": @YES
        };
        resolve(result);
    }
}

RCT_EXPORT_METHOD(connectDevice:(NSString *)deviceAddress
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    // Find the device in discovered devices
    HBandDevice *deviceToConnect = nil;
    for (HBandDevice *device in self.discoveredDevices) {
        if ([device.address isEqualToString:deviceAddress]) {
            deviceToConnect = device;
            break;
        }
    }
    
    if (!deviceToConnect) {
        NSDictionary *result = @{
            @"success": @NO,
            @"message": @"Device not found in discovered devices"
        };
        resolve(result);
        return;
    }
    
    // Connect to device
    [self.hbandManager connectToDevice:deviceToConnect completion:^(BOOL success, NSError *error) {
        if (success) {
            NSDictionary *result = @{
                @"success": @YES,
                @"message": @"Connection initiated"
            };
            resolve(result);
        } else {
            NSDictionary *result = @{
                @"success": @NO,
                @"message": error.localizedDescription ?: @"Connection failed"
            };
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(disconnect:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (self.isConnected && self.connectedDevice) {
        [self.hbandManager disconnect];
    }
    
    NSDictionary *result = @{
        @"success": @YES
    };
    resolve(result);
}

RCT_EXPORT_METHOD(syncUserProfile:(NSDictionary *)profileData
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!self.isConnected) {
        NSDictionary *result = @{
            @"success": @NO,
            @"message": @"No device connected"
        };
        resolve(result);
        return;
    }
    
    // Create user profile
    HBandUserProfile *profile = [[HBandUserProfile alloc] init];
    profile.age = [profileData[@"age"] integerValue] ?: 25;
    profile.height = [profileData[@"height"] integerValue] ?: 170;
    profile.weight = [profileData[@"weight"] integerValue] ?: 70;
    profile.gender = [profileData[@"gender"] integerValue] ?: 0;
    profile.targetSteps = [profileData[@"targetSteps"] integerValue] ?: 10000;
    
    [self.hbandManager syncUserProfile:profile completion:^(BOOL success, NSError *error) {
        NSDictionary *result = @{
            @"success": @(success),
            @"message": success ? @"Profile synced" : (error.localizedDescription ?: @"Sync failed")
        };
        resolve(result);
    }];
}

RCT_EXPORT_METHOD(getHealthData:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!self.isConnected) {
        NSDictionary *result = @{
            @"success": @NO,
            @"message": @"No device connected"
        };
        resolve(result);
        return;
    }
    
    [self.hbandManager getHealthDataWithCompletion:^(HBandHealthData *healthData, NSError *error) {
        if (healthData) {
            NSDictionary *dataDict = @{
                @"steps": @(healthData.steps),
                @"heartRate": @(healthData.heartRate),
                @"systolicBP": @(healthData.systolicBP),
                @"diastolicBP": @(healthData.diastolicBP),
                @"bloodOxygen": @(healthData.bloodOxygen),
                @"sleepDuration": @(healthData.sleepDuration),
                @"sleepQuality": @(healthData.sleepQuality),
                @"calories": @(healthData.calories),
                @"distance": @(healthData.distance)
            };
            
            NSDictionary *result = @{
                @"success": @YES,
                @"data": dataDict
            };
            resolve(result);
        } else {
            NSDictionary *result = @{
                @"success": @NO,
                @"message": error.localizedDescription ?: @"Failed to get health data"
            };
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(startRealTimeMonitoring:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!self.isConnected) {
        NSDictionary *result = @{
            @"success": @NO,
            @"message": @"No device connected"
        };
        resolve(result);
        return;
    }
    
    [self.hbandManager startRealTimeMonitoring:^(NSError *error) {
        if (error) {
            NSDictionary *result = @{
                @"success": @NO,
                @"message": error.localizedDescription
            };
            resolve(result);
        } else {
            NSDictionary *result = @{
                @"success": @YES
            };
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(stopRealTimeMonitoring:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    [self.hbandManager stopRealTimeMonitoring];
    
    NSDictionary *result = @{
        @"success": @YES
    };
    resolve(result);
}

#pragma mark - CBCentralManagerDelegate

- (void)centralManagerDidUpdateState:(CBCentralManager *)central {
    switch (central.state) {
        case CBManagerStatePoweredOn:
            NSLog(@"Bluetooth is powered on");
            break;
        case CBManagerStatePoweredOff:
            NSLog(@"Bluetooth is powered off");
            break;
        case CBManagerStateUnsupported:
            NSLog(@"Bluetooth is not supported");
            break;
        default:
            NSLog(@"Bluetooth state: %ld", (long)central.state);
            break;
    }
}

#pragma mark - HBandSDKDelegate

- (void)hbandManager:(HBandManager *)manager didDiscoverDevice:(HBandDevice *)device {
    // Add to discovered devices if not already present
    BOOL deviceExists = NO;
    for (HBandDevice *existingDevice in self.discoveredDevices) {
        if ([existingDevice.address isEqualToString:device.address]) {
            deviceExists = YES;
            break;
        }
    }
    
    if (!deviceExists) {
        [self.discoveredDevices addObject:device];
        
        // Send event to React Native
        NSDictionary *deviceDict = @{
            @"id": device.identifier ?: device.address,
            @"name": device.name ?: @"Unknown Device",
            @"address": device.address,
            @"rssi": @(device.rssi),
            @"manufacturer": device.manufacturer ?: @"Unknown",
            @"deviceType": @"smartwatch",
            @"batteryLevel": device.batteryLevel > 0 ? @(device.batteryLevel) : [NSNull null]
        };
        
        [self sendEventWithName:@"onDeviceFound" body:deviceDict];
    }
}

- (void)hbandManager:(HBandManager *)manager didConnectToDevice:(HBandDevice *)device {
    self.isConnected = YES;
    self.connectedDevice = device;
    
    NSDictionary *deviceDict = @{
        @"id": device.identifier ?: device.address,
        @"name": device.name ?: @"Unknown Device",
        @"address": device.address,
        @"manufacturer": device.manufacturer ?: @"Unknown"
    };
    
    NSDictionary *statusDict = @{
        @"connected": @YES,
        @"device": deviceDict,
        @"message": @"Connected successfully"
    };
    
    [self sendEventWithName:@"onConnectionStateChanged" body:statusDict];
}

- (void)hbandManager:(HBandManager *)manager didDisconnectFromDevice:(HBandDevice *)device {
    self.isConnected = NO;
    self.connectedDevice = nil;
    
    NSDictionary *statusDict = @{
        @"connected": @NO,
        @"message": @"Disconnected"
    };
    
    [self sendEventWithName:@"onConnectionStateChanged" body:statusDict];
}

- (void)hbandManager:(HBandManager *)manager didReceiveHealthData:(HBandHealthData *)healthData {
    NSDictionary *dataDict = @{
        @"steps": @(healthData.steps),
        @"heartRate": @(healthData.heartRate),
        @"systolicBP": @(healthData.systolicBP),
        @"diastolicBP": @(healthData.diastolicBP),
        @"bloodOxygen": @(healthData.bloodOxygen),
        @"calories": @(healthData.calories)
    };
    
    [self sendEventWithName:@"onHealthDataReceived" body:dataDict];
}

- (void)hbandManager:(HBandManager *)manager didUpdateBatteryLevel:(NSInteger)batteryLevel {
    NSDictionary *batteryDict = @{
        @"level": @(batteryLevel)
    };
    
    [self sendEventWithName:@"onBatteryLevelChanged" body:batteryDict];
}

- (void)hbandManager:(HBandManager *)manager didFailWithError:(NSError *)error {
    NSDictionary *errorDict = @{
        @"message": error.localizedDescription ?: @"Unknown error"
    };
    
    [self sendEventWithName:@"onError" body:errorDict];
}

@end