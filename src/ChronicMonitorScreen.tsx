import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl
} from 'react-native';
import { useAuth } from './context';
import { api } from './api_service';

// Simple fallback icons
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

export const ChronicMonitorsScreen = () => {
  const { authState } = useAuth();
  const [chronicConditions, setChronicConditions] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasConnectedDevice, setHasConnectedDevice] = useState(false);

  useEffect(() => {
    loadChronicConditions();
    checkDeviceStatus();
  }, []);

  const loadChronicConditions = async () => {
    try {
      setIsLoading(true);
      console.log('Loading chronic conditions...');
      
      // Get chronic conditions from backend
      const conditions = await api.getChronicConditions();
      console.log('Chronic conditions received:', conditions);
      
      // Get health data for context
      const healthMetrics = await api.getHealthData('week');
      setHealthData(healthMetrics);
      
      if (conditions && conditions.length > 0) {
        setChronicConditions(conditions);
      } else {
        // If no specific conditions, analyze health data for potential risks
        const potentialConditions = analyzePotentialConditions(healthMetrics);
        setChronicConditions(potentialConditions);
      }
      
    } catch (error) {
      console.error('Error loading chronic conditions:', error);
      Alert.alert('Error', 'Failed to load chronic condition data');
    } finally {
      setIsLoading(false);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      const deviceStatus = await api.getConnectedDevices();
      setHasConnectedDevice(deviceStatus.devices && deviceStatus.devices.length > 0);
    } catch (error) {
      console.error('Error checking device status:', error);
    }
  };

  const analyzePotentialConditions = (healthMetrics) => {
    if (!healthMetrics || typeof healthMetrics !== 'object') {
      return [];
    }

    const conditions = [];

    // Check for cardiovascular risks
    const heartRate = healthMetrics.heartRate;
    const bloodPressure = healthMetrics.bloodPressure;
    
    if (heartRate && (heartRate.average > 100 || heartRate.current_value > 100)) {
      conditions.push({
        condition: 'Elevated Heart Rate',
        severity: 'moderate',
        description: 'Your heart rate has been consistently elevated above normal ranges',
        recommendations: [
          'Monitor stress levels and practice relaxation techniques',
          'Ensure adequate hydration',
          'Consider reducing caffeine intake',
          'Consult with a healthcare provider if persistent'
        ],
        metrics: {
          current: Math.round(heartRate.current_value || heartRate.average),
          status: heartRate.status,
          trend: heartRate.average > 90 ? 'increasing' : 'stable'
        }
      });
    }

    // Check for sleep issues
    const sleep = healthMetrics.sleep;
    if (sleep && (sleep.average < 6 || sleep.current_value < 6)) {
      conditions.push({
        condition: 'Sleep Deficiency',
        severity: sleep.average < 5 ? 'high' : 'moderate',
        description: 'You are consistently getting less sleep than recommended',
        recommendations: [
          'Maintain a consistent sleep schedule',
          'Create a relaxing bedtime routine',
          'Limit screen time 1 hour before bed',
          'Keep your bedroom cool and dark',
          'Consider a sleep study if issues persist'
        ],
        metrics: {
          current: sleep.current_value || sleep.average,
          status: sleep.status,
          trend: 'concerning'
        }
      });
    }

    // Check for low activity levels
    const steps = healthMetrics.steps;
    if (steps && (steps.average < 5000 || steps.current_value < 5000)) {
      conditions.push({
        condition: 'Low Physical Activity',
        severity: 'moderate',
        description: 'Your daily step count is below recommended levels',
        recommendations: [
          'Aim for at least 10,000 steps per day',
          'Take short walks throughout the day',
          'Use stairs instead of elevators',
          'Park further away or get off transit one stop early',
          'Join a walking group or find an exercise buddy'
        ],
        metrics: {
          current: Math.round(steps.current_value || steps.average),
          status: steps.status,
          trend: 'needs_improvement'
        }
      });
    }

    // Check for high stress indicators
    const stress = healthMetrics.stress;
    if (stress && (stress.average > 6 || stress.current_value > 6)) {
      conditions.push({
        condition: 'Elevated Stress Levels',
        severity: stress.average > 8 ? 'high' : 'moderate',
        description: 'Your stress levels have been consistently high',
        recommendations: [
          'Practice deep breathing exercises',
          'Try meditation or mindfulness apps',
          'Regular physical exercise',
          'Ensure adequate sleep',
          'Consider talking to a mental health professional'
        ],
        metrics: {
          current: Math.round(stress.current_value || stress.average),
          status: stress.status,
          trend: 'elevated'
        }
      });
    }

    // If no conditions detected, return a positive message
    if (conditions.length === 0) {
      conditions.push({
        condition: 'Good Health Status',
        severity: 'good',
        description: 'Based on your current health metrics, you\'re maintaining good health!',
        recommendations: [
          'Continue your current healthy habits',
          'Stay consistent with regular exercise',
          'Maintain a balanced diet',
          'Keep monitoring your health metrics',
          'Schedule regular health checkups'
        ],
        metrics: {
          overall_score: 85,
          status: 'good',
          trend: 'stable'
        }
      });
    }

    return conditions;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChronicConditions();
    await checkDeviceStatus();
    setRefreshing(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '#EF4444';
      case 'moderate':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      case 'good':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'alert-circle';
      case 'moderate':
        return 'alert-triangle';
      case 'low':
      case 'good':
        return 'checkmark-circle';
      default:
        return 'information-circle';
    }
  };

  const renderConditionCard = (condition, index) => {
    const severityColor = getSeverityColor(condition.severity);
    const severityIcon = getSeverityIcon(condition.severity);
    
    return (
      <View key={index} style={styles.conditionCard}>
        <View style={styles.conditionHeader}>
          <View style={styles.conditionTitleRow}>
            <Icon name={severityIcon} size={20} color={severityColor} />
            <Text style={styles.conditionTitle}>{condition.condition}</Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
            <Text style={styles.severityText}>
              {condition.severity?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.conditionDescription}>{condition.description}</Text>
        
        {condition.metrics && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>Current Status</Text>
            <View style={styles.metricsRow}>
              {condition.metrics.current && (
                <Text style={styles.metricValue}>
                  Current: {condition.metrics.current}
                  {condition.condition.includes('Steps') && ' steps'}
                  {condition.condition.includes('Heart Rate') && ' bpm'}
                  {condition.condition.includes('Sleep') && ' hours'}
                </Text>
              )}
              {condition.metrics.trend && (
                <Text style={[
                  styles.trendIndicator,
                  { color: condition.metrics.trend === 'stable' ? '#10B981' : '#F59E0B' }
                ]}>
                  Trend: {condition.metrics.trend}
                </Text>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {condition.recommendations?.slice(0, 3).map((rec, idx) => (
            <View key={idx} style={styles.recommendationItem}>
              <Icon name="checkmark" size={12} color="#10B981" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
          {condition.recommendations?.length > 3 && (
            <TouchableOpacity 
              style={styles.showMoreButton}
              onPress={() => Alert.alert(condition.condition, condition.recommendations.join('\n• '))}
            >
              <Text style={styles.showMoreText}>
                Show {condition.recommendations.length - 3} more recommendations
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderNoDeviceState = () => (
    <View style={styles.noDeviceContainer}>
      <Icon name="watch" size={64} color="#9CA3AF" />
      <Text style={styles.noDeviceTitle}>No Device Connected</Text>
      <Text style={styles.noDeviceDescription}>
        Connect your smartwatch to monitor chronic conditions and get personalized health insights.
      </Text>
      <TouchableOpacity 
        style={styles.connectDeviceButton}
        onPress={() => Alert.alert('Connect Device', 'Go to the Home screen to connect your smartwatch')}
      >
        <Icon name="bluetooth" size={20} color="#FFFFFF" />
        <Text style={styles.connectDeviceText}>Connect Device</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.loadingText}>Analyzing your health data...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Chronic Monitors</Text>
            <Text style={styles.headerSubtitle}>
              {hasConnectedDevice ? 'Based on your real-time health data' : 'Connect a device to get started'}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
            <Icon name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          renderLoadingState()
        ) : !hasConnectedDevice ? (
          renderNoDeviceState()
        ) : (
          <View style={styles.conditionsContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Health Overview</Text>
              <Text style={styles.summaryText}>
                {chronicConditions.length === 1 && chronicConditions[0].severity === 'good' 
                  ? "Great job! Your health metrics are looking good." 
                  : `Found ${chronicConditions.length} area${chronicConditions.length !== 1 ? 's' : ''} for attention.`
                }
              </Text>
              <Text style={styles.lastUpdated}>
                Last updated: {new Date().toLocaleString()}
              </Text>
            </View>
            
            {chronicConditions.map(renderConditionCard)}
            
            <View style={styles.disclaimerCard}>
              <Icon name="information-circle" size={20} color="#6B7280" />
              <Text style={styles.disclaimerText}>
                This analysis is based on your smartwatch data and is for informational purposes only. 
                Always consult with healthcare professionals for medical advice.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  noDeviceContainer: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noDeviceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noDeviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  connectDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectDeviceText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  conditionsContainer: {
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  conditionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  conditionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  conditionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  metricsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  metricsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  trendIndicator: {
    fontSize: 12,
    fontWeight: '500',
  },
  recommendationsContainer: {
    marginTop: 4,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  showMoreButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  showMoreText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});