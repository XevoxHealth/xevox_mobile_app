// Fixed HealthDashboard.tsx - Real Device Data Only, No Demo Data
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Dimensions,
  RefreshControl,
  Alert
} from 'react-native';
import { useAuth } from './context';
import { api } from './api_service';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Simple icons component
const Icon = ({ name, size = 24, color = '#000', style, ...props }) => (
  <View style={[{
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: size/4,
    justifyContent: 'center',
    alignItems: 'center'
  }, style]} {...props}>
    <View style={{
      width: size * 0.5,
      height: size * 0.5,
      backgroundColor: '#fff',
      borderRadius: 2
    }} />
  </View>
);

// Linear gradient component
const LinearGradient = ({ colors, children, style, ...props }) => (
  <View style={[style, { 
    backgroundColor: colors?.[0] || '#667eea',
    ...(Platform.OS === 'web' ? {
      background: `linear-gradient(135deg, ${colors?.[0] || '#667eea'}, ${colors?.[1] || '#764ba2'})`
    } : {})
  }]} {...props}>
    {children}
  </View>
);

// Simple line chart component for real data
const MiniLineChart = ({ data, color, width = 80, height = 30 }) => {
  if (!data || data.length === 0) {
    return (
      <View style={{ 
        width, 
        height, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 9, color: '#9CA3AF' }}>No data</Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <View style={{ width, height, position: 'relative' }}>
      <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * (width - 4);
          const y = height - 4 - ((value - min) / range) * (height - 8);
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: 3,
                height: 3,
                backgroundColor: color,
                borderRadius: 1.5,
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

// Metric card component - ONLY shows real data
const MetricCard = ({ metric, data, onPress, isUserAuthenticated }) => {
  const getDisplayValue = () => {
    // Only process if this is real data
    if (!data.is_real) {
      return 'No real data';
    }

    if (metric.key === 'bloodPressure') {
      const systolic = data.current_systolic || 0;
      const diastolic = data.current_diastolic || 0;
      if (systolic > 0 || diastolic > 0) {
        return `${Math.round(systolic)}/${Math.round(diastolic)}`;
      }
      return 'No reading';
    } else if (metric.key === 'sleep') {
      const duration = data.current_duration || data.average || 0;
      if (duration > 0) {
        const hours = Math.floor(duration);
        const minutes = Math.round((duration - hours) * 60);
        return `${hours}h ${minutes}m`;
      }
      return 'No sleep data';
    } else {
      const value = data.current_value || data.average || 0;
      if (value > 0) {
        return Math.round(value).toLocaleString();
      }
      return 'No measurement';
    }
  };

  const getStatusColor = () => {
    if (!data.is_real) return '#9CA3AF';
    
    const status = data.status || 'normal';
    switch (status) {
      case 'low': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'elevated': return '#F59E0B';
      case 'normal': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Enhanced real data detection
  const hasRealData = () => {
    if (!data.is_real) return false;
    
    if (metric.key === 'bloodPressure') {
      return (data.current_systolic > 0 || data.current_diastolic > 0);
    } else if (metric.key === 'sleep') {
      return (data.current_duration > 0 || data.average > 0);
    } else {
      return (data.current_value > 0 || data.average > 0 || (data.values && data.values.length > 0));
    }
  };

  const realDataExists = hasRealData();
  const lastUpdated = data.last_updated;

  return (
    <TouchableOpacity 
      style={[
        styles.metricCard, 
        { 
          opacity: realDataExists ? 1 : 0.5,
          borderWidth: realDataExists ? 2 : 1,
          borderColor: realDataExists ? metric.color + '40' : '#E5E7EB'
        }
      ]}
      onPress={() => onPress(metric, data)}
      activeOpacity={0.7}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.metricIconContainer, { backgroundColor: metric.color + '20' }]}>
          <Icon name={metric.icon} size={20} color={metric.color} />
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      </View>
      
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={[
        styles.metricValue, 
        { 
          color: realDataExists ? metric.color : '#9CA3AF',
          fontSize: realDataExists ? 18 : 14
        }
      ]}>
        {getDisplayValue()}
      </Text>
      <Text style={styles.metricUnit}>
        {realDataExists ? metric.unit : (data.is_real ? 'Device connected' : 'Connect ET475')}
      </Text>
      
      {realDataExists && data.values && data.values.length > 1 && (
        <View style={styles.chartContainer}>
          <MiniLineChart 
            data={data.values.slice(-10)} 
            color={metric.color}
            width={screenWidth * 0.25}
            height={25}
          />
        </View>
      )}
      
      {realDataExists && lastUpdated && (
        <Text style={styles.lastUpdatedText}>
          Real data: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
      
      {!realDataExists && (
        <Text style={styles.noDataText}>
          {!isUserAuthenticated 
            ? 'Login required' 
            : (!data.is_real 
                ? 'Connect real device' 
                : 'Waiting for data...'
              )
          }
        </Text>
      )}
      
      {data.is_real && realDataExists && (
        <View style={styles.realDataBadge}>
          <Text style={styles.realDataBadgeText}>✓ REAL</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Main dashboard component - ONLY shows real data
export const HealthDashboard = () => {
  const { authState } = useAuth();
  const [healthData, setHealthData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [realDataAvailable, setRealDataAvailable] = useState(false);

  // Health metrics configuration - only real metrics
  const healthMetrics = [
    { key: 'steps', label: 'Steps', icon: 'walk', unit: 'steps', color: '#10B981' },
    { key: 'heartRate', label: 'Heart Rate', icon: 'heart', unit: 'bpm', color: '#EF4444' },
    { key: 'ecg', label: 'ECG', icon: 'pulse', unit: 'bpm', color: '#8B5CF6' },
    { key: 'sleep', label: 'Sleep', icon: 'bed', unit: 'hrs', color: '#8B5CF6' },
    { key: 'bloodPressure', label: 'Blood Pressure', icon: 'medical', unit: 'mmHg', color: '#DC2626' },
    { key: 'oxygenSaturation', label: 'SpO2', icon: 'leaf', unit: '%', color: '#22C55E' },
    { key: 'caloriesBurned', label: 'Calories', icon: 'flame', unit: 'kcal', color: '#F97316' },
    { key: 'distance', label: 'Distance', icon: 'map', unit: 'km', color: '#06B6D4' },
    { key: 'stress', label: 'Stress', icon: 'warning', unit: '/10', color: '#F59E0B' },
    { key: 'hrv', label: 'HRV', icon: 'pulse', unit: 'ms', color: '#06B6D4' },
    { key: 'activities', label: 'Activities', icon: 'fitness', unit: 'count', color: '#84CC16' },
    { key: 'bodyTemperature', label: 'Temperature', icon: 'thermometer', unit: '°F', color: '#EC4899' },
    { key: 'bloodGlucose', label: 'Glucose', icon: 'water', unit: 'mg/dL', color: '#14B8A6' }
  ];

  useEffect(() => {
    // Only fetch data if user is authenticated and not logging out
    if (authState.authenticated && !authState.isLoggingOut) {
      fetchHealthData();
    } else {
      // Clear data if user is not authenticated
      setHealthData({});
      setLastSyncTime(null);
      setRealDataAvailable(false);
      setIsLoading(false);
    }
  }, [authState.authenticated, authState.isLoggingOut, timeframe]);

  const fetchHealthData = async () => {
    // Double check authentication state
    if (!authState.authenticated || authState.isLoggingOut) {
      console.log('👤 User not authenticated, skipping health data fetch');
      return;
    }

    try {
      setIsLoading(true);
      console.log('📊 Fetching REAL health data from API...');
      
      const data = await api.getHealthData(timeframe);
      console.log('📊 Received health data:', Object.keys(data));
      
      // Validate that we received real data
      const hasRealData = Object.keys(data).some(key => {
        const metricData = data[key];
        return metricData && typeof metricData === 'object' && metricData.is_real === true;
      });
      
      setHealthData(data);
      setRealDataAvailable(hasRealData);
      
      if (hasRealData) {
        console.log('✅ Real device data detected');
        
        // Check for last sync time from metadata or any metric
        const metadata = data._metadata;
        if (metadata && metadata.retrieved_at) {
          setLastSyncTime(metadata.retrieved_at);
        } else {
          // Find the most recent timestamp from any real metric
          let latestTime = null;
          Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key] === 'object' && data[key].is_real && data[key].last_updated) {
              const updateTime = new Date(data[key].last_updated);
              if (!latestTime || updateTime > latestTime) {
                latestTime = updateTime;
              }
            }
          });
          if (latestTime) {
            setLastSyncTime(latestTime.toISOString());
          }
        }
      } else {
        console.log('⚠️ No real device data found');
        setLastSyncTime(null);
      }
      
    } catch (error) {
      console.error('❌ Error fetching REAL health data:', error);
      
      // Only show error if user is still authenticated
      if (authState.authenticated && !authState.isLoggingOut) {
        Alert.alert(
          'Data Fetch Error', 
          'Failed to fetch your real health data. Please check your device connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('👤 User logged out during health data fetch, ignoring error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!authState.authenticated || authState.isLoggingOut) {
      console.log('👤 User not authenticated, skipping refresh');
      return;
    }

    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  };

  const handleMetricPress = (metric, data) => {
    if (!authState.authenticated) {
      Alert.alert('Login Required', 'Please log in to view detailed health metrics.');
      return;
    }

    console.log(`📊 Pressed ${metric.label}:`, data);
    
    // Check if this is real data
    if (!data.is_real) {
      Alert.alert(
        'Real Device Required',
        `${metric.label} data is not available.\n\nConnect your ET475 or compatible smartwatch to start tracking real ${metric.label.toLowerCase()} measurements.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Show detailed info for real data
    const hasData = metric.key === 'bloodPressure' 
      ? (data.current_systolic > 0 || data.current_diastolic > 0)
      : (data.current_value > 0 || data.average > 0);
      
    if (hasData) {
      let message = `${metric.label}: ${metric.key === 'bloodPressure' 
        ? `${Math.round(data.current_systolic || 0)}/${Math.round(data.current_diastolic || 0)} ${metric.unit}`
        : `${Math.round(data.current_value || data.average || 0)} ${metric.unit}`}\n\nStatus: ${data.status || 'normal'}\n\nData Source: Real Device ✓`;
      
      if (data.last_updated) {
        message += `\n\nLast reading: ${new Date(data.last_updated).toLocaleString()}`;
      }
      
      Alert.alert(`${metric.label} (Real Data)`, message);
    } else {
      Alert.alert(
        `${metric.label} - Device Connected`,
        'Your device is connected but no recent measurements are available for this metric. Make sure your device is actively collecting data and try syncing again.',
        [{ text: 'OK' }]
      );
    }
  };

  const getOverallHealthStatus = () => {
    if (!authState.authenticated) {
      return { status: 'Login Required', color: '#6B7280' };
    }

    if (!realDataAvailable) {
      return { status: 'Connect Real Device', color: '#F59E0B' };
    }

    const realMetricsWithData = healthMetrics.filter(metric => {
      const data = healthData[metric.key];
      if (!data || !data.is_real) return false;
      
      if (metric.key === 'bloodPressure') {
        return (data.current_systolic > 0 || data.current_diastolic > 0);
      } else if (metric.key === 'sleep') {
        return (data.current_duration > 0 || data.average > 0);
      } else {
        return (data.current_value > 0 || data.average > 0);
      }
    });

    if (realMetricsWithData.length === 0) {
      return { status: 'Waiting for Data', color: '#6B7280' };
    }

    const normalCount = realMetricsWithData.filter(metric => {
      const status = healthData[metric.key]?.status;
      return status === 'normal';
    }).length;

    const percentage = (normalCount / realMetricsWithData.length) * 100;

    if (percentage >= 80) return { status: 'Excellent', color: '#10B981' };
    if (percentage >= 60) return { status: 'Good', color: '#F59E0B' };
    return { status: 'Needs Attention', color: '#EF4444' };
  };

  // Enhanced sync status detection for real data only
  const getSyncStatus = () => {
    if (!authState.authenticated) {
      return { status: 'Not Logged In', color: '#6B7280', message: 'Login required' };
    }

    if (!realDataAvailable) {
      return { status: 'No Real Device', color: '#EF4444', message: 'Connect ET475 or compatible device' };
    }

    const realMetricsWithData = healthMetrics.filter(metric => {
      const data = healthData[metric.key];
      if (!data || !data.is_real) return false;
      
      if (metric.key === 'bloodPressure') {
        return (data.current_systolic > 0 || data.current_diastolic > 0);
      } else if (metric.key === 'sleep') {
        return (data.current_duration > 0 || data.average > 0);
      } else {
        return (data.current_value > 0 || data.average > 0);
      }
    });

    if (realMetricsWithData.length === 0) {
      return { status: 'Device Connected', color: '#F59E0B', message: 'Waiting for real data' };
    }

    // Check if data is recent (within last 24 hours)
    if (lastSyncTime) {
      const syncTime = new Date(lastSyncTime);
      const now = new Date();
      const hoursSinceSync = (now - syncTime) / (1000 * 60 * 60);
      
      if (hoursSinceSync < 1) {
        return { status: 'Live Data', color: '#10B981', message: 'Real-time sync' };
      } else if (hoursSinceSync < 24) {
        return { status: 'Recent Data', color: '#10B981', message: `${Math.round(hoursSinceSync)}h ago` };
      } else {
        return { status: 'Data Outdated', color: '#F59E0B', message: 'Sync your device' };
      }
    }

    return { status: 'Real Data Active', color: '#10B981', message: `${realMetricsWithData.length} metrics available` };
  };

  // Show appropriate message based on authentication state
  if (!authState.authenticated) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="person" size={64} color="#9CA3AF" />
        <Text style={styles.errorText}>Please log in to view your health data</Text>
        <Text style={styles.errorSubtext}>Connect your account to access real health insights from your ET475 device</Text>
      </View>
    );
  }

  if (isLoading && Object.keys(healthData).length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your real health data...</Text>
      </View>
    );
  }

  const overallStatus = getOverallHealthStatus();
  const syncStatus = getSyncStatus();
  const realMetricsWithData = healthMetrics.filter(metric => {
    const data = healthData[metric.key];
    if (!data || !data.is_real) return false;
    
    if (metric.key === 'bloodPressure') {
      return (data.current_systolic > 0 || data.current_diastolic > 0);
    } else if (metric.key === 'sleep') {
      return (data.current_duration > 0 || data.average > 0);
    } else {
      return (data.current_value > 0 || data.average > 0);
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Real Health Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {authState.user?.name || 'User'}'s Live Health Metrics
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: overallStatus.color }]}>
              <Text style={styles.statusText}>{overallStatus.status}</Text>
            </View>
            <View style={[styles.syncBadge, { backgroundColor: syncStatus.color }]}>
              <Text style={styles.syncText}>{syncStatus.status}</Text>
            </View>
          </View>
        </View>

        {/* Timeframe selector */}
        <View style={styles.timeframeContainer}>
          {['day', 'week', 'month'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timeframeButton,
                timeframe === period && styles.timeframeButtonActive
              ]}
              onPress={() => setTimeframe(period)}
            >
              <Text style={[
                styles.timeframeText,
                timeframe === period && styles.timeframeTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Stats - Real Data Only */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Real Device Status</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={[
                styles.summaryNumber,
                { color: realDataAvailable ? '#10B981' : '#EF4444' }
              ]}>
                {realMetricsWithData.length}
              </Text>
              <Text style={styles.summaryLabel}>Real Metrics Active</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: syncStatus.color }]}>
                {syncStatus.status}
              </Text>
              <Text style={styles.summaryLabel}>{syncStatus.message}</Text>
            </View>
          </View>
          
          {!realDataAvailable && (
            <View style={styles.noRealDataNotice}>
              <Icon name="warning" size={20} color="#F59E0B" />
              <Text style={styles.noRealDataText}>
                Connect your ET475 or compatible smartwatch to see real health data. Demo data is not supported.
              </Text>
            </View>
          )}
        </View>

        {/* Metrics Grid - Real Data Only */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>
            Health Metrics {realDataAvailable ? '(Real Device Data)' : '(Connect Real Device)'}
          </Text>
          <View style={styles.metricsGrid}>
            {healthMetrics.map(metric => (
              <MetricCard
                key={metric.key}
                metric={metric}
                data={healthData[metric.key] || { is_real: false }}
                onPress={handleMetricPress}
                isUserAuthenticated={authState.authenticated}
              />
            ))}
          </View>
        </View>

        {/* Data source info - Real Data Only */}
        <View style={styles.dataSourceContainer}>
          <Icon name="info" size={16} color="#6B7280" />
          <Text style={styles.dataSourceText}>
            {realDataAvailable 
              ? `✓ Real data from your connected ET475 or compatible device${lastSyncTime ? `\nLast sync: ${new Date(lastSyncTime).toLocaleString()}` : '\nLive synchronization active'}`
              : 'Connect your real ET475 or compatible smartwatch to view live health data. Demo data is not supported in this app.'
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  timeframeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timeframeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeframeText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  noRealDataNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  noRealDataText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  metricsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: screenWidth > 600 ? '23%' : (screenWidth - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 180,
    position: 'relative',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  lastUpdatedText: {
    fontSize: 9,
    color: '#10B981',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  realDataBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  realDataBadgeText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dataSourceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  dataSourceText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
    lineHeight: 16,
  },
});