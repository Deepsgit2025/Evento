import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Keyboard, Modal, SafeAreaView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer, Typography, TextInput, EmptyState, Button } from '../../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { AuthService } from '../../../services/auth';
import { getUserWedding } from '../../../services/wedding';
import { AIService, AIMessage } from '../../../services/ai';
import { useLanguage } from '../../../i18n';

const QUICK_ACTIONS = [
  { icon: 'people' as const, label: 'Guest Summary', query: 'How many guests total?' },
  { icon: 'wallet' as const, label: 'Finance', query: 'Total expense kitna hua?' },
  { icon: 'calendar' as const, label: 'Events', query: 'Upcoming events kya hain?' },
  { icon: 'briefcase' as const, label: 'Vendors', query: 'Pending payments kitne hain?' },
];

const SUGGESTED_QUESTIONS = [
  "Kitne guests hain?",
  "Rohan ka room konsa hai?",
  "Room 204 mein kaun hai?",
  "Mehndi mein kaun aa raha hai?",
  "Photographer ka payment kitna hua?",
  "Total expense kitna hua?",
  "Budget kitna bacha hai?",
  "Wedding ka full summary do",
  "Kitne guests ko room nahi mila?",
  "Bride side ke kitne log hain?",
];

export default function AssistantScreen() {
  const db = useSQLiteContext();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  
  const [weddingId, setWeddingId] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      const checkSetup = async () => {
        try {
          const session = await AuthService.getCurrentSession(db);
          if (!session) return;
          const wedding = await getUserWedding(db, session.id);
          if (!wedding) return;
          
          setWeddingId(wedding.id);
          const hist = await AIService.getChatHistory(db, wedding.id);
          setMessages(hist);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) {
          console.error(e instanceof Error ? e.message : String(e));
        } finally {
          setIsInitializing(false);
        }
      };
      checkSetup();
    }, [db])
  );

  const handleSend = async (text?: string) => {
    const userMsg = (text || inputText).trim();
    if (!userMsg || isLoading) return;
    
    setInputText('');
    setIsComposerExpanded(false);
    Keyboard.dismiss();
    
    const tempUserMessage: AIMessage = {
      id: 'temp-' + Date.now(),
      wedding_id: weddingId,
      role: 'user',
      content: userMsg,
      created_at: Date.now() / 1000
    };
    
    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      await AIService.sendMessage(db, weddingId, userMsg, language);
      const hist = await AIService.getChatHistory(db, weddingId);
      setMessages(hist);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        wedding_id: weddingId,
        role: 'model',
        content: t('error.generic'),
        created_at: Date.now() / 1000
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };
  
  const clearChat = async () => {
    await AIService.clearChatHistory(db, weddingId);
    setMessages([]);
  };

  const s = getDynamicStyles(theme);

  if (isInitializing) {
    return (
      <ScreenContainer style={s.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top']}>
      <View style={s.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={s.aiAvatar}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View style={{marginLeft: 12}}>
            <Typography variant="sectionTitle">{t('assistant.title')}</Typography>
            <Typography variant="caption" color={theme.colors.textSecondary}>{t('assistant.subtitle')}</Typography>
          </View>
        </View>
        
        {messages.length > 0 && (
          <Pressable onPress={clearChat} style={s.clearBtn}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView 
        style={s.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={s.chatScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={{flex: 1, justifyContent: 'center'}}>
              <EmptyState
                icon={<Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textMuted} />}
                title={t('assistant.empty')}
                description={t('assistant.emptyDesc')}
              />
              
              {/* Quick Action Buttons */}
              <View style={s.quickActionsRow}>
                {QUICK_ACTIONS.map((action, i) => (
                  <Pressable 
                    key={i} 
                    style={({ pressed }) => [s.quickActionBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleSend(action.query)}
                  >
                    <View style={s.quickActionIcon}>
                      <Ionicons name={action.icon} size={20} color={theme.colors.primary} />
                    </View>
                    <Typography variant="caption" weight="medium" color={theme.colors.text} style={{ textAlign: 'center' }}>
                      {action.label}
                    </Typography>
                  </Pressable>
                ))}
              </View>

              {/* Suggested Questions */}
              <View style={s.suggestedContainer}>
                <Typography variant="caption" weight="semibold" color={theme.colors.textSecondary} style={{marginBottom: 12}}>
                  {t('assistant.suggested')}
                </Typography>
                <View style={s.chipsRow}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <Pressable key={i} style={s.chip} onPress={() => handleSend(q)}>
                      <Typography variant="caption" color={theme.colors.primary}>{q}</Typography>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            messages.map((msg) => (
              <View 
                key={msg.id} 
                style={[s.messageRow, msg.role === 'user' ? s.messageRowUser : s.messageRowAI]}
              >
                {msg.role === 'model' && (
                  <View style={s.aiAvatarSmall}>
                    <Ionicons name="sparkles" size={12} color="#fff" />
                  </View>
                )}
                <View style={[s.messageBubble, msg.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                  <Typography variant="body" color={msg.role === 'user' ? '#fff' : theme.colors.text}>
                    {msg.content}
                  </Typography>
                </View>
              </View>
            ))
          )}
          
          {isLoading && (
            <View style={[s.messageRow, s.messageRowAI]}>
              <View style={s.aiAvatarSmall}>
                <Ionicons name="sparkles" size={12} color="#fff" />
              </View>
              <View style={[s.messageBubble, s.bubbleAI, s.typingBubble]}>
                <View style={s.typingDots}>
                  <View style={[s.dot, { backgroundColor: theme.colors.primary }]} />
                  <View style={[s.dot, { backgroundColor: theme.colors.primary, opacity: 0.6 }]} />
                  <View style={[s.dot, { backgroundColor: theme.colors.primary, opacity: 0.3 }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.inputArea}>
          <Pressable style={s.expandButton} onPress={() => setIsComposerExpanded(true)}>
            <Ionicons name="expand-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
          <TextInput
            bare
            containerStyle={s.textInputContainer}
            placeholder={t('assistant.placeholder')}
            value={inputText}
            onChangeText={setInputText}
            style={s.textInput}
            multiline
            textAlignVertical="top"
            submitBehavior="blurAndSubmit"
          />
          <Pressable
            style={[s.sendButton, !inputText.trim() && s.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isComposerExpanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsComposerExpanded(false)}
      >
        <SafeAreaView style={[s.expandedContainer, { backgroundColor: theme.colors.background }]}>
          <View style={s.expandedHeader}>
            <Typography variant="sectionTitle">{t('assistant.title')}</Typography>
            <Pressable onPress={() => setIsComposerExpanded(false)} style={s.expandedCloseBtn}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <TextInput
            bare
            containerStyle={s.expandedInputContainer}
            style={s.expandedTextInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('assistant.placeholder')}
            multiline
            autoFocus
            textAlignVertical="top"
          />
          <View style={s.expandedFooter}>
            <Button
              label="Send"
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </ScreenContainer>
  );
}

const getDynamicStyles = (theme: any) => StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface,
  },
  aiAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  aiAvatarSmall: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
    marginRight: 8, alignSelf: 'flex-end', marginBottom: 4,
  },
  clearBtn: { padding: 8 },
  container: { flex: 1, backgroundColor: theme.colors.background },
  chatScroll: { padding: theme.spacing.lg, paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.md, flexGrow: 1 },
  
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  quickActionBtn: {
    alignItems: 'center', gap: 6, width: 72,
  },
  quickActionIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },

  // Suggested
  suggestedContainer: { marginTop: theme.spacing.xxl },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: theme.colors.primary + '10', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: theme.radii.full, borderWidth: 1, borderColor: theme.colors.primary + '30',
  },
  
  // Messages
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start', paddingRight: 40 },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, maxWidth: '85%' },
  bubbleUser: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  typingBubble: { paddingHorizontal: 20, paddingVertical: 16 },
  typingDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Input
  inputArea: {
    flexDirection: 'row', padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface, borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight, alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.lg,
  },
  expandButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, alignSelf: 'flex-end', marginBottom: 4,
  },
  textInputContainer: {
    flex: 1,
    marginRight: 12,
    marginBottom: 0,
  },
  textInput: {
    maxHeight: 150,
    minHeight: 48,
    borderRadius: 24,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 20,
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: theme.colors.background,
  },
  sendButton: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.sm,
  },
  sendButtonDisabled: { backgroundColor: theme.colors.border },

  // Expanded full-screen composer
  expandedContainer: { flex: 1 },
  expandedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  expandedCloseBtn: { padding: 8 },
  expandedInputContainer: { flex: 1, marginHorizontal: theme.spacing.lg, marginBottom: 0 },
  expandedTextInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    padding: theme.spacing.md,
  },
  expandedFooter: {
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.lg,
  },
});
