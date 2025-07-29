import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView
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

export const HealthAssistantScreen = () => {
  const { authState } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI health assistant. I analyze real health data from your connected ET475 or compatible smartwatch to provide personalized insights and recommendations. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
      type: 'welcome'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [realHealthContext, setRealHealthContext] = useState(null);
  const [hasRealDevice, setHasRealDevice] = useState(false);
  const [realDataAvailable, setRealDataAvailable] = useState(false);
  const scrollViewRef = useRef();

  // Quick action buttons for real health data questions
  const quickActions = [
    { id: 1, text: "How's my real health data today?", icon: "heart", requiresRealData: true },
    { id: 2, text: "Give me recommendations based on my device", icon: "checkmark-circle", requiresRealData: true },
    { id: 3, text: "What should I focus on from my readings?", icon: "target", requiresRealData: true },
    { id: 4, text: "Explain my chronic conditions from real data", icon: "medical", requiresRealData: true },
    { id: 5, text: "Help me connect my ET475 device", icon: "bluetooth", requiresRealData: false },
    { id: 6, text: "Why is real data important?", icon: "help", requiresRealData: false }
  ];

  useEffect(() => {
    // Load real health context when component mounts
    loadRealHealthContext();
  }, []);

  const loadRealHealthContext = async () => {
    try {
      console.log('Loading REAL health context for chat...');
      
      // Check device status first
      const deviceStatus = await api.getConnectedDevices();
      const deviceConnected = deviceStatus.devices && deviceStatus.devices.length > 0;
      setHasRealDevice(deviceConnected);
      
      if (!deviceConnected) {
        console.log('No real device connected');
        const noDeviceMessage = {
          id: Date.now() + 500,
          text: "I notice you don't have a real device connected yet. Connect your ET475 or compatible smartwatch to get personalized insights based on your actual health measurements. I can help you with the setup process!",
          isUser: false,
          timestamp: new Date(),
          type: 'device_status'
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, noDeviceMessage]);
        }, 1000);
        return;
      }
      
      // Try to get current real health data for context
      const healthData = await api.getHealthData('day');
      
      if (healthData) {
        // Validate that we have real data
        const hasRealData = Object.values(healthData).some(metric => 
          metric && typeof metric === 'object' && metric.is_real === true && 
          (metric.current_value > 0 || metric.average > 0)
        );
        
        setRealDataAvailable(hasRealData);
        
        if (hasRealData) {
          setRealHealthContext(healthData);
          console.log('Real health context loaded:', Object.keys(healthData).filter(k => 
            healthData[k]?.is_real === true
          ));
          
          // Add a context message about available real health data
          const realDataCount = Object.keys(healthData).filter(k => 
            healthData[k] && typeof healthData[k] === 'object' && healthData[k].is_real === true &&
            (healthData[k].current_value > 0 || healthData[k].average > 0)
          ).length;
          
          const contextMessage = {
            id: Date.now() + 1000,
            text: `Great! I can see real health data from your connected device with ${realDataCount} active metrics. I can provide personalized insights and recommendations based on your actual measurements. Feel free to ask me about your health trends, readings, or what they mean!`,
            isUser: false,
            timestamp: new Date(),
            type: 'real_data_context'
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, contextMessage]);
          }, 1500);
        } else {
          console.log('Device connected but no real data available yet');
          const waitingDataMessage = {
            id: Date.now() + 1000,
            text: "I can see your device is connected, but I'm waiting for real health measurements to come through. Make sure your ET475 is actively collecting data and try syncing it. Once I have your real data, I can provide much more personalized assistance!",
            isUser: false,
            timestamp: new Date(),
            type: 'waiting_data'
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, waitingDataMessage]);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error loading real health context:', error);
      // Don't show error to user - just continue without health context
      const errorMessage = {
        id: Date.now() + 1000,
        text: "I'm having trouble accessing your health data right now. Please ensure your ET475 device is connected and syncing properly. I can still help with general health questions!",
        isUser: false,
        timestamp: new Date(),
        type: 'context_error'
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, errorMessage]);
      }, 1000);
    }
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || inputText.trim();
    
    if (!textToSend) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: textToSend,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('Sending message to backend with real data context:', textToSend);
      
      // Send to backend chat API
      const response = await api.sendChatMessage(textToSend);
      
      console.log('Chat response received:', response);

      let assistantResponse;
      
      if (response.success && response.assistant_response) {
        // Check if the response indicates real data was used
        const usedRealData = response.health_context_used === true || 
                            response.assistant_response.includes("real data") ||
                            response.assistant_response.includes("Real data") ||
                            response.assistant_response.includes("device data");
        
        assistantResponse = {
          id: Date.now() + 1,
          text: response.assistant_response,
          isUser: false,
          timestamp: new Date(),
          healthContextUsed: response.health_context_used || false,
          usedRealData: usedRealData,
          hasRealDataContext: realDataAvailable
        };
      } else {
        // Fallback response with real data context
        const fallbackText = !hasRealDevice 
          ? "I don't have access to your real health data yet. Please connect your ET475 or compatible smartwatch to get personalized insights based on your actual measurements."
          : !realDataAvailable
          ? "Your device is connected but I need real health measurements to provide personalized assistance. Make sure your ET475 is actively collecting and syncing data."
          : "I'm having trouble processing your request right now. Please check that your real device is connected and try again.";
          
        assistantResponse = {
          id: Date.now() + 1,
          text: fallbackText,
          isUser: false,
          timestamp: new Date(),
          type: 'fallback',
          hasRealDataContext: realDataAvailable
        };
      }

      setMessages(prev => [...prev, assistantResponse]);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message with real data context
      let errorText = "I'm experiencing some technical difficulties. ";
      
      if (!hasRealDevice) {
        errorText += "Also, I notice you don't have a real device connected. Connect your ET475 for personalized health insights.";
      } else if (!realDataAvailable) {
        errorText += "Make sure your ET475 is syncing real health data for better assistance.";
      } else {
        errorText += "Please check your connection and try again.";
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        text: errorText,
        isUser: false,
        timestamp: new Date(),
        type: 'error',
        hasRealDataContext: realDataAvailable
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      
      // Scroll to bottom after response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleQuickAction = (action) => {
    console.log('Quick action pressed:', action.text);
    
    // Check if action requires real data
    if (action.requiresRealData && !realDataAvailable) {
      Alert.alert(
        'Real Device Data Required',
        `To ${action.text.toLowerCase()}, I need real health data from your connected ET475 or compatible smartwatch.\n\nCurrently: ${
          !hasRealDevice 
            ? 'No device connected' 
            : 'Device connected but no real data available'
        }`,
        [
          { text: 'OK' },
          { 
            text: 'Help Connect', 
            onPress: () => sendMessage("Help me connect my ET475 device") 
          }
        ]
      );
      return;
    }
    
    sendMessage(action.text);
  };

  const getRealHealthInsights = async () => {
    if (!realDataAvailable) {
      Alert.alert(
        'Real Data Required',
        'I need real health data from your ET475 device to provide insights. Please ensure your device is connected and syncing data.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsTyping(true);
      
      console.log('Getting real health insights...');
      const insights = await api.getObservations();
      
      const insightsMessage = {
        id: Date.now(),
        text: insights.observations || "No real health insights available right now. Make sure your ET475 is connected and has recent data.",
        isUser: false,
        timestamp: new Date(),
        type: 'real_insights',
        hasRealDataContext: true
      };
      
      setMessages(prev => [...prev, insightsMessage]);
      
    } catch (error) {
      console.error('Error getting real insights:', error);
      
      const errorMessage = {
        id: Date.now(),
        text: "I couldn't access your real health insights right now. Please check that your ET475 device is connected and syncing data.",
        isUser: false,
        timestamp: new Date(),
        type: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getRealHealthRecommendations = async () => {
    if (!realDataAvailable) {
      Alert.alert(
        'Real Data Required',
        'I need real health data from your ET475 device to provide personalized recommendations. Please ensure your device is connected and syncing data.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsTyping(true);
      
      console.log('Getting real health recommendations...');
      const recommendations = await api.getRecommendations();
      
      const recommendationsMessage = {
        id: Date.now(),
        text: recommendations.recommendations || "No personalized recommendations available right now. Connect your ET475 and sync some real health data to get tailored advice.",
        isUser: false,
        timestamp: new Date(),
        type: 'real_recommendations',
        hasRealDataContext: true
      };
      
      setMessages(prev => [...prev, recommendationsMessage]);
      
    } catch (error) {
      console.error('Error getting real recommendations:', error);
      
      const errorMessage = {
        id: Date.now(),
        text: "I couldn't access your personalized recommendations right now. Please ensure your ET475 device is connected and syncing real data.",
        isUser: false,
        timestamp: new Date(),
        type: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.isUser;
    const isError = message.type === 'error';
    const isRealInsights = message.type === 'real_insights';
    const isRealRecommendations = message.type === 'real_recommendations';
    const isWelcome = message.type === 'welcome';
    const hasRealDataContext = message.hasRealDataContext;
    const usedRealData = message.usedRealData;
    
    return (
      <View key={message.id} style={[
        styles.messageBubble,
        isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer
      ]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Icon 
              name={isError ? "warning" : "medical"} 
              size={16} 
              color="#FFFFFF" 
            />
          </View>
        )}
        
        <View style={[
          styles.messageContent,
          isUser ? styles.userMessageContent : styles.assistantMessageContent,
          isError && styles.errorMessageContent,
          isRealInsights && styles.realInsightsMessageContent,
          isRealRecommendations && styles.realRecommendationsMessageContent
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
            isError && styles.errorMessageText
          ]}>
            {message.text}
          </Text>
          
          {/* Real Data Context Indicators */}
          {!isUser && hasRealDataContext && usedRealData && (
            <View style={styles.realDataBadge}>
              <Icon name="checkmark" size={12} color="#FFFFFF" />
              <Text style={styles.realDataBadgeText}>Based on your real ET475 data</Text>
            </View>
          )}
          
          {!isUser && hasRealDevice && !hasRealDataContext && !message.type && (
            <View style={styles.waitingDataBadge}>
              <Icon name="clock" size={12} color="#FFFFFF" />
              <Text style={styles.waitingDataBadgeText}>Waiting for real device data</Text>
            </View>
          )}
          
          {!isUser && !hasRealDevice && !message.type && (
            <View style={styles.noDeviceBadge}>
              <Icon name="bluetooth" size={12} color="#FFFFFF" />
              <Text style={styles.noDeviceBadgeText}>Connect ET475 for personalized insights</Text>
            </View>
          )}
          
          {message.healthContextUsed && (
            <Text style={styles.contextIndicator}>
              ✓ Analyzed using your real device measurements
            </Text>
          )}
          
          <Text style={[
            styles.messageTime,
            isUser ? styles.userMessageTime : styles.assistantMessageTime
          ]}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    if (messages.length > 3) return null; // Only show for new conversations
    
    return (
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.quickActionButton,
                action.requiresRealData && !realDataAvailable && styles.quickActionButtonDisabled
              ]}
              onPress={() => handleQuickAction(action)}
            >
              <Icon 
                name={action.icon} 
                size={20} 
                color={action.requiresRealData && !realDataAvailable ? "#9CA3AF" : "#4F46E5"} 
              />
              <Text style={[
                styles.quickActionText,
                action.requiresRealData && !realDataAvailable && styles.quickActionTextDisabled
              ]}>
                {action.text}
              </Text>
              {action.requiresRealData && !realDataAvailable && (
                <View style={styles.requiresDataIndicator}>
                  <Text style={styles.requiresDataText}>Needs real data</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.specialActionsRow}>
          <TouchableOpacity
            style={[
              styles.specialActionButton,
              !realDataAvailable && styles.specialActionButtonDisabled
            ]}
            onPress={getRealHealthInsights}
            disabled={!realDataAvailable}
          >
            <Icon 
              name="eye" 
              size={16} 
              color={realDataAvailable ? "#10B981" : "#9CA3AF"} 
            />
            <Text style={[
              styles.specialActionText,
              !realDataAvailable && styles.specialActionTextDisabled
            ]}>
              Real Insights
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.specialActionButton,
              !realDataAvailable && styles.specialActionButtonDisabled
            ]}
            onPress={getRealHealthRecommendations}
            disabled={!realDataAvailable}
          >
            <Icon 
              name="bulb" 
              size={16} 
              color={realDataAvailable ? "#F59E0B" : "#9CA3AF"} 
            />
            <Text style={[
              styles.specialActionText,
              !realDataAvailable && styles.specialActionTextDisabled
            ]}>
              Real Tips
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Real Data Status */}
        <View style={styles.dataStatusContainer}>
          <Icon 
            name={hasRealDevice ? (realDataAvailable ? "checkmark-circle" : "time") : "warning"} 
            size={16} 
            color={hasRealDevice ? (realDataAvailable ? "#10B981" : "#F59E0B") : "#EF4444"} 
          />
          <Text style={styles.dataStatusText}>
            {hasRealDevice 
              ? (realDataAvailable 
                  ? "Real ET475 data available" 
                  : "Device connected, waiting for data"
                )
              : "Connect your ET475 for personalized assistance"
            }
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.assistantAvatar}>
          <Icon name="medical" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
          </View>
          <Text style={styles.typingText}>
            {realDataAvailable 
              ? "AI Assistant is analyzing your real data..." 
              : "AI Assistant is typing..."
            }
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <View style={styles.assistantHeaderInfo}>
          <View style={styles.assistantHeaderAvatar}>
            <Icon name="medical" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.assistantName}>Health Assistant</Text>
            <Text style={[
              styles.assistantStatus,
              { color: hasRealDevice ? (realDataAvailable ? '#10B981' : '#F59E0B') : '#EF4444' }
            ]}>
              {hasRealDevice 
                ? (realDataAvailable ? 'Ready with your real data' : 'Waiting for real data') 
                : 'Connect ET475 for personalized insights'
              }
            </Text>
          </View>
        </View>
        
        {/* Real Data Indicator */}
        <View style={styles.headerIndicators}>
          {realDataAvailable && (
            <TouchableOpacity 
              style={styles.realDataIndicator}
              onPress={() => Alert.alert(
                'Real Data Active', 
                'Your ET475 device is connected and providing real health measurements for personalized assistance.'
              )}
            >
              <Icon name="heart" size={16} color="#10B981" />
            </TouchableOpacity>
          )}
          
          {hasRealDevice && !realDataAvailable && (
            <TouchableOpacity 
              style={styles.waitingDataIndicator}
              onPress={() => Alert.alert(
                'Waiting for Data', 
                'Your device is connected but waiting for real health measurements. Make sure your ET475 is actively collecting data.'
              )}
            >
              <Icon name="clock" size={16} color="#F59E0B" />
            </TouchableOpacity>
          )}
          
          {!hasRealDevice && (
            <TouchableOpacity 
              style={styles.noDeviceIndicator}
              onPress={() => Alert.alert(
                'No Device Connected', 
                'Connect your ET475 or compatible smartwatch to get personalized health insights based on real measurements.'
              )}
            >
              <Icon name="bluetooth" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}
          
          {renderTypingIndicator()}
          
          {renderQuickActions()}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder={realDataAvailable 
              ? "Ask about your real health data..." 
              : hasRealDevice 
              ? "Ask me anything (connect ET475 for personalized insights)..." 
              : "Ask me anything (connect ET475 for real data insights)..."
            }
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (!inputText.trim() || isTyping) && styles.sendButtonDisabled
            ]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  chatHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assistantHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assistantHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assistantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  assistantStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerIndicators: {
    flexDirection: 'row',
  },
  realDataIndicator: {
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    marginLeft: 8,
  },
  waitingDataIndicator: {
    padding: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    marginLeft: 8,
  },
  noDeviceIndicator: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    marginLeft: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  assistantBubbleContainer: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageContent: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    position: 'relative',
  },
  userMessageContent: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  assistantMessageContent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  errorMessageContent: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  realInsightsMessageContent: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  realRecommendationsMessageContent: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#1F2937',
  },
  errorMessageText: {
    color: '#DC2626',
  },
  realDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  realDataBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  waitingDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  waitingDataBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  noDeviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  noDeviceBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  contextIndicator: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#E5E7EB',
    textAlign: 'right',
  },
  assistantMessageTime: {
    color: '#9CA3AF',
  },
  typingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  typingDots: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginRight: 4,
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActionsContainer: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 80,
    justifyContent: 'center',
    position: 'relative',
  },
  quickActionButtonDisabled: {
    opacity: 0.5,
  },
  quickActionText: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  quickActionTextDisabled: {
    color: '#9CA3AF',
  },
  requiresDataIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiresDataText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  specialActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  specialActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
  },
  specialActionButtonDisabled: {
    opacity: 0.5,
  },
  specialActionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    color: '#374151',
  },
  specialActionTextDisabled: {
    color: '#9CA3AF',
  },
  dataStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dataStatusText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});