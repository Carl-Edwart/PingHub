import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  size = 'medium',
  ...textInputProps
}) => {
  const [focused, setFocused] = useState(false);

  const getSizeStyle = () => {
    const sizes = {
      small: {
        height: 36,
        paddingHorizontal: 12,
        fontSize: 13,
      },
      medium: {
        height: 48,
        paddingHorizontal: 16,
        fontSize: 15,
      },
      large: {
        height: 56,
        paddingHorizontal: 16,
        fontSize: 16,
      },
    };

    return sizes[size];
  };

  const sizeStyle = getSizeStyle();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        {...textInputProps}
        style={[
          styles.input,
          {
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            fontSize: sizeStyle.fontSize,
            borderColor: focused ? COLORS.accent : error ? COLORS.danger : COLORS.border,
            borderWidth: 1,
          },
        ]}
        placeholderTextColor={COLORS.textMuted}
        onFocus={(e) => {
          setFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          textInputProps.onBlur?.(e);
        }}
      />

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  input: {
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    fontWeight: '400',
  },
  error: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
});
