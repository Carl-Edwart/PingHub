import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'danger' | 'accent' | 'muted';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  style,
}) => {
  const getVariantStyle = (): ViewStyle => {
    const variants: Record<string, ViewStyle> = {
      default: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
      },
      success: {
        backgroundColor: COLORS.success,
      },
      danger: {
        backgroundColor: COLORS.danger,
      },
      accent: {
        backgroundColor: COLORS.accent,
      },
      muted: {
        backgroundColor: COLORS.accentMuted,
      },
    };

    return variants[variant];
  };

  const getSizeStyle = (): ViewStyle & TextStyle => {
    const sizes: Record<string, ViewStyle & TextStyle> = {
      small: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        fontSize: 11,
      },
      medium: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        fontSize: 12,
      },
    };

    return sizes[size];
  };

  const getTextColor = (): string => {
    const colors: Record<string, string> = {
      default: COLORS.text,
      success: COLORS.surface,
      danger: COLORS.surface,
      accent: COLORS.primary,
      muted: COLORS.text,
    };

    return colors[variant];
  };

  return (
    <View
      style={[
        styles.badge,
        getVariantStyle(),
        getSizeStyle() as ViewStyle,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: getTextColor(),
            fontSize: (getSizeStyle() as TextStyle).fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
  },
});

