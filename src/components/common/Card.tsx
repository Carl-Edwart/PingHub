import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, StyleProp } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
}) => {
  const getCardStyle = (): ViewStyle => {
    const variants: Record<string, ViewStyle> = {
      default: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
      },
      elevated: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.accent,
      },
    };

    return {
      ...variants[variant],
      padding: SPACING.md,
    };
  };

  if (onPress) {
    return (
      <Pressable
        style={[getCardStyle(), style]}
        onPress={onPress}
        android_ripple={{ color: COLORS.border }}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({});

