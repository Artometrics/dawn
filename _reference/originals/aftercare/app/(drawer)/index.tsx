import Header from '@/components/Header';
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Icon, { IconName } from '@/components/Icon';
import ThemedText from '@/components/ThemedText';
import DrawerButton from '@/components/DrawerButton';
import { ChatInput } from '@/components/ChatInput';
import { BotSwitch } from '@/components/BotSwitch';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/app/contexts/ThemeColors';
import { useFocusEffect } from 'expo-router';
import { Conversation, Message } from '@/components/Conversation';
import { streamMessage, isConfigured, AIMessage } from '@/services/ai';

const HomeScreen = () => {
    const colors = useThemeColors();
    const scrollViewRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const timer = setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
            }, 100);

            return () => clearTimeout(timer);
        }, [])
    );

    const handleSendMessage = async (text: string, images?: string[]) => {
        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        // Check if AI is configured
        if (!isConfigured()) {
            // Show mock response if no API key
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    content: 'To get real AI responses, add your API key to the .env file. Aftercare supports OpenAI (ChatGPT), Google Gemini, and Anthropic Claude.\n\nCopy .env.example to .env and add your key to get started!',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
            }, 1000);
            return;
        }

        // Show typing indicator
        setIsTyping(true);

        // Create assistant message for streaming
        const assistantId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
            id: assistantId,
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
        };

        // Build conversation history for context
        const aiMessages: AIMessage[] = [
            ...messages.map(m => ({
                role: m.type as 'user' | 'assistant',
                content: m.content,
            })),
            { role: 'user' as const, content: text },
        ];

        try {
            setIsTyping(false);
            setMessages(prev => [...prev, assistantMessage]);

            // Stream the response
            await streamMessage(aiMessages, (chunk) => {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? { ...m, content: m.content + chunk }
                            : m
                    )
                );
            });

            // Mark streaming as complete
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantId
                        ? { ...m, isStreaming: false }
                        : m
                )
            );
        } catch (error) {
            setIsTyping(false);
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                type: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
                timestamp: new Date(),
            };
            setMessages(prev => {
                // Remove the empty streaming message if it exists
                const filtered = prev.filter(m => m.id !== assistantId || m.content !== '');
                return [...filtered, errorMessage];
            });
        }
    };

    const rightComponents = [
        <BotSwitch key="bot-switch" />
    ];

    const leftComponent = [
        <DrawerButton key="drawer-button" />,
    ];

    const hasMessages = messages.length > 0;

    return (
        <View className="flex-1 bg-background relative">
            <LinearGradient style={{ width: '100%', display: 'flex', flex: 1, flexDirection: 'column' }} colors={['transparent', 'transparent', colors.gradient]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <View style={{ flex: 1 }}>
                    <Header
                        title=""
                        variant='transparent'
                        leftComponent={leftComponent}
                        rightComponents={rightComponents} />
                    {hasMessages ? (
                        <Conversation messages={messages} isTyping={isTyping} />
                    ) : (
                        <ScrollView
                            ref={scrollViewRef}
                            className='flex-1 px-8 pt-10'
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 120 }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            overScrollMode='never'
                        >
                            <View className='flex-1 items-center justify-center relative'>
                                <ThemedText className='text-4xl font-outfit-bold'>Welcome John<Text className='text-sky-500'>.</Text></ThemedText>
                                <ThemedText className='text-sm text-gray-500 mt-2'>What can I help you with today?</ThemedText>
                                <View className='flex-row gap-x-2 flex-wrap items-center justify-center mt-8'>
                                    <TipCard title="Make a recipe" icon="Cookie" />
                                    <TipCard title="Generate image" icon="Image" />
                                    <TipCard title="Generate text" icon="Text" />
                                    <TipCard title="Generate code" icon="Code" />
                                </View>
                            </View>
                        </ScrollView>
                    )}
                    <ChatInput onSendMessage={handleSendMessage} />
                </View>
            </LinearGradient>
        </View>
    );
};

const TipCard = ({ title, icon }: { title: string, icon: string }) => {
    return (
        <Pressable className='p-3 mb-2 bg-background border border-border flex flex-row items-center rounded-3xl'>
            <Icon name={icon as IconName} size={15} className=' rounded-xl' />
            <ThemedText className='text-sm font-semibold ml-2 mr-1'>{title}</ThemedText>
        </Pressable>
    );
};

export default HomeScreen;