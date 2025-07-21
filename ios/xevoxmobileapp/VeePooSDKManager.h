// 1. ios/xevoxmobileapp/VeePooSDKManager.h
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <CoreBluetooth/CoreBluetooth.h>
#import "GRDFUSDK/GRDFUSDK.h"

@interface VeePooSDKManager : RCTEventEmitter <RCTBridgeModule, CBCentralManagerDelegate, CBPeripheralDelegate>

@property (nonatomic, strong) CBCentralManager *centralManager;
@property (nonatomic, strong) CBPeripheral *connectedPeripheral;
@property (nonatomic, strong) NSMutableArray *discoveredDevices;
@property (nonatomic, assign) BOOL isScanning;

@end