import React, { useCallback, useEffect } from 'react';
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ThemedText from '../ThemedText';
import useThemeColors from '@/app/contexts/ThemeColors';

type SliderSize = 's' | 'm' | 'l';

interface SliderProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  value?: number;
  initialValue?: number;
  onValueChange?: (value: number) => void;
  label?: string;
  maxValue?: number;
  minValue?: number;
  step?: number;
  size?: SliderSize;
}

const sizeStyles = {
  s: { containerHeight: 20, labelText: 'text-xs', valueText: 'text-xs', trackHeight: 4, thumbSize: 16 },
  m: { containerHeight: 30, labelText: 'text-sm', valueText: 'text-sm', trackHeight: 6, thumbSize: 20 },
  l: { containerHeight: 40, labelText: 'text-base', valueText: 'text-base', trackHeight: 8, thumbSize: 24 },
};

const Slider = ({
  className = '',
  style,
  value,
  initialValue,
  onValueChange,
  label,
  maxValue = 100,
  minValue = 0,
  step = 1,
  size = 'm',
}: SliderProps) => {
  const colors = useThemeColors();
  const currentSize = sizeStyles[size];

  const effectiveInitialValue = initialValue !== undefined ? initialValue : 0;
  const effectiveValue = value !== undefined ? value : effectiveInitialValue;

  const containerWidth = useSharedValue(0);
  const percentage = useSharedValue(
    maxValue === minValue ? 0 : Math.max(0, Math.min(1, (effectiveValue - minValue) / (maxValue - minValue)))
  );
  const startPercentage = useSharedValue(0);

  const displayValue = useDerivedValue(() => minValue + percentage.value * (maxValue - minValue));

  useEffect(() => {
    if (value === undefined || maxValue === minValue) return;
    const newPercentage = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
    percentage.value = withTiming(newPercentage, { duration: 100 });
  }, [value, minValue, maxValue, percentage]);

  const thumbPosition = useDerivedValue(() => {
    const thumbRadius = currentSize.thumbSize / 2;
    return percentage.value * (containerWidth.value - currentSize.thumbSize) + thumbRadius;
  });

  const trackWidth = useDerivedValue(() =>
    percentage.value * (containerWidth.value - currentSize.thumbSize) + currentSize.thumbSize / 2
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startPercentage.value = percentage.value;
    })
    .onUpdate((event) => {
      const usableWidth = containerWidth.value - currentSize.thumbSize;
      if (usableWidth <= 0) return;

      let newPercentage = startPercentage.value + event.translationX / usableWidth;
      newPercentage = Math.min(Math.max(newPercentage, 0), 1);

      const rawValue = minValue + newPercentage * (maxValue - minValue);
      let steppedValue: number;

      if (step > 0) {
        steppedValue = Math.round((rawValue - minValue) / step) * step + minValue;
        steppedValue = Math.min(Math.max(steppedValue, minValue), maxValue);
        newPercentage = (steppedValue - minValue) / (maxValue - minValue);
      } else {
        steppedValue = rawValue;
      }

      percentage.value = newPercentage;
      if (onValueChange) runOnJS(onValueChange)(steppedValue);
    });

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const usableWidth = containerWidth.value - currentSize.thumbSize;
      if (usableWidth <= 0) return;

      let newPercentage = Math.max(0, Math.min(1, (event.x - currentSize.thumbSize / 2) / usableWidth));

      const rawValue = minValue + newPercentage * (maxValue - minValue);
      let steppedValue: number;

      if (step > 0) {
        steppedValue = Math.round((rawValue - minValue) / step) * step + minValue;
        steppedValue = Math.min(Math.max(steppedValue, minValue), maxValue);
        newPercentage = (steppedValue - minValue) / (maxValue - minValue);
      } else {
        steppedValue = rawValue;
      }

      percentage.value = withTiming(newPercentage, { duration: 150 });
      if (onValueChange) runOnJS(onValueChange)(steppedValue);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbPosition.value - currentSize.thumbSize / 2 }],
  }));

  const activeTrackStyle = useAnimatedStyle(() => ({ width: trackWidth.value }));

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width <= 0) return;
    containerWidth.value = width;
    if (maxValue !== minValue) {
      const valueToUse = value !== undefined ? value : (initialValue !== undefined ? initialValue : 0);
      percentage.value = Math.max(0, Math.min(1, (valueToUse - minValue) / (maxValue - minValue)));
    }
  }, [containerWidth, value, initialValue, minValue, maxValue]);

  const formatValue = useDerivedValue(() => {
    const decimalPoints = step >= 1 ? 0 : String(step).split('.')[1]?.length || 0;
    return displayValue.value.toFixed(decimalPoints);
  });

  return (
    <View className={`w-full ${className}`} style={style}>
      {label && (
        <View className="flex-row justify-between mb-2">
          <ThemedText className={currentSize.labelText}>{label}</ThemedText>
          <Animated.Text className={`text-text opacity-60 ${currentSize.valueText}`}>
            {formatValue.value}
          </Animated.Text>
        </View>
      )}

      <GestureDetector gesture={tapGesture}>
        <View style={{ height: currentSize.containerHeight }} className="justify-center" onLayout={onLayout}>
          <Animated.View className="w-full h-full justify-center">
            <View
              style={{
                position: 'absolute',
                height: currentSize.trackHeight,
                backgroundColor: colors.secondary,
                borderRadius: currentSize.trackHeight / 2,
                width: '100%',
              }}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  height: currentSize.trackHeight,
                  backgroundColor: colors.highlight,
                  borderRadius: currentSize.trackHeight / 2,
                },
                activeTrackStyle,
              ]}
            />
            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: currentSize.thumbSize,
                    height: currentSize.thumbSize,
                    borderRadius: currentSize.thumbSize / 2,
                    backgroundColor: colors.highlight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    zIndex: 10,
                  },
                  thumbStyle,
                ]}
              />
            </GestureDetector>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

export default Slider;
