import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Stack, Link, router } from 'expo-router';
import Input from '@/components/forms/Input';
import ThemedText from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeColors from '@/app/contexts/ThemeColors';
import Icon from '@/components/Icon';

export default function LoginScreen() {
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (isEmailValid && isPasswordValid) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
        // Navigate to home screen after successful login
        router.replace('/(drawer)/(tabs)/');
      }, 1500);
    }
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
    // Implement social login logic here
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{paddingTop: insets.top }} className="flex-1 bg-background pt-20  p-10">
     
      
      <View className="mt-8">
        <Icon name="Heart" size={36} color={colors.highlight} className="mb-4" />
        <ThemedText className="text-4xl font-outfit-bold mb-14">Aftercare.</ThemedText>
        <ThemedText className="text-3xl font-bold mb-1">Welcome back</ThemedText>
        <ThemedText className="text-subtext mb-14">Sign in to your account</ThemedText>
        
        <Input
          label="Email"
          variant="classic"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) validateEmail(text);
          }}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        
        <Input
          label="Password"
          variant="classic"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError) validatePassword(text);
          }}
          error={passwordError}
          isPassword={true}
          autoCapitalize="none"
        />
        
        <Link href="/screens/forgot-password">
            <ThemedText className='underline text-primary text-sm mb-4'>
                Forgot Password?
            </ThemedText>
        </Link>
       
        
        <Button 
          title="Login" 
          onPress={handleLogin} 
          loading={isLoading}
          size="large"
          className="mb-6"
          rounded="full"
        />
        
        <View className="flex-row justify-center">
          <ThemedText className="text-subtext">Don't have an account? </ThemedText>
          <Link href="/screens/signup" asChild>
            <Pressable>
              <ThemedText className="underline">Sign up</ThemedText>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  googleIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#4285F4',
    borderRadius: 2,
  },
});