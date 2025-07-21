#import "VeePooSDKManager.h"
#import <React/RCTLog.h>

@implementation VeePooSDKManager

RCT_EXPORT_MODULE(VeePooSDK);

- (instancetype)init {
    self = [super init];
    if (self) {
        _discoveredDevices = [[NSMutableArray alloc] init];
        _isScanning = NO;
        [self initializeCentralManager];
    }
    return self;
}

- (void)initializeCentralManager {
    self.centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:nil];
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"DeviceDiscovered", @"ConnectionStatusChanged", @"HealthDataReceived", @"BluetoothError", @"ScanFinished"];
}

#pragma mark - React Native Methods

RCT_EXPORT_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        // Initialize GRDFUSDK if needed
        // Check if Bluetooth is available
        if (self.centralManager.state != CBManagerStatePoweredOn) {
            reject(@"BLUETOOTH_ERROR", @"Bluetooth is not available or not powered on", nil);
            return;
        }
        
        resolve(@"SDK initialized successfully");
    } @catch (NSException *exception) {
        reject(@"INIT_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(startScan:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (self.centralManager.state != CBManagerStatePoweredOn) {
            reject(@"BLUETOOTH_ERROR", @"Bluetooth is not powered on", nil);
            return;
        }
        
        if (self.isScanning) {
            [self stopScan:nil rejecter:nil];
        }
        
        [self.discoveredDevices removeAllObjects];
        self.isScanning = YES;
        
        // Scan for devices with specific service UUIDs or all devices
        [self.centralManager scanForPeripheralsWithServices:nil 
                                                    options:@{CBCentralManagerScanOptionAllowDuplicatesKey: @NO}];
        
        // Auto-stop scan after 10 seconds
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(10.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            if (self.isScanning) {
                [self stopScan:nil rejecter:nil];
                [self sendEventWithName:@"ScanFinished" body:nil];
            }
        });
        
        resolve(@"Scan started");
    } @catch (NSException *exception) {
        reject(@"SCAN_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(stopScan:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (self.isScanning) {
            [self.centralManager stopScan];
            self.isScanning = NO;
        }
        
        if (resolve) {
            resolve(@"Scan stopped");
        }
    } @catch (NSException *exception) {
        if (reject) {
            reject(@"SCAN_STOP_ERROR", exception.reason, nil);
        }
    }
}

RCT_EXPORT_METHOD(connectToDevice:(NSString *)deviceId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        CBPeripheral *peripheral = [self findPeripheralById:deviceId];
        if (!peripheral) {
            reject(@"DEVICE_NOT_FOUND", @"Device not found", nil);
            return;
        }
        
        [self.centralManager connectPeripheral:peripheral options:nil];
        
        // Store the resolve/reject blocks to call them in the delegate methods
        // You might want to store these in instance variables
        
        resolve(@{@"success": @YES, @"message": @"Connection initiated"});
    } @catch (NSException *exception) {
        reject(@"CONNECTION_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(disconnect:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (self.connectedPeripheral) {
            [self.centralManager cancelPeripheralConnection:self.connectedPeripheral];
        }
        resolve(@"Disconnection initiated");
    } @catch (NSException *exception) {
        reject(@"DISCONNECT_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getHealthData:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (!self.connectedPeripheral) {
            reject(@"NO_DEVICE", @"No device connected", nil);
            return;
        }
        
        // Implement health data reading based on the connected device characteristics
        // This would involve reading from specific BLE characteristics
        
        // For demo purposes, return mock data
        NSDictionary *healthData = @{
            @"steps": @8247,
            @"heartRate": @72,
            @"bloodPressureSystolic": @120,
            @"bloodPressureDiastolic": @80,
            @"bloodOxygen": @98,
            @"calories": @420,
            @"distance": @6200,
            @"sleepDuration": @480,
            @"sleepQuality": @85,
            @"temperature": @36.5,
            @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
        };
        
        resolve(healthData);
    } @catch (NSException *exception) {
        reject(@"HEALTH_DATA_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(startRealTimeMonitoring:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (!self.connectedPeripheral) {
            reject(@"NO_DEVICE", @"No device connected", nil);
            return;
        }
        
        // Start real-time data monitoring
        // This would involve setting up notifications on BLE characteristics
        
        resolve(@"Real-time monitoring started");
    } @catch (NSException *exception) {
        reject(@"MONITORING_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(stopRealTimeMonitoring:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        // Stop real-time data monitoring
        resolve(@"Real-time monitoring stopped");
    } @catch (NSException *exception) {
        reject(@"STOP_MONITORING_ERROR", exception.reason, nil);
    }
}

#pragma mark - Helper Methods

- (CBPeripheral *)findPeripheralById:(NSString *)deviceId {
    for (CBPeripheral *peripheral in self.discoveredDevices) {
        if ([peripheral.identifier.UUIDString isEqualToString:deviceId]) {
            return peripheral;
        }
    }
    return nil;
}

- (BOOL)isVeePooDevice:(CBPeripheral *)peripheral {
    NSString *deviceName = peripheral.name ?: @"";
    NSArray *veepooNames = @[@"VeePoo", @"HBand", @"SmartWatch", @"FitnessBand"];
    
    for (NSString *name in veepooNames) {
        if ([deviceName.lowercaseString containsString:name.lowercaseString]) {
            return YES;
        }
    }
    return NO;
}

#pragma mark - CBCentralManagerDelegate

- (void)centralManagerDidUpdateState:(CBCentralManager *)central {
    switch (central.state) {
        case CBManagerStatePoweredOn:
            RCTLog(@"Bluetooth is powered on");
            break;
        case CBManagerStatePoweredOff:
            [self sendEventWithName:@"BluetoothError" 
                               body:@{@"message": @"Bluetooth is powered off"}];
            break;
        case CBManagerStateUnsupported:
            [self sendEventWithName:@"BluetoothError" 
                               body:@{@"message": @"Bluetooth is not supported"}];
            break;
        case CBManagerStateUnauthorized:
            [self sendEventWithName:@"BluetoothError" 
                               body:@{@"message": @"Bluetooth access is unauthorized"}];
            break;
        default:
            [self sendEventWithName:@"BluetoothError" 
                               body:@{@"message": @"Bluetooth state unknown"}];
            break;
    }
}

- (void)centralManager:(CBCentralManager *)central 
 didDiscoverPeripheral:(CBPeripheral *)peripheral 
     advertisementData:(NSDictionary<NSString *,id> *)advertisementData 
                  RSSI:(NSNumber *)RSSI {
    
    // Filter for VeePoo/HBand compatible devices
    if ([self isVeePooDevice:peripheral]) {
        // Check if device is already discovered
        BOOL alreadyDiscovered = NO;
        for (CBPeripheral *existingPeripheral in self.discoveredDevices) {
            if ([existingPeripheral.identifier.UUIDString isEqualToString:peripheral.identifier.UUIDString]) {
                alreadyDiscovered = YES;
                break;
            }
        }
        
        if (!alreadyDiscovered) {
            [self.discoveredDevices addObject:peripheral];
            
            // Send device discovered event
            NSDictionary *deviceInfo = @{
                @"id": peripheral.identifier.UUIDString,
                @"name": peripheral.name ?: @"Unknown Device",
                @"rssi": RSSI
            };
            
            [self sendEventWithName:@"DeviceDiscovered" body:deviceInfo];
        }
    }
}

- (void)centralManager:(CBCentralManager *)central 
  didConnectPeripheral:(CBPeripheral *)peripheral {
    
    RCTLog(@"Connected to peripheral: %@", peripheral.name);
    self.connectedPeripheral = peripheral;
    peripheral.delegate = self;
    
    // Discover services
    [peripheral discoverServices:nil];
    
    // Send connection status event
    [self sendEventWithName:@"ConnectionStatusChanged" 
                       body:@{@"connected": @YES, @"deviceId": peripheral.identifier.UUIDString}];
}

- (void)centralManager:(CBCentralManager *)central 
didFailToConnectPeripheral:(CBPeripheral *)peripheral 
                 error:(NSError *)error {
    
    RCTLog(@"Failed to connect to peripheral: %@", error.localizedDescription);
    
    [self sendEventWithName:@"BluetoothError" 
                       body:@{@"message": [NSString stringWithFormat:@"Connection failed: %@", error.localizedDescription]}];
}

- (void)centralManager:(CBCentralManager *)central 
didDisconnectPeripheral:(CBPeripheral *)peripheral 
                 error:(NSError *)error {
    
    RCTLog(@"Disconnected from peripheral: %@", peripheral.name);
    
    if (self.connectedPeripheral == peripheral) {
        self.connectedPeripheral = nil;
    }
    
    // Send disconnection status event
    [self sendEventWithName:@"ConnectionStatusChanged" 
                       body:@{@"connected": @NO, @"deviceId": peripheral.identifier.UUIDString}];
}

#pragma mark - CBPeripheralDelegate

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverServices:(NSError *)error {
    if (error) {
        RCTLog(@"Error discovering services: %@", error.localizedDescription);
        return;
    }
    
    for (CBService *service in peripheral.services) {
        RCTLog(@"Discovered service: %@", service.UUID);
        [peripheral discoverCharacteristics:nil forService:service];
    }
}

- (void)peripheral:(CBPeripheral *)peripheral 
didDiscoverCharacteristicsForService:(CBService *)service 
             error:(NSError *)error {
    
    if (error) {
        RCTLog(@"Error discovering characteristics: %@", error.localizedDescription);
        return;
    }
    
    for (CBCharacteristic *characteristic in service.characteristics) {
        RCTLog(@"Discovered characteristic: %@", characteristic.UUID);
        
        // Set up notifications for characteristics that provide health data
        if (characteristic.properties & CBCharacteristicPropertyNotify) {
            [peripheral setNotifyValue:YES forCharacteristic:characteristic];
        }
    }
}

- (void)peripheral:(CBPeripheral *)peripheral 
didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic 
             error:(NSError *)error {
    
    if (error) {
        RCTLog(@"Error updating characteristic value: %@", error.localizedDescription);
        return;
    }
    
    // Parse the characteristic data and extract health information
    NSData *data = characteristic.value;
    if (data) {
        // Parse the data based on the characteristic UUID and send health data event
        NSDictionary *healthData = [self parseHealthDataFromCharacteristic:characteristic data:data];
        if (healthData) {
            [self sendEventWithName:@"HealthDataReceived" body:healthData];
        }
    }
}

- (NSDictionary *)parseHealthDataFromCharacteristic:(CBCharacteristic *)characteristic data:(NSData *)data {
    // This is where you would implement the actual parsing logic
    // based on the VeePoo/HBand device protocol
    
    // For demo purposes, return mock parsed data
    return @{
        @"steps": @([self randomIntBetween:5000 and:15000]),
        @"heartRate": @([self randomIntBetween:60 and:100]),
        @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
    };
}

- (int)randomIntBetween:(int)min and:(int)max {
    return min + arc4random_uniform(max - min + 1);
}

@end