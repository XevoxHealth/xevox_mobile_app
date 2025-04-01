import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import { getHealthData, formatHealthStatus } from '../api/healthData';
import { getHealthRecommendations, getHealthObservations } from '../api/chatbot';

const screenWidth = Dimensions.get('window').width;

// Define metrics to display
const metrics = [
  { id: 'steps', title: 'Steps', icon: 'footsteps', unit: 'steps', description: 'Total daily steps' },
  { id: 'heartRate', title: 'Heart Rate', icon: 'heart', unit: 'BPM', description: 'Average heart rate' },
  { id: 'sleep', title: 'Sleep', icon: 'bed', unit: 'hours', description: 'Total sleep duration' },
  { id: 'stress', title: 'Stress', icon: 'fitness', unit: 'level', description: 'Stress level' },
  { id: 'hrv', title: 'HRV', icon: 'pulse', unit: 'ms', description: 'Heart rate variability' },
  { id: 'caloriesBurned', title: 'Calories', icon: 'flame', unit: 'kcal', description: 'Total calories burned' },
  { id: 'pulseOx', title: 'Blood Oxygen', icon: 'water', unit: '%', description: 'Blood oxygen saturation' },
  { id: 'bloodPressure', title: 'Blood Pressure', icon: 'speedometer', unit: 'mmHg', description: 'Blood pressure' },
];

const HealthDataScreen = ({ route, navigation }) => {
  const { authState } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(route?.params?.initialMetric || 'heartRate');
  const [timeframe, setTimeframe] = useState('day');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch health data
      const data = await getHealthData(timeframe, authState.user?.id);
      setHealthData(data);
      
      // Fetch insights
      const obsResponse = await getHealthObservations();
      setObservations(obsResponse.observations);
      
      const recsResponse = await getHealthRecommendations();
      setRecommendations(recsResponse.recommendations);
      
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on mount and when timeframe changes
  useEffect(() => {
    loadData();
  }, [timeframe]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Get chart data for selected metric
  const getChartData = () => {
    if (!healthData || !healthData[selectedMetric] || !healthData[selectedMetric].values) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }
    
    const values = healthData[selectedMetric].values;
    // Create simplified labels (just hours if same day)
    const labels = healthData[selectedMetric].timestamps.map(timestamp => {
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

  // Find current metric details
  const currentMetric = metrics.find(m => m.id === selectedMetric) || metrics[0];
  
  // Get status formatting for current metric
  const getStatusInfo = () => {
    if (!healthData || !healthData[selectedMetric]) {
      return { color: '#9E9E9E', icon: 'help-circle' };
    }
    
    return formatHealthStatus(selectedMetric, healthData[selectedMetric].status);
  };
  
  const { color, icon } = getStatusInfo();

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Data</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Timeframe selector */}
        <View style={styles.timeframeContainer}>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              timeframe === 'day' && styles.timeframeButtonActive,
            ]}
            onPress={() => setTimeframe('day')}
          >
            <Text
              style={[
                styles.timeframeButtonText,
                timeframe === 'day' && styles.timeframeButtonTextActive,
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              timeframe === 'week' && styles.timeframeButtonActive,
            ]}
            onPress={() => setTimeframe('week')}
          >
            <Text
              style={[
                styles.timeframeButtonText,
                timeframe === 'week' && styles.timeframeButtonTextActive,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              timeframe === 'month' && styles.timeframeButtonActive,
            ]}
            onPress={() => setTimeframe('month')}
          >
            <Text
              style={[
                styles.timeframeButtonText,
                timeframe === 'month' && styles.timeframeButtonTextActive,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Metrics grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metricsScroll}
        >
          {metrics.map((metric) => (
            <TouchableOpacity
              key={metric.id}
              style={[
                styles.metricButton,
                selectedMetric === metric.id && styles.metricButtonActive,
              ]}
              onPress={() => setSelectedMetric(metric.id)}
            >
              <Icon
                name={metric.icon}
                size={24}
                color={selectedMetric === metric.id ? 'white' : '#666'}
              />
              <Text
                style={[
                  styles.metricButtonText,
                  selectedMetric === metric.id && styles.metricButtonTextActive,
                ]}
              >
                {metric.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Current metric details */}
        <View style={styles.metricDetailCard}>
          <View style={styles.metricDetailHeader}>
            <View style={styles.metricTitleContainer}>
              <Icon name={currentMetric.icon} size={28} color="#4F46E5" />
              <Text style={styles.metricDetailTitle}>{currentMetric.title}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
              <Icon name={icon} size={16} color={color} />
              <Text style={[styles.statusText, { color }]}>
                {healthData?.[selectedMetric]?.status || 'Unknown'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.metricDescription}>{currentMetric.description}</Text>
          
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>Current</Text>
            <Text style={styles.valueNumber}>
              {healthData?.[selectedMetric]?.average || 0}
              <Text style={styles.valueUnit}> {currentMetric.unit}</Text>
            </Text>
          </View>
          
          <LineChart
            data={getChartData()}
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
                r: '5',
                strokeWidth: '2',
                stroke: '#4F46E5',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
        
        {/* Observations */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Icon name="eye-outline" size={24} color="#4F46E5" />
            <Text style={styles.insightTitle}>Observations</Text>
          </View>
          <Text style={styles.insightText}>{observations || 'No observations available for this timeframe.'}</Text>
        </View>
        
        {/* Recommendations */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Icon name="bulb-outline" size={24} color="#4F46E5" />
            <Text style={styles.insightTitle}>Recommendations</Text>
          </View>
          <Text style={styles.insightText}>{recommendations || 'No recommendations available for this timeframe.'}</Text>
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
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
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
  metricsScroll: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  metricButton: {
    backgroundColor: '#EFEFEF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  metricButtonActive: {
    backgroundColor: '#4F46E5',
  },
  metricButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  metricButtonTextActive: {
    color: 'white',
  },
  metricDetailCard: {
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
  metricDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  metricDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  valueContainer: {
    marginBottom: 20,
  },
  valueLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  valueUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  insightCard: {
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
  },
});

export default HealthDataScreen;