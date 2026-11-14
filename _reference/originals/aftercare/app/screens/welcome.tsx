import { View, Text, FlatList, Dimensions, Image, Pressable } from 'react-native';
import { useState, useRef } from 'react';
import ThemedText from '@/components/ThemedText';
import { StatusBar } from 'expo-status-bar';
import ThemeToggle from '@/components/ThemeToggle';
import { AntDesign } from '@expo/vector-icons';
import useThemeColors from '../contexts/ThemeColors';
import { router } from 'expo-router';
import React from 'react';
import Icon from '@/components/Icon';
import LottieView from 'lottie-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
const { width } = Dimensions.get('window');
const windowWidth = Dimensions.get('window').width;

const slides = [
    {
        id: '1',
        title: 'Aftercare',
        image: require('@/assets/lottie/sphere.json'),
        description: 'Astrology, tarot, and journaling — soft guidance for your inner life.',
    },
    {
        id: '2',
        title: 'Daily ritual',
        image: require('@/assets/lottie/waves.json'),
        description: 'Check in with the stars, pull a card, and write what you feel.',
    },
    {
        id: '3',
        title: 'Gentle reflection',
        image: require('@/assets/lottie/waves.json'),
        description: 'A calm space to listen inward and grow at your own pace.',
    },
];

export default function OnboardingScreen() {
    const colors = useThemeColors();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const insets = useSafeAreaInsets();
    const handleScroll = (event: { nativeEvent: { contentOffset: { x: number; }; }; }) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    };

    return (
        <SafeAreaView className='flex-1 bg-background' style={{ paddingTop: insets.top }}>

            <View className="flex-1 relative bg-background">
                <View className='w-full items-end justify-end pr-6 pt-6'>
                    <ThemeToggle />
                </View>
                <FlatList
                    ref={flatListRef}
                    data={slides}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    snapToInterval={windowWidth} // 👈 Ensures snapping works perfectly
                    renderItem={({ item }) => (
                        <View style={{ width: windowWidth }} className="items-center justify-center p-6">
                            <LottieView source={item.image} autoPlay loop style={{ width: windowWidth, height: 300 }} />
                            <ThemedText className="text-2xl mt-4 font-outfit-bold">{item.title}</ThemedText>
                            <Text className="text-center text-subtext mt-2">{item.description}</Text>
                        </View>
                    )}
                    ListFooterComponent={() => (
                        <View className='w-full h-28' />
                    )}
                    keyExtractor={(item) => item.id}
                />

                <View className="flex-row justify-center mb-20  w-full">
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            className={`h-2 mx-1 rounded-full ${index === currentIndex ? 'bg-highlight w-2' : 'bg-secondary w-2'}`}
                        />
                    ))}
                </View>


                {/* Login/Signup Buttons */}
                <View className="w-full px-6 mb-global flex flex-col space-y-2">

                    <View className='flex flex-row flex-wrap items-center justify-center gap-2'>
                        <View className='w-full flex-row gap-2 mb-4'>
                            <Pressable onPress={() => router.push('/(drawer)/')} className='flex-1 border border-border rounded-full flex flex-row items-center justify-center py-4'>
                                <AntDesign name="google" size={22} color={colors.text} />
                                <ThemedText className='text-sm ml-2'>Google</ThemedText>
                            </Pressable>
                            <Pressable onPress={() => router.push('/(drawer)/')} className='flex-1 border border-border rounded-full flex flex-row items-center justify-center py-4'>
                                <AntDesign name="apple" size={22} color={colors.text} />
                                <ThemedText className='text-sm ml-2'>Apple</ThemedText>
                            </Pressable>

                        </View>
                        <Pressable onPress={() => router.push('/screens/signup')} className='flex-1 w-1/4 bg-text rounded-full flex flex-row items-center justify-center py-4'>

                            <Icon name="Mail" size={20} color={colors.invert} />
                            <ThemedText className='text-sm !text-invert ml-2'>Email</ThemedText>
                        </Pressable>

                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
