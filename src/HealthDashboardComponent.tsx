// HealthDashboard.tsx - Fixed sync status and added ECG metrics
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

// Simple line chart component
const MiniLineChart = ({ data, color, width = 80, height = 30 }) => {
  if (!data || data.length === 0) {
    return <View style={{ width, height, backgroundColor: '#f0f0f0', borderRadius: 4 }} />;
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

// Metric card component with better data detection
const MetricCard = ({ metric, data, onPress }) => {
  const getDisplayValue = () => {
    if (metric.key === 'bloodPressure') {
      const systolic = data.current_systolic || 0;
      const diastolic = data.current_diastolic || 0;
      if (systolic > 0 || diastolic > 0) {
        return `${Math.round(systolic)}/${Math.round(diastolic)}`;
      }
      return '0/0';
    } else if (metric.key === 'sleep') {
      const duration = data.current_duration || data.average || 0;
      if (duration > 0) {
        const hours = Math.floor(duration);
        const minutes = Math.round((duration - hours) * 60);
        return `${hours}h ${minutes}m`;
      }
      return '0h 0m';
    } else {
      const value = data.current_value || data.average || 0;
      if (value > 0) {
        return Math.round(value).toLocaleString();
      }
      return '0';
    }
  };

  const getStatusColor = () => {
    const status = data.status || 'normal';
    switch (status) {
      case 'low': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'elevated': return '#F59E0B';
      case 'normal': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Enhanced data detection
  const hasData = () => {
    if (metric.key === 'bloodPressure') {
      return (data.current_systolic > 0 || data.current_diastolic > 0);
    } else if (metric.key === 'sleep') {
      return (data.current_duration > 0 || data.average > 0);
    } else {
      return (data.current_value > 0 || data.average > 0 || (data.values && data.values.length > 0));
    }
  };

  const dataExists = hasData();
  const lastUpdated = data.last_updated;

  return (
    <TouchableOpacity 
      style={[styles.metricCard, { opacity: dataExists ? 1 : 0.6 }]}
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
      <Text style={[styles.metricValue, { color: metric.color }]}>
        {getDisplayValue()}
      </Text>
      <Text style={styles.metricUnit}>{metric.unit}</Text>
      
      {dataExists && data.values && data.values.length > 1 && (
        <View style={styles.chartContainer}>
          <MiniLineChart 
            data={data.values.slice(-10)} 
            color={metric.color}
            width={screenWidth * 0.25}
            height={25}
          />
        </View>
      )}
      
      {dataExists && lastUpdated && (
        <Text style={styles.lastUpdatedText}>
          {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
      
      {!dataExists && (
        <Text style={styles.noDataText}>No data</Text>
      )}
    </TouchableOpacity>
  );
};

// Main dashboard component
export const HealthDashboard = () => {
  const { authState } = useAuth();
  const [healthData, setHealthData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // EXPANDED Health metrics configuration - Added ECG and more
  const healthMetrics = [
    { key: 'steps', label: 'Steps', icon: 'walk', unit: 'steps', color: '#10B981' },
    { key: 'heartRate', label: 'Heart Rate', icon: 'heart', unit: 'bpm', color: '#EF4444' },
    { key: 'ecg', label: 'ECG', icon: 'pulse', unit: 'bpm', color: '#8B5CF6' }, // Added ECG
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
    if (authState.authenticated) {
      fetchHealthData();
    }
  }, [authState.authenticated, timeframe]);

  const fetchHealthData = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Fetching health data from API...');
      
      const data = await api.getHealthData(timeframe);
      console.log('📊 Received health data:', Object.keys(data));
      console.log('📊 Full health data:', JSON.stringify(data, null, 2));
      
      setHealthData(data);
      
      // Check for last sync time from metadata or any metric
      const metadata = data._metadata;
      if (metadata && metadata.retrieved_at) {
        setLastSyncTime(metadata.retrieved_at);
      } else {
        // Find the most recent timestamp from any metric
        let latestTime = null;
        Object.keys(data).forEach(key => {
          if (data[key] && typeof data[key] === 'object' && data[key].last_updated) {
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
      
    } catch (error) {
      console.error('❌ Error fetching health data:', error);
      Alert.alert('Error', 'Failed to fetch health data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  };

  const handleMetricPress = (metric, data) => {
    console.log(`📊 Pressed ${metric.label}:`, data);
    
    // Show detailed info
    const hasData = metric.key === 'bloodPressure' 
      ? (data.current_systolic > 0 || data.current_diastolic > 0)
      : (data.current_value > 0 || data.average > 0);
      
    if (hasData) {
      let message = `${metric.label}: ${metric.key === 'bloodPressure' 
        ? `${Math.round(data.current_systolic || 0)}/${Math.round(data.current_diastolic || 0)} ${metric.unit}`
        : `${Math.round(data.current_value || data.average || 0)} ${metric.unit}`}\n\nStatus: ${data.status || 'normal'}`;
      
      if (data.last_updated) {
        message += `\n\nLast updated: ${new Date(data.last_updated).toLocaleString()}`;
      }
      
      Alert.alert(metric.label, message);
    } else {
      Alert.alert(metric.label, 'No data available yet. Connect your smartwatch to start tracking this metric.');
    }
  };

  const getOverallHealthStatus = () => {
    const metricsWithData = healthMetrics.filter(metric => {
      const data = healthData[metric.key];
      if (!data) return false;
      
      if (metric.key === 'bloodPressure') {
        return (data.current_systolic > 0 || data.current_diastolic > 0);
      } else if (metric.key === 'sleep') {
        return (data.current_duration > 0 || data.average > 0);
      } else {
        return (data.current_value > 0 || data.average > 0);
      }
    });

    if (metricsWithData.length === 0) return { status: 'No Data', color: '#6B7280' };

    const normalCount = metricsWithData.filter(metric => {
      const status = healthData[metric.key]?.status;
      return status === 'normal';
    }).length;

    const percentage = (normalCount / metricsWithData.length) * 100;

    if (percentage >= 80) return { status: 'Excellent', color: '#10B981' };
    if (percentage >= 60) return { status: 'Good', color: '#F59E0B' };
    return { status: 'Needs Attention', color: '#EF4444' };
  };

  // Enhanced sync status detection
  const getSyncStatus = () => {
    if (!healthData || Object.keys(healthData).length === 0) {
      return { status: 'Not Synced', color: '#EF4444', message: 'No data available' };
    }

    const metricsWithData = healthMetrics.filter(metric => {
      const data = healthData[metric.key];
      if (!data) return false;
      
      if (metric.key === 'bloodPressure') {
        return (data.current_systolic > 0 || data.current_diastolic > 0);
      } else if (metric.key === 'sleep') {
        return (data.current_duration > 0 || data.average > 0);
      } else {
        return (data.current_value > 0 || data.average > 0);
      }
    });

    if (metricsWithData.length === 0) {
      return { status: 'Not Synced', color: '#EF4444', message: 'No health data found' };
    }

    // Check if data is recent (within last 24 hours)
    if (lastSyncTime) {
      const syncTime = new Date(lastSyncTime);
      const now = new Date();
      const hoursSinceSync = (now - syncTime) / (1000 * 60 * 60);
      
      if (hoursSinceSync < 1) {
        return { status: 'Synced', color: '#10B981', message: 'Recently synced' };
      } else if (hoursSinceSync < 24) {
        return { status: 'Synced', color: '#10B981', message: `${Math.round(hoursSinceSync)}h ago` };
      } else {
        return { status: 'Stale Data', color: '#F59E0B', message: 'Data is old' };
      }
    }

    return { status: 'Synced', color: '#10B981', message: `${metricsWithData.length} metrics available` };
  };

  if (!authState.authenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to view your health data</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your health data...</Text>
      </View>
    );
  }

  const overallStatus = getOverallHealthStatus();
  const syncStatus = getSyncStatus();
  const metricsWithData = healthMetrics.filter(metric => {
    const data = healthData[metric.key];
    if (!data) return false;
    
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
            <Text style={styles.headerTitle}>Health Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {authState.user?.name || 'User'}'s Health Metrics
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
        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Today's Overview</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{metricsWithData.length}</Text>
              <Text style={styles.summaryLabel}>Active Metrics</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: syncStatus.color }]}>
                {syncStatus.status}
              </Text>
              <Text style={styles.summaryLabel}>{syncStatus.message}</Text>
            </View>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Health Metrics</Text>
          <View style={styles.metricsGrid}>
            {healthMetrics.map(metric => (
              <MetricCard
                key={metric.key}
                metric={metric}
                data={healthData[metric.key] || {}}
                onPress={handleMetricPress}
              />
            ))}
          </View>
        </View>

        {/* Data source info */}
        <View style={styles.dataSourceContainer}>
          <Icon name="info" size={16} color="#6B7280" />
          <Text style={styles.dataSourceText}>
            Data synced from your connected smartwatch in real-time
            {lastSyncTime && (
              `\nLast sync: ${new Date(lastSyncTime).toLocaleString()}`
            )}
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
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
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
    minHeight: 160,
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
  },
  noDataText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
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