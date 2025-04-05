import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Platform-specific progress view handling
const PlatformProgressView = (() => {
  if (Platform.OS === 'ios') {
    try {
      return require('react-native').ProgressViewIOS;
    } catch (e) {
      console.warn('ProgressViewIOS could not be loaded');
      return null;
    }
  } else {
    // Web or other platforms fallback
    return null;
  }
})();

const { width } = Dimensions.get('window');

// ============= Button Component =============
export const Button = ({ title, onPress, loading, style, icon, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <Icon name={icon} size={18} color="white" style={styles.buttonIcon} />}
          <Text style={styles.buttonText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============= Input Component =============
export const Input = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  icon,
  keyboardType,
  autoCapitalize,
  style,
}) => {
  return (
    <View style={[styles.inputContainer, style]}>
      {icon && <Icon name={icon} size={20} color="#A0AEC0" style={styles.inputIcon} />}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        placeholderTextColor="#A0AEC0"
      />
    </View>
  );
};

// ============= Card Component =============
export const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

// ============= Header Component =============
export const Header = ({ title, showLogo, onBackPress }) => {
  return (
    <SafeAreaView style={styles.headerSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        {onBackPress ? (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Icon name="arrow-back" size={24} color="#1A202C" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerLeftSpace} />
        )}
        {showLogo ? (
          <Text style={styles.logoText}>XEVOX</Text>
        ) : (
          <Text style={styles.headerTitle}>{title}</Text>
        )}
        <View style={styles.headerRightSpace} />
      </View>
    </SafeAreaView>
  );
};

// ============= HealthMetricCard Component =============
export const HealthMetricCard = ({ icon, title, value, target, unit }) => {
  // Calculate progress if target is provided
  const progress = target ? Math.min(value / target, 1) : 1;
  const displayValue = typeof value === 'number' ? 
    (value % 1 === 0 ? value : value.toFixed(1)) : 
    value;

  // Create a cross-platform progress component
  const renderProgress = () => {
    // Always use a custom web-style progress bar
    return (
      <View style={styles.webProgressContainer}>
        <View 
          style={[
            styles.webProgressBar, 
            { width: `${progress * 100}%` }
          ]} 
        />
      </View>
    );
  };

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconContainer}>
        <Icon name={icon} size={24} color="#4F46E5" />
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>
        {displayValue}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
      {target && (
        <View style={styles.progressContainer}>
          {renderProgress()}
          <Text style={styles.targetText}>
            {Math.round(progress * 100)}% of {target} {unit}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============= ChatBubble Component =============
export const ChatBubble = ({ message, isUser }) => {
  return (
    <View style={[styles.chatBubbleContainer, isUser ? styles.userBubbleContainer : {}]}>
      <View style={[styles.chatBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.chatText, isUser ? styles.userChatText : styles.assistantChatText]}>
          {message}
        </Text>
      </View>
    </View>
  );
};

// ============= Styles =============
const styles = StyleSheet.create({
  // Button styles
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Input styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A202C',
  },

  // Card styles
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  // Header styles
  headerSafeArea: {
    backgroundColor: 'white',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  headerLeftSpace: {
    width: 24,
  },
  headerRightSpace: {
    width: 24,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },

  // Health Metric Card styles
  metricCard: {
    width: width / 2 - 24,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#718096',
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    marginBottom: 4,
  },
  targetText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'right',
  },

  // Chat Bubble styles
  chatBubbleContainer: {
    maxWidth: '80%',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
  },
  chatBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: '#EDF2F7',
  },
  userBubble: {
    backgroundColor: '#4F46E5',
  },
  chatText: {
    fontSize: 16,
    lineHeight: 22,
  },
  assistantChatText: {
    color: '#1A202C',
  },
  userChatText: {
    color: 'white',
  },
});

const additionalStyles = {
  webProgressContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 4,
  },
  webProgressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
  }
};