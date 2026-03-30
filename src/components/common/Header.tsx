import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  variant?: 'default' | 'transparent';
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  style,
  titleStyle,
  variant = 'default',
}) => {
  const getBackgroundColor = () => {
    return variant === 'transparent' ? 'transparent' : COLORS.surface;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderBottomWidth: variant === 'transparent' ? 0 : 1,
          borderBottomColor: COLORS.border,
        },
        style,
      ]}
    >
      {/* Left Action */}
      {leftAction && <View style={styles.actionContainer}>{leftAction}</View>}

      {/* Title & Subtitle */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Right Action */}
      {rightAction && <View style={styles.actionContainer}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  actionContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textMuted,
  },
});
