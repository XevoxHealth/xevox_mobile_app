import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import { getHealthData, processHealthDataForCharts, formatHealthStatus, getAvailableMetrics } from '../api/healthData';
import { getHealthAdvice } from '../api/chatbot';
import { HEALTH_METRICS } from '../api/config';

const screenWidth = Dimensions.get('window').width;

const HomeScreen = ({ navigation }) => {
  const { authState } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [healthAdvice, setHealthAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');
  const [availableMetrics, setAvailableMetrics] = useState([]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch health data
      const data = await getHealthData(selectedTimeframe, authState.user?.id);
      setHealthData(data);
      
      // Update available metrics
      const filteredMetrics = getAvailableMetrics(data, HEALTH_METRICS);
      setAvailableMetrics(filteredMetrics);
      
      // Fetch health advice
      const adviceResponse = await getHealthAdvice();
      setHealthAdvice(adviceResponse.advice);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load health data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on mount and when timeframe changes
  useEffect(() => {
    loadData();
  }, [selectedTimeframe]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Render a summary card for a health metric
  const renderMetricCard = (metric) => {
    if (!healthData || !healthData[metric.id]) {
      return null;
    }
    
    const data = healthData[metric.id];
    const { color, icon } = formatHealthStatus(metric.id, data.status);
    
    return (
      <TouchableOpacity 
        key={metric.id}
        style={styles.metricCard}
        onPress={() => navigation.navigate('Health', { initialMetric: metric.id })}
      >
        <View style={styles.metricHeader}>
          <Text style={styles.metricTitle}>{metric.title}</Text>
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.metricValue, { color }]}>
          {data.average} {metric.unit}
        </Text>
        <Text style={styles.metricStatus}>
          Status: <Text style={{ color }}>{data.status}</Text>
        </Text>
      </TouchableOpacity>
    );
  };

  // Prepare chart data for heart rate
  const getHeartRateChartData = () => {
    if (!healthData || !healthData.heartRate || !healthData.heartRate.values) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }
    
    const values = healthData.heartRate.values;
    // Create simplified labels (just hours if same day)
    const labels = healthData.heartRate.timestamps.map(timestamp => {
      const date = new Date(timestamp);
      return date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    });
    
    // If we have too many points, sample them
    const maxPoints = 6;
    let sampledValues = values;
    let sampledLabels = labels;
    
    if (values.length > maxPoints) {
      const interval = Math.floor(values.length / maxPoints);
      sampledValues = [];
      sampledLabels = [];
      
      for (let i = 0; i < values.length; i += interval) {
        sampledValues.push(values[i]);
        sampledLabels.push(labels[i]);
      }
    }
    
    return {
      labels: sampledLabels,
      datasets: [{ data: sampledValues }],
    };
  };

  // Render when no device is connected
  const renderNoDeviceConnected = () => {
    return (
      <View style={styles.noDeviceContainer}>
        <Icon name="watch-outline" size={60} color="#CCCCCC" />
        <Text style={styles.noDeviceTitle}>No Health Device Connected</Text>
        <Text style={styles.noDeviceDescription}>
          Connect your health device to view your health data and receive personalized insights.
        </Text>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.connectButtonText}>Connect Device</Text>
          <Icon name="add-circle-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  // Check if we have any health data
  const hasHealthData = healthData && Object.keys(healthData).some(key => 
    healthData[key]?.values?.length > 0
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Hello, {authState.user?.name || 'there'}!
        </Text>
        <Text style={styles.headerSubtitle}>
          Here's your health overview
        </Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Show no device screen if no health data */}
        {!hasHealthData ? (
          renderNoDeviceConnected()
        ) : (
          <>
            {/* Timeframe selector */}
            <View style={styles.timeframeContainer}>
              <TouchableOpacity
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === 'day' && styles.timeframeButtonActive,
                ]}
                onPress={() => setSelectedTimeframe('day')}
              >
                <Text
                  style={[
                    styles.timeframeButtonText,
                    selectedTimeframe === 'day' && styles.timeframeButtonTextActive,
                  ]}
                >
                  Day
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === 'week' && styles.timeframeButtonActive,
                ]}
                onPress={() => setSelectedTimeframe('week')}
              >
                <Text
                  style={[
                    styles.timeframeButtonText,
                    selectedTimeframe === 'week' && styles.timeframeButtonTextActive,
                  ]}
                >
                  Week
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === 'month' && styles.timeframeButtonActive,
                ]}
                onPress={() => setSelectedTimeframe('month')}
              >
                <Text
                  style={[
                    styles.timeframeButtonText,
                    selectedTimeframe === 'month' && styles.timeframeButtonTextActive,
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Heart Rate Chart (if available) */}
            {healthData && healthData.heartRate && healthData.heartRate.values && healthData.heartRate.values.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Heart Rate (BPM)</Text>
                <LineChart
                  data={getHeartRateChartData()}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#4F46E5',
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}
            
            {/* Health Metrics Grid */}
            <View style={styles.metricsGrid}>
              {availableMetrics.slice(0, 4).map((metric) => renderMetricCard(metric))}
            </View>
            
            {/* Show all metrics button */}
            {availableMetrics.length > 0 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Health')}
              >
                <Text style={styles.viewAllButtonText}>View All Health Metrics</Text>
                <Icon name="arrow-forward" size={16} color="#4F46E5" />
              </TouchableOpacity>
            )}
          </>
        )}
        
        {/* Health Advice Card - show regardless of device connection */}
        <View style={styles.adviceCard}>
          <View style={styles.adviceHeader}>
            <Icon name="bulb-outline" size={24} color="#4F46E5" />
            <Text style={styles.adviceTitle}>Health Insights</Text>
          </View>
          <Text style={styles.adviceText}>{healthAdvice || "Connect a health device to receive personalized health advice based on your data."}</Text>
          
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={styles.chatButtonText}>Chat with Assistant</Text>
            <Icon name="chatbubble-ellipses-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4F46E5',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noDeviceContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  noDeviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  noDeviceDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#EFEFEF',
  },
  timeframeButtonActive: {
    backgroundColor: '#4F46E5',
  },
  timeframeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  timeframeButtonTextActive: {
    color: 'white',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  metricCard: {
    backgroundColor: 'white',
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metricStatus: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 10,
    marginTop: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  viewAllButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    marginRight: 8,
  },
  adviceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  adviceText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
  },
  chatButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  chatButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default HomeScreen;