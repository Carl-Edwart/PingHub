import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/theme';

interface ScoreButtonProps {
  value: number;
  onPress: (value: number) => void;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const ScoreButton: React.FC<ScoreButtonProps> = ({
  value,
  onPress,
  size = 'medium',
  style,
}) => {
  const getSizeStyle = () => {
    const sizes = {
      small: { width: 50, height: 50, fontSize: 18 },
      medium: { width: 70, height: 70, fontSize: 24 },
      large: { width: 90, height: 90, fontSize: 32 },
    };
    return sizes[size];
  };

  const sizeStyle = getSizeStyle();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: sizeStyle.width,
          height: sizeStyle.height,
          borderRadius: sizeStyle.width / 2,
        },
        style,
      ]}
      activeOpacity={0.7}
      onPress={() => onPress(value)}
    >
      <Text
        style={[
          styles.text,
          { fontSize: sizeStyle.fontSize },
        ]}
      >
        +{value}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});
