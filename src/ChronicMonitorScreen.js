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

// Mini chart component for showing real data trends only
const MiniChart = ({ data, color, height = 40 }) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.chartPlaceholder, { height }]}>
        <Text style={styles.noChartText}>No real data</Text>
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

// Chronic Condition Card Component - Real Data Only
const ChronicConditionCard = ({ condition, onPress }) => {
  const { name, description, riskLevel, keyMetrics, recommendations, color, icon, isRealData } = condition;

  return (
    <TouchableOpacity 
      style={[
        styles.conditionCard,
        !isRealData && styles.conditionCardDisabled
      ]}
      onPress={() => onPress(condition)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        {isRealData ? (
          <RiskIndicator level={riskLevel} />
        ) : (
          <View style={styles.noDataBadge}>
            <Text style={styles.noDataBadgeText}>NO REAL DATA</Text>
          </View>
        )}
      </View>

      <Text style={[
        styles.conditionName,
        !isRealData && styles.conditionNameDisabled
      ]}>
        {name}
      </Text>
      <Text style={[
        styles.conditionDescription,
        !isRealData && styles.conditionDescriptionDisabled
      ]}>
        {isRealData ? description : 'Connect your device to monitor this condition with real data'}
      </Text>

      {isRealData && keyMetrics && keyMetrics.length > 0 && (
        <>
          {/* Key Metrics */}
          <View style={styles.metricsSection}>
            <Text style={styles.metricsTitle}>Key Indicators (Real Data)</Text>
            <View style={styles.metricsGrid}>
              {keyMetrics.map((metric, index) => (
                <View key={index} style={styles.metricItem}>
                  <Text style={styles.metricLabel}>{metric.name}</Text>
                  <Text style={[styles.metricValue, { color }]}>
                    {metric.value} {metric.unit}
                  </Text>
                  <Text style={styles.metricStatus}>{metric.status}</Text>
                  <Text style={styles.realDataIndicator}>✓ Real</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Mini Chart for Real Data */}
          {keyMetrics[0]?.history && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>7-Day Real Data Trend</Text>
              <MiniChart 
                data={keyMetrics[0].history} 
                color={color}
                height={40}
              />
            </View>
          )}

          {/* Real Data Recommendations */}
          <View style={styles.recommendationsPreview}>
            <Text style={styles.recommendationsTitle}>Recommendations (Based on Real Data)</Text>
            <Text style={styles.recommendationText}>
              {recommendations[0]}
            </Text>
            {recommendations.length > 1 && (
              <Text style={styles.moreRecommendations}>
                +{recommendations.length - 1} more recommendations
              </Text>
            )}
          </View>
        </>
      )}

      {!isRealData && (
        <View style={styles.noRealDataSection}>
          <Icon name="warning" size={32} color="#F59E0B" />
          <Text style={styles.noRealDataTitle}>Real Device Required</Text>
          <Text style={styles.noRealDataText}>
            Connect your health monitoring device to monitor {name.toLowerCase()} with real health measurements.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ChronicMonitorsScreen = () => {
  const { authState } = useAuth();
  const [healthData, setHealthData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasRealDevice, setHasRealDevice] = useState(false);
  const [realDataAvailable, setRealDataAvailable] = useState(false);

  useEffect(() => {
    loadHealthData();
    checkDeviceStatus();
  }, []);

  const loadHealthData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading REAL health data for chronic conditions analysis...');
      
      const data = await api.getHealthData('week');
      setHealthData(data);
      
      const hasRealData = Object.keys(data).some(key => {
        const metricData = data[key];
        return metricData && typeof metricData === 'object' && metricData.is_real === true;
      });
      
      setRealDataAvailable(hasRealData);
      console.log('Real data available:', hasRealData);
      
    } catch (error) {
      console.error('Error loading REAL health data:', error);
      Alert.alert('Error', 'Failed to load real health data. Please check your device connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      const deviceStatus = await api.getConnectedDevices();
      const hasDevice = deviceStatus.devices && deviceStatus.devices.length > 0;
      setHasRealDevice(hasDevice);
      console.log('Real device connected:', hasDevice);
    } catch (error) {
      console.error('Error checking real device status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
    await checkDeviceStatus();
    setRefreshing(false);
  };

  const analyzeChronicConditions = () => {
    const conditions = [];

    // 1. CARDIOVASCULAR DISEASE
    const heartRate = (healthData.heartRate?.is_real && healthData.heartRate?.average) || 0;
    const bloodPressure = {
      systolic: (healthData.bloodPressure?.is_real && healthData.bloodPressure?.current_systolic) || 0,
      diastolic: (healthData.bloodPressure?.is_real && healthData.bloodPressure?.current_diastolic) || 0
    };
    const steps = (healthData.steps?.is_real && healthData.steps?.average) || 0;

    const hasCardioRealData = heartRate > 0 || bloodPressure.systolic > 0 || steps > 0;
    const cvdRisk = hasCardioRealData ? calculateCVDRisk(heartRate, bloodPressure, steps) : null;
    
    conditions.push({
      name: 'Cardiovascular Disease',
      description: hasCardioRealData 
        ? 'Heart and blood vessel health monitoring based on real device data'
        : 'Heart and blood vessel health monitoring',
      riskLevel: cvdRisk?.level || 'unknown',
      color: '#EF4444',
      icon: 'heart',
      isRealData: hasCardioRealData,
      keyMetrics: hasCardioRealData ? [
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
      ] : [],
      recommendations: cvdRisk?.recommendations || [
        'Connect your device to monitor cardiovascular health',
        'Regular heart rate and blood pressure tracking needed'
      ]
    });

    // 2. DIABETES
    const glucose = (healthData.bloodGlucose?.is_real && healthData.bloodGlucose?.average) || 0;
    const realSteps = (healthData.steps?.is_real && healthData.steps?.average) || 0;
    
    const hasDiabetesRealData = glucose > 0 || realSteps > 0;
    const diabetesRisk = hasDiabetesRealData ? calculateDiabetesRisk(glucose, realSteps) : null;
    
    conditions.push({
      name: 'Diabetes',
      description: hasDiabetesRealData
        ? 'Blood sugar and metabolic health based on real device measurements'
        : 'Blood sugar and metabolic health monitoring',
      riskLevel: diabetesRisk?.level || 'unknown',
      color: '#8B5CF6',
      icon: 'water',
      isRealData: hasDiabetesRealData,
      keyMetrics: hasDiabetesRealData ? [
        {
          name: 'Blood Glucose',
          value: Math.round(glucose),
          unit: 'mg/dL',
          status: glucose > 125 ? 'High' : glucose < 70 ? 'Low' : 'Normal',
          history: healthData.bloodGlucose?.values?.slice(-7) || []
        },
        {
          name: 'Physical Activity',
          value: Math.round(realSteps),
          unit: 'steps/day',
          status: realSteps < 5000 ? 'Insufficient' : 'Adequate',
          history: healthData.steps?.values?.slice(-7) || []
        }
      ] : [],
      recommendations: diabetesRisk?.recommendations || [
        'Connect your device to track blood glucose levels',
        'Activity monitoring needed for diabetes prevention'
      ]
    });

    // 3. HYPERTENSION
    const realBP = {
      systolic: (healthData.bloodPressure?.is_real && healthData.bloodPressure?.current_systolic) || 0,
      diastolic: (healthData.bloodPressure?.is_real && healthData.bloodPressure?.current_diastolic) || 0
    };
    const stress = (healthData.stress?.is_real && healthData.stress?.average) || 0;
    
    const hasHypertensionRealData = realBP.systolic > 0 || realBP.diastolic > 0 || stress > 0;
    const hypertensionRisk = hasHypertensionRealData ? calculateHypertensionRisk(realBP, stress) : null;
    
    conditions.push({
      name: 'Hypertension',
      description: hasHypertensionRealData
        ? 'High blood pressure monitoring with real device data'
        : 'High blood pressure monitoring',
      riskLevel: hypertensionRisk?.level || 'unknown',
      color: '#DC2626',
      icon: 'medical',
      isRealData: hasHypertensionRealData,
      keyMetrics: hasHypertensionRealData ? [
        {
          name: 'Systolic BP',
          value: Math.round(realBP.systolic),
          unit: 'mmHg',
          status: realBP.systolic > 140 ? 'High' : realBP.systolic > 120 ? 'Elevated' : 'Normal',
          history: []
        },
        {
          name: 'Diastolic BP',
          value: Math.round(realBP.diastolic),
          unit: 'mmHg',
          status: realBP.diastolic > 90 ? 'High' : realBP.diastolic > 80 ? 'Elevated' : 'Normal',
          history: []
        },
        {
          name: 'Stress Level',
          value: Math.round(stress),
          unit: '/10',
          status: stress > 6 ? 'High' : 'Normal',
          history: healthData.stress?.values?.slice(-7) || []
        }
      ] : [],
      recommendations: hypertensionRisk?.recommendations || [
        'Connect your device to monitor blood pressure',
        'Real-time stress tracking needed'
      ]
    });

    // 4. CHRONIC RESPIRATORY DISEASES
    const oxygenSat = (healthData.oxygenSaturation?.is_real && healthData.oxygenSaturation?.average) || 0;
    const realHeartRate = (healthData.heartRate?.is_real && healthData.heartRate?.average) || 0;
    
    const hasRespiratoryRealData = oxygenSat > 0 || realHeartRate > 0;
    const respiratoryRisk = hasRespiratoryRealData ? calculateRespiratoryRisk(oxygenSat, realHeartRate) : null;
    
    conditions.push({
      name: 'Chronic Respiratory Diseases',
      description: hasRespiratoryRealData
        ? 'Lung function and breathing health based on real measurements'
        : 'Lung function and breathing health monitoring',
      riskLevel: respiratoryRisk?.level || 'unknown',
      color: '#22C55E',
      icon: 'leaf',
      isRealData: hasRespiratoryRealData,
      keyMetrics: hasRespiratoryRealData ? [
        {
          name: 'Oxygen Saturation',
          value: Math.round(oxygenSat),
          unit: '%',
          status: oxygenSat < 95 ? 'Low' : oxygenSat < 98 ? 'Borderline' : 'Normal',
          history: healthData.oxygenSaturation?.values?.slice(-7) || []
        },
        {
          name: 'Resting Heart Rate',
          value: Math.round(realHeartRate),
          unit: 'bpm',
          status: realHeartRate > 100 ? 'Elevated' : 'Normal',
          history: healthData.heartRate?.values?.slice(-7) || []
        }
      ] : [],
      recommendations: respiratoryRisk?.recommendations || [
        'Connect your device to monitor oxygen saturation',
        'Real respiratory data needed for assessment'
      ]
    });

    // 5. OBESITY AND METABOLIC SYNDROME
    const calories = (healthData.caloriesBurned?.is_real && healthData.caloriesBurned?.average) || 0;
    const activitySteps = (healthData.steps?.is_real && healthData.steps?.average) || 0;
    
    const hasMetabolicRealData = activitySteps > 0 || calories > 0;
    const metabolicRisk = hasMetabolicRealData ? calculateMetabolicRisk(activitySteps, calories) : null;
    
    conditions.push({
      name: 'Obesity & Metabolic Syndrome',
      description: hasMetabolicRealData
        ? 'Weight management and metabolism based on real activity data'
        : 'Weight management and metabolism monitoring',
      riskLevel: metabolicRisk?.level || 'unknown',
      color: '#F97316',
      icon: 'fitness',
      isRealData: hasMetabolicRealData,
      keyMetrics: hasMetabolicRealData ? [
        {
          name: 'Daily Steps',
          value: Math.round(activitySteps),
          unit: 'steps',
          status: activitySteps < 5000 ? 'Low' : activitySteps > 10000 ? 'Excellent' : 'Good',
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
          value: Math.round((activitySteps / 10000) * 100),
          unit: '%',
          status: activitySteps < 5000 ? 'Inactive' : activitySteps > 10000 ? 'Active' : 'Moderate',
          history: []
        }
      ] : [],
      recommendations: metabolicRisk?.recommendations || [
        'Connect your device to track daily activity',
        'Real calorie and step data needed for assessment'
      ]
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
        'Regular cardiovascular exercise (30 min/day) - tracked by your device',
        'Monitor blood pressure daily with your device',
        'Maintain a low-sodium diet',
        'Continue real-time heart rate monitoring',
        'Get adequate sleep (7-9 hours) - track with device',
        'Use device stress monitoring to manage stress levels'
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
        'Monitor blood glucose regularly with compatible devices',
        'Follow a balanced, low-sugar diet',
        'Exercise regularly - track progress with your device',
        'Maintain a healthy weight',
        'Continue activity tracking with your device',
        'Use device data to correlate activity with glucose levels'
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
        'Monitor blood pressure twice daily with your device',
        'Use device stress tracking to identify triggers',
        'Maintain regular sleep schedule - track with device',
        'Exercise regularly but monitor heart rate',
        'Limit alcohol consumption',
        'Track correlations between stress and blood pressure'
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
        'Monitor oxygen saturation regularly with your device',
        'Practice deep breathing exercises',
        'Avoid air pollutants and allergens',
        'Exercise regularly to improve lung capacity - track with device',
        'Continue heart rate monitoring during activities',
        'Use device data to track breathing patterns'
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
        'Aim for 10,000 steps daily - track with your device',
        'Follow a balanced Mediterranean diet',
        'Include strength training 2-3x/week',
        'Monitor daily calorie burn with device',
        'Use activity data to set realistic goals',
        'Track sleep quality impact on metabolism with device'
      ]
    };
  };

  const handleConditionPress = (condition) => {
    if (!condition.isRealData) {
      Alert.alert(
        'Real Device Required',
        `To monitor ${condition.name}, you need to connect your health monitoring device.\n\nReal health measurements are required for accurate chronic condition monitoring.`,
        [
          { text: 'OK' },
          { text: 'Learn More', onPress: () => {
            Alert.alert(
              'Why Real Data Matters',
              'Chronic condition monitoring requires accurate, real-time health measurements from your actual device. Demo data cannot provide the precision needed for health analysis.\n\nConnect your device to get:\n• Real heart rate monitoring\n• Actual blood pressure readings\n• True activity levels\n• Accurate sleep data',
              [{ text: 'Understood' }]
            );
          }}
        ]
      );
      return;
    }

    const detailsText = `${condition.name}\n\nRisk Level: ${condition.riskLevel.toUpperCase()}\n\n${condition.description}\n\nKey Metrics (Real Data):\n${condition.keyMetrics.map(m => `• ${m.name}: ${m.value} ${m.unit} (${m.status})`).join('\n')}\n\nRecommendations:\n${condition.recommendations.slice(0, 3).map(r => `• ${r}`).join('\n')}\n\n✓ Based on real device measurements`;
    
    Alert.alert(`${condition.name} (Real Data)`, detailsText, [{ text: 'OK' }]);
  };

  const renderNoDeviceState = () => (
    <View style={styles.noDeviceContainer}>
      <Icon name="watch" size={64} color="#9CA3AF" />
      <Text style={styles.noDeviceTitle}>Connect Your Real Device</Text>
      <Text style={styles.noDeviceDescription}>
        Connect your health monitoring device to monitor chronic conditions with real health data. Demo data is not supported for medical monitoring.
      </Text>
      <View style={styles.benefitsList}>
        <Text style={styles.benefitsTitle}>Real Device Benefits:</Text>
        <Text style={styles.benefitItem}>• Accurate heart rate and blood pressure readings</Text>
        <Text style={styles.benefitItem}>• Real activity and sleep tracking</Text>
        <Text style={styles.benefitItem}>• Precise health trend analysis</Text>
        <Text style={styles.benefitItem}>• Reliable chronic condition monitoring</Text>
      </View>
      <TouchableOpacity 
        style={styles.connectDeviceButton}
        onPress={() => Alert.alert('Connect Device', 'Go to the Home screen to connect your real health monitoring device')}
      >
        <Icon name="bluetooth" size={20} color="#FFFFFF" />
        <Text style={styles.connectDeviceText}>Connect Real Device</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.loadingText}>Analyzing your real health data...</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderLoadingState()}
      </SafeAreaView>
    );
  }

  if (!hasRealDevice) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chronic Conditions Monitor</Text>
            <Text style={styles.headerSubtitle}>Real Device Data Required</Text>
          </View>
        </LinearGradient>
        {renderNoDeviceState()}
      </SafeAreaView>
    );
  }

  const conditions = analyzeChronicConditions();
  const realConditionsCount = conditions.filter(c => c.isRealData).length;

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
              {realDataAvailable 
                ? `${realConditionsCount} conditions with real data`
                : 'Real device connected, waiting for data'
              }
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
            {realDataAvailable 
              ? `Monitoring 5 key chronic conditions based on your real health metrics from your connected device. ${realConditionsCount} conditions have real data available.`
              : 'Your device is connected but waiting for real health data. Make sure your device is actively collecting measurements.'
            }
          </Text>
          <Text style={styles.lastUpdated}>
            Last updated: {new Date().toLocaleString()}
          </Text>
          
          {!realDataAvailable && hasRealDevice && (
            <View style={styles.waitingForDataNotice}>
              <Icon name="clock" size={20} color="#F59E0B" />
              <Text style={styles.waitingForDataText}>
                Device connected. Waiting for real health measurements to begin chronic condition analysis.
              </Text>
            </View>
          )}
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
            This analysis is based on real health data from your connected device and general health guidelines. 
            Always consult with healthcare professionals for medical advice and diagnosis. Demo data is not used in this analysis.
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
    paddingBottom: 120,
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
    textAlign: 'center',
  },
  noDeviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  benefitsList: {
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
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
  waitingForDataNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  waitingForDataText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
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
  conditionCardDisabled: {
    opacity: 0.7,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
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
  noDataBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  noDataBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  conditionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  conditionNameDisabled: {
    color: '#9CA3AF',
  },
  conditionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  conditionDescriptionDisabled: {
    color: '#9CA3AF',
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
  realDataIndicator: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: 'bold',
    marginTop: 2,
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
  noRealDataSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noRealDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 8,
  },
  noRealDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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