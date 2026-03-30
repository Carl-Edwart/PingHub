import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onPress,
  children,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.sm,
    };

    const sizes: Record<string, ViewStyle> = {
      small: { height: 40, paddingHorizontal: SPACING.md },
      medium: { height: 52, paddingHorizontal: SPACING.lg },
      large: { height: 60, paddingHorizontal: SPACING.xl },
    };

    const variants: Record<string, ViewStyle> = {
      primary: { backgroundColor: COLORS.accent },
      secondary: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
      danger: { backgroundColor: COLORS.danger },
      ghost: { backgroundColor: 'transparent' },
    };

    return {
      ...baseStyle,
      ...sizes[size],
      ...variants[variant],
      opacity: disabled || loading ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const variants: Record<string, TextStyle> = {
      primary: { color: COLORS.primary, fontWeight: '600' },
      secondary: { color: COLORS.primary, fontWeight: '600' },
      danger: { color: COLORS.surface, fontWeight: '600' },
      ghost: { color: COLORS.primary, fontWeight: '600' },
    };

    const sizes: Record<string, TextStyle> = {
      small: { fontSize: 13 },
      medium: { fontSize: 15 },
      large: { fontSize: 17 },
    };

    return {
      ...variants[variant],
      ...sizes[size],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {loading && <ActivityIndicator color={COLORS.primary} size="small" />}
      <Text style={[getTextStyle(), textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({});

