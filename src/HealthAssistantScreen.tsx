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
      text: "Hello! I'm your AI health assistant. I can help you understand your health data, provide personalized recommendations, and answer questions about your wellness journey. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
      type: 'welcome'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [healthContext, setHealthContext] = useState(null);
  const scrollViewRef = useRef();

  // Quick action buttons for common health questions
  const quickActions = [
    { id: 1, text: "How's my health today?", icon: "heart" },
    { id: 2, text: "Give me health recommendations", icon: "checkmark-circle" },
    { id: 3, text: "What should I focus on?", icon: "target" },
    { id: 4, text: "Explain my chronic conditions", icon: "medical" }
  ];

  useEffect(() => {
    // Load health context when component mounts
    loadHealthContext();
  }, []);

  const loadHealthContext = async () => {
    try {
      console.log('Loading health context for chat...');
      
      // Try to get current health data for context
      const healthData = await api.getHealthData('day');
      
      if (healthData) {
        setHealthContext(healthData);
        console.log('Health context loaded:', Object.keys(healthData));
        
        // Check if user has meaningful health data
        const hasHealthData = Object.values(healthData).some(metric => 
          metric && typeof metric === 'object' && metric.current_value > 0
        );
        
        if (hasHealthData) {
          // Add a context message about available health data
          const contextMessage = {
            id: Date.now() + 1000,
            text: "I can see your recent health data from your connected device. Feel free to ask me about your metrics, trends, or what they mean for your health!",
            isUser: false,
            timestamp: new Date(),
            type: 'context'
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, contextMessage]);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error loading health context:', error);
      // Don't show error to user - just continue without health context
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
      console.log('Sending message to backend:', textToSend);
      
      // Send to backend chat API
      const response = await api.sendChatMessage(textToSend);
      
      console.log('Chat response received:', response);

      let assistantResponse;
      
      if (response.success && response.assistant_response) {
        assistantResponse = {
          id: Date.now() + 1,
          text: response.assistant_response,
          isUser: false,
          timestamp: new Date(),
          healthContextUsed: response.health_context_used || false
        };
      } else {
        // Fallback response
        assistantResponse = {
          id: Date.now() + 1,
          text: response.message || "I'm having trouble processing your request right now. Please try again in a moment.",
          isUser: false,
          timestamp: new Date(),
          type: 'error'
        };
      }

      setMessages(prev => [...prev, assistantResponse]);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm experiencing some technical difficulties connecting to the server. Please check your connection and try again.",
        isUser: false,
        timestamp: new Date(),
        type: 'error'
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
    sendMessage(action.text);
  };

  const getHealthInsights = async () => {
    try {
      setIsTyping(true);
      
      console.log('Getting health insights...');
      const insights = await api.getObservations();
      
      const insightsMessage = {
        id: Date.now(),
        text: insights.observations || "No health insights available right now. Make sure your device is connected and has recent data.",
        isUser: false,
        timestamp: new Date(),
        type: 'insights'
      };
      
      setMessages(prev => [...prev, insightsMessage]);
      
    } catch (error) {
      console.error('Error getting insights:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const getHealthRecommendations = async () => {
    try {
      setIsTyping(true);
      
      console.log('Getting health recommendations...');
      const recommendations = await api.getRecommendations();
      
      const recommendationsMessage = {
        id: Date.now(),
        text: recommendations.recommendations || "No recommendations available right now. Connect your device and sync some health data to get personalized advice.",
        isUser: false,
        timestamp: new Date(),
        type: 'recommendations'
      };
      
      setMessages(prev => [...prev, recommendationsMessage]);
      
    } catch (error) {
      console.error('Error getting recommendations:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.isUser;
    const isError = message.type === 'error';
    const isInsights = message.type === 'insights';
    const isRecommendations = message.type === 'recommendations';
    const isWelcome = message.type === 'welcome';
    
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
          isInsights && styles.insightsMessageContent,
          isRecommendations && styles.recommendationsMessageContent
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
            isError && styles.errorMessageText
          ]}>
            {message.text}
          </Text>
          
          {message.healthContextUsed && (
            <Text style={styles.contextIndicator}>
              ✓ Based on your real-time health data
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
    if (messages.length > 2) return null; // Only show for new conversations
    
    return (
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(action)}
            >
              <Icon name={action.icon} size={20} color="#4F46E5" />
              <Text style={styles.quickActionText}>{action.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.specialActionsRow}>
          <TouchableOpacity
            style={styles.specialActionButton}
            onPress={getHealthInsights}
          >
            <Icon name="eye" size={16} color="#10B981" />
            <Text style={styles.specialActionText}>Get Insights</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.specialActionButton}
            onPress={getHealthRecommendations}
          >
            <Icon name="bulb" size={16} color="#F59E0B" />
            <Text style={styles.specialActionText}>Get Tips</Text>
          </TouchableOpacity>
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
          <Text style={styles.typingText}>AI Assistant is typing...</Text>
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
            <Text style={styles.assistantStatus}>
              {healthContext ? 'Ready with your health data' : 'Online'}
            </Text>
          </View>
        </View>
        
        {healthContext && (
          <TouchableOpacity 
            style={styles.healthDataIndicator}
            onPress={() => Alert.alert('Health Data', 'Your recent health data is available for personalized assistance')}
          >
            <Icon name="heart" size={16} color="#10B981" />
          </TouchableOpacity>
        )}
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
            placeholder="Ask about your health..."
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
    color: '#10B981',
  },
  healthDataIndicator: {
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
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
  insightsMessageContent: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  recommendationsMessageContent: {
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionText: {
    fontSize: 14,
    color: '#4F46E5',
    marginLeft: 8,
    flex: 1,
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
  specialActionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    color: '#374151',
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