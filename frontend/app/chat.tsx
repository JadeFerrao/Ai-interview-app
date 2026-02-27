import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { startInterview, sendAnswer } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const { role, completed } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(completed === 'true');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
  }, []);

  const initChat = async () => {
    setLoading(true);
    try {
      const data = await startInterview(role, "temp-user-id");
      setInterviewId(data.interviewId);
      setQuestionNumber(data.questionNumber || 1);
      setMessages([{ id: '1', role: 'assistant', content: data.question }]);
    } catch (error) {
      console.error('Init chat error:', error);
      // Fallback message if initialization fails
      setMessages([{ 
        id: '1', 
        role: 'assistant', 
        content: `Welcome! Let's start your ${role} interview. Tell me about yourself.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await sendAnswer(interviewId, inputText, messages);
      
      if (response.isComplete) {
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.nextMessage };
        setMessages(prev => [...prev, aiMsg]);
        setIsInterviewComplete(true);
        
        setTimeout(() => {
          router.push({ pathname: '/results', params: { interviewId } });
        }, 2000);
      } else {
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.nextMessage };
        setMessages(prev => [...prev, aiMsg]);
        setQuestionNumber(response.questionNumber || questionNumber + 1);
      }
    } catch (error) {
      console.error('Send answer error:', error);
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "I'm having trouble connecting right now, but let's continue. What else would you like to share?" 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Question {questionNumber} of 7</Text>
        <Text style={styles.headerSubtext}>Take your time and be yourself</Text>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={item.role === 'user' ? styles.userText : styles.aiText}>{item.content}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      {isProcessing && (
        <View style={styles.processingIndicator}>
          <ActivityIndicator size="small" color="#667eea" />
          <Text style={styles.processingText}>Thinking...</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput 
          style={[styles.input, isInterviewComplete && styles.inputDisabled]} 
          value={inputText} 
          onChangeText={setInputText} 
          placeholder={isInterviewComplete ? "Interview completed" : "Type your answer..."}
          placeholderTextColor="#a0aec0"
          editable={!isProcessing && !isInterviewComplete}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (isProcessing || !inputText.trim() || isInterviewComplete) && styles.sendBtnDisabled]} 
          onPress={handleSend} 
          disabled={isProcessing || !inputText.trim() || isInterviewComplete}
          activeOpacity={0.7}
        >
          <Text style={styles.sendBtnText}>
            {isProcessing ? '...' : '→'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f7fafc' 
  },
  header: { 
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#667eea',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerText: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  bubble: { 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userBubble: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  aiBubble: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userText: { 
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },
  aiText: { 
    color: '#2d3748',
    fontSize: 16,
    lineHeight: 22,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f7fafc',
  },
  processingText: {
    marginLeft: 10,
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 15, 
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  input: { 
    flex: 1, 
    borderWidth: 2, 
    borderColor: '#e2e8f0', 
    borderRadius: 25, 
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f7fafc',
    maxHeight: 100,
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#a0aec0',
  },
  sendBtn: { 
    marginLeft: 12, 
    backgroundColor: '#667eea', 
    width: 50,
    height: 50,
    borderRadius: 25, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e0',
    shadowOpacity: 0,
  },
  sendBtnText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});