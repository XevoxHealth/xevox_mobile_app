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
  RefreshControl,
  Dimensions
} from 'react-native';
import { useAuth } from './context';
import { api } from './api_service';

const { width: screenWidth } = Dimensions.get('window');

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

// Mini chart component for showing trends
const MiniChart = ({ data, color, height = 40 }) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.chartPlaceholder, { height }]}>
        <Text style={styles.noChartText}>No data</Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <View style={[styles.chartContainer, { height }]}>
      {data.map((value, index) => {
        const barHeight = Math.max(4, ((value - min) / range) * (height - 8));
        return (
          <View
            key={index}
            style={[
              styles.chartBar,
              {
                height: barHeight,
                backgroundColor: color,
                width: Math.max(80 / data.length - 2, 3),
              }
            ]}
          />
        );
      })}
    </View>
  );
};

// Risk Level Indicator
const RiskIndicator = ({ level }) => {
  const getRiskColor = () => {
    switch (level.toLowerCase()) {
      case 'low': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'very high': return '#DC2626';
      default: return '#6B7280';
    }
  };

  return (
    <View style={[styles.riskBadge, { backgroundColor: getRiskColor() }]}>
      <Text style={styles.riskText}>{level.toUpperCase()}</Text>
    </View>
  );
};

// Chronic Condition Card Component
const ChronicConditionCard = ({ condition, onPress }) => {
  const { name, description, riskLevel, keyMetrics, recommendations, color, icon } = condition;

  return (
    <TouchableOpacity 
      style={styles.conditionCard}
      onPress={() => onPress(condition)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <RiskIndicator level={riskLevel} />
      </View>

      <Text style={styles.conditionName}>{name}</Text>
      <Text style={styles.conditionDescription}>{description}</Text>

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.metricsTitle}>Key Indicators</Text>
        <View style={styles.metricsGrid}>
          {keyMetrics.map((metric, index) => (
            <View key={index} style={styles.metricItem}>
              <Text style={styles.metricLabel}>{metric.name}</Text>
              <Text style={[styles.metricValue, { color }]}>
                {metric.value} {metric.unit}
              </Text>
              <Text style={styles.metricStatus}>{metric.status}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Mini Chart */}
      {keyMetrics[0]?.history && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>7-Day Trend</Text>
          <MiniChart 
            data={keyMetrics[0].history} 
            color={color}
            height={40}
          />
        </View>
      )}

      {/* Quick Recommendations */}
      <View style={styles.recommendationsPreview}>
        <Text style={styles.recommendationsTitle}>Recommendations</Text>
        <Text style={styles.recommendationText}>
          {recommendations[0]}
        </Text>
        {recommendations.length > 1 && (
          <Text style={styles.moreRecommendations}>
            +{recommendations.length - 1} more recommendations
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const ChronicMonitorsScreen = () => {
  const { authState } = useAuth();
  const [healthData, setHealthData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasConnectedDevice, setHasConnectedDevice] = useState(false);

  useEffect(() => {
    loadHealthData();
    checkDeviceStatus();
  }, []);

  const loadHealthData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading health data for chronic conditions analysis...');
      
      // Get health data from backend
      const data = await api.getHealthData('week');
      setHealthData(data);
      
    } catch (error) {
      console.error('Error loading health data:', error);
      Alert.alert('Error', 'Failed to load health data');
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
    await checkDeviceStatus();
    setRefreshing(false);
  };

  // Analyze health data for chronic conditions
  const analyzeChronicConditions = () => {
    const conditions = [];

    // 1. CARDIOVASCULAR DISEASE
    const heartRate = healthData.heartRate?.average || 75;
    const bloodPressure = {
      systolic: healthData.bloodPressure?.current_systolic || 120,
      diastolic: healthData.bloodPressure?.current_diastolic || 80
    };
    const steps = healthData.steps?.average || 5000;

    const cvdRisk = calculateCVDRisk(heartRate, bloodPressure, steps);
    conditions.push({
      name: 'Cardiovascular Disease',
      description: 'Heart and blood vessel health monitoring',
      riskLevel: cvdRisk.level,
      color: '#EF4444',
      icon: 'heart',
      keyMetrics: [
        {
          name: 'Heart Rate',
          value: Math.round(heartRate),
          unit: 'bpm',
          status: heartRate > 100 ? 'Elevated' : heartRate < 60 ? 'Low' : 'Normal',
          history: healthData.heartRate?.values?.slice(-7) || []
        },
        {
          name: 'Blood Pressure',
          value: `${Math.round(bloodPressure.systolic)}/${Math.round(bloodPressure.diastolic)}`,
          unit: 'mmHg',
          status: bloodPressure.systolic > 140 ? 'High' : 'Normal',
          history: []
        },
        {
          name: 'Activity Level',
          value: Math.round(steps),
          unit: 'steps/day',
          status: steps < 5000 ? 'Low' : steps > 10000 ? 'Excellent' : 'Good',
          history: healthData.steps?.values?.slice(-7) || []
        }
      ],
      recommendations: cvdRisk.recommendations
    });

    // 2. DIABETES
    const glucose = healthData.bloodGlucose?.average || 95;
    const diabetesRisk = calculateDiabetesRisk(glucose, steps);
    conditions.push({
      name: 'Diabetes',
      description: 'Blood sugar and metabolic health',
      riskLevel: diabetesRisk.level,
      color: '#8B5CF6',
      icon: 'water',
      keyMetrics: [
        {
          name: 'Blood Glucose',
          value: Math.round(glucose),
          unit: 'mg/dL',
          status: glucose > 125 ? 'High' : glucose < 70 ? 'Low' : 'Normal',
          history: healthData.bloodGlucose?.values?.slice(-7) || []
        },
        {
          name: 'Physical Activity',
          value: Math.round(steps),
          unit: 'steps/day',
          status: steps < 5000 ? 'Insufficient' : 'Adequate',
          history: healthData.steps?.values?.slice(-7) || []
        }
      ],
      recommendations: diabetesRisk.recommendations
    });

    // 3. HYPERTENSION
    const hypertensionRisk = calculateHypertensionRisk(bloodPressure, healthData.stress?.average || 3);
    conditions.push({
      name: 'Hypertension',
      description: 'High blood pressure monitoring',
      riskLevel: hypertensionRisk.level,
      color: '#DC2626',
      icon: 'medical',
      keyMetrics: [
        {
          name: 'Systolic BP',
          value: Math.round(bloodPressure.systolic),
          unit: 'mmHg',
          status: bloodPressure.systolic > 140 ? 'High' : bloodPressure.systolic > 120 ? 'Elevated' : 'Normal',
          history: []
        },
        {
          name: 'Diastolic BP',
          value: Math.round(bloodPressure.diastolic),
          unit: 'mmHg',
          status: bloodPressure.diastolic > 90 ? 'High' : bloodPressure.diastolic > 80 ? 'Elevated' : 'Normal',
          history: []
        },
        {
          name: 'Stress Level',
          value: Math.round(healthData.stress?.average || 3),
          unit: '/10',
          status: (healthData.stress?.average || 3) > 6 ? 'High' : 'Normal',
          history: healthData.stress?.values?.slice(-7) || []
        }
      ],
      recommendations: hypertensionRisk.recommendations
    });

    // 4. CHRONIC RESPIRATORY DISEASES
    const oxygenSat = healthData.oxygenSaturation?.average || 98;
    const respiratoryRisk = calculateRespiratoryRisk(oxygenSat, heartRate);
    conditions.push({
      name: 'Chronic Respiratory Diseases',
      description: 'Lung function and breathing health',
      riskLevel: respiratoryRisk.level,
      color: '#22C55E',
      icon: 'leaf',
      keyMetrics: [
        {
          name: 'Oxygen Saturation',
          value: Math.round(oxygenSat),
          unit: '%',
          status: oxygenSat < 95 ? 'Low' : oxygenSat < 98 ? 'Borderline' : 'Normal',
          history: healthData.oxygenSaturation?.values?.slice(-7) || []
        },
        {
          name: 'Resting Heart Rate',
          value: Math.round(heartRate),
          unit: 'bpm',
          status: heartRate > 100 ? 'Elevated' : 'Normal',
          history: healthData.heartRate?.values?.slice(-7) || []
        }
      ],
      recommendations: respiratoryRisk.recommendations
    });

    // 5. OBESITY AND METABOLIC SYNDROME
    const calories = healthData.caloriesBurned?.average || 2000;
    const metabolicRisk = calculateMetabolicRisk(steps, calories);
    conditions.push({
      name: 'Obesity & Metabolic Syndrome',
      description: 'Weight management and metabolism',
      riskLevel: metabolicRisk.level,
      color: '#F97316',
      icon: 'fitness',
      keyMetrics: [
        {
          name: 'Daily Steps',
          value: Math.round(steps),
          unit: 'steps',
          status: steps < 5000 ? 'Low' : steps > 10000 ? 'Excellent' : 'Good',
          history: healthData.steps?.values?.slice(-7) || []
        },
        {
          name: 'Calories Burned',
          value: Math.round(calories),
          unit: 'kcal',
          status: calories < 1800 ? 'Low' : calories > 2500 ? 'High' : 'Normal',
          history: healthData.caloriesBurned?.values?.slice(-7) || []
        },
        {
          name: 'Activity Level',
          value: Math.round((steps / 10000) * 100),
          unit: '%',
          status: steps < 5000 ? 'Inactive' : steps > 10000 ? 'Active' : 'Moderate',
          history: []
        }
      ],
      recommendations: metabolicRisk.recommendations
    });

    return conditions;
  };

  // Risk calculation functions
  const calculateCVDRisk = (heartRate, bp, steps) => {
    let riskScore = 0;
    
    if (heartRate > 100 || heartRate < 50) riskScore += 2;
    if (bp.systolic > 140 || bp.diastolic > 90) riskScore += 3;
    if (steps < 5000) riskScore += 2;

    const level = riskScore >= 5 ? 'high' : riskScore >= 3 ? 'moderate' : 'low';
    
    return {
      level,
      recommendations: [
        'Regular cardiovascular exercise (30 min/day)',
        'Monitor blood pressure daily',
        'Maintain a low-sodium diet',
        'Manage stress through meditation',
        'Get adequate sleep (7-9 hours)',
        'Quit smoking if applicable'
      ]
    };
  };

  const calculateDiabetesRisk = (glucose, steps) => {
    let riskScore = 0;
    
    if (glucose > 125) riskScore += 3;
    else if (glucose > 100) riskScore += 1;
    if (steps < 5000) riskScore += 2;

    const level = riskScore >= 4 ? 'high' : riskScore >= 2 ? 'moderate' : 'low';
    
    return {
      level,
      recommendations: [
        'Monitor blood glucose regularly',
        'Follow a balanced, low-sugar diet',
        'Exercise regularly to improve insulin sensitivity',
        'Maintain a healthy weight',
        'Stay hydrated throughout the day',
        'Limit processed foods and refined carbs'
      ]
    };
  };

  const calculateHypertensionRisk = (bp, stress) => {
    let riskScore = 0;
    
    if (bp.systolic > 140) riskScore += 3;
    else if (bp.systolic > 120) riskScore += 1;
    if (bp.diastolic > 90) riskScore += 3;
    else if (bp.diastolic > 80) riskScore += 1;
    if (stress > 6) riskScore += 2;

    const level = riskScore >= 5 ? 'high' : riskScore >= 2 ? 'moderate' : 'low';
    
    return {
      level,
      recommendations: [
        'Reduce sodium intake (<2300mg/day)',
        'Practice stress management techniques',
        'Maintain regular sleep schedule',
        'Exercise regularly but avoid intense workouts',
        'Limit alcohol consumption',
        'Monitor blood pressure twice daily'
      ]
    };
  };

  const calculateRespiratoryRisk = (oxygenSat, heartRate) => {
    let riskScore = 0;
    
    if (oxygenSat < 95) riskScore += 3;
    else if (oxygenSat < 98) riskScore += 1;
    if (heartRate > 100) riskScore += 1;

    const level = riskScore >= 3 ? 'moderate' : 'low';
    
    return {
      level,
      recommendations: [
        'Practice deep breathing exercises',
        'Avoid air pollutants and allergens',
        'Stay up to date with vaccinations',
        'Exercise regularly to improve lung capacity',
        'Maintain good indoor air quality',
        'Consider pulmonary rehabilitation if needed'
      ]
    };
  };

  const calculateMetabolicRisk = (steps, calories) => {
    let riskScore = 0;
    
    if (steps < 5000) riskScore += 2;
    if (calories < 1800 || calories > 2800) riskScore += 1;

    const level = riskScore >= 2 ? 'moderate' : 'low';
    
    return {
      level,
      recommendations: [
        'Aim for 10,000 steps daily',
        'Follow a balanced Mediterranean diet',
        'Include strength training 2-3x/week',
        'Monitor portion sizes',
        'Stay consistent with meal timing',
        'Focus on whole foods over processed options'
      ]
    };
  };

  const handleConditionPress = (condition) => {
    const detailsText = `${condition.name}\n\nRisk Level: ${condition.riskLevel.toUpperCase()}\n\n${condition.description}\n\nKey Metrics:\n${condition.keyMetrics.map(m => `• ${m.name}: ${m.value} ${m.unit} (${m.status})`).join('\n')}\n\nRecommendations:\n${condition.recommendations.slice(0, 3).map(r => `• ${r}`).join('\n')}`;
    
    Alert.alert(condition.name, detailsText, [{ text: 'OK' }]);
  };

  const renderNoDeviceState = () => (
    <View style={styles.noDeviceContainer}>
      <Icon name="watch" size={64} color="#9CA3AF" />
      <Text style={styles.noDeviceTitle}>Connect Your Smartwatch</Text>
      <Text style={styles.noDeviceDescription}>
        Connect your smartwatch to monitor chronic conditions and get personalized health insights based on real-time data.
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderLoadingState()}
      </SafeAreaView>
    );
  }

  if (!hasConnectedDevice) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chronic Conditions Monitor</Text>
            <Text style={styles.headerSubtitle}>5 Key Health Areas</Text>
          </View>
        </LinearGradient>
        {renderNoDeviceState()}
      </SafeAreaView>
    );
  }

  const conditions = analyzeChronicConditions();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Chronic Conditions Monitor</Text>
            <Text style={styles.headerSubtitle}>
              Based on your real-time health data
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
            <Icon name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Health Overview</Text>
          <Text style={styles.summaryText}>
            Monitoring 5 key chronic conditions based on your real-time health metrics from your connected smartwatch.
          </Text>
          <Text style={styles.lastUpdated}>
            Last updated: {new Date().toLocaleString()}
          </Text>
        </View>

        <View style={styles.conditionsGrid}>
          {conditions.map((condition, index) => (
            <ChronicConditionCard
              key={index}
              condition={condition}
              onPress={handleConditionPress}
            />
          ))}
        </View>

        <View style={styles.disclaimerCard}>
          <Icon name="information" size={20} color="#6B7280" />
          <Text style={styles.disclaimerText}>
            This analysis is based on your smartwatch data and general health guidelines. 
            Always consult with healthcare professionals for medical advice and diagnosis.
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
    fontSize: 20,
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
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 120, // Extra padding for tab bar to avoid conflicts
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 20,
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
  summaryCard: {
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
  conditionsGrid: {
    marginBottom: 20,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  conditionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  conditionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  metricsSection: {
    marginBottom: 16,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricStatus: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  chartSection: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  chartBar: {
    borderRadius: 2,
    marginHorizontal: 1,
  },
  chartPlaceholder: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  recommendationsPreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  moreRecommendations: {
    fontSize: 11,
    color: '#4F46E5',
    marginTop: 4,
    fontWeight: '500',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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