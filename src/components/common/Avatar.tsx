import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  TextStyle,
} from 'react-native';
import { COLORS, BORDER_RADIUS } from '@/constants/theme';

interface AvatarProps {
  name?: string;
  source?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  source,
  size = 'medium',
  style,
}) => {
  const getSizeStyle = (): { container: ViewStyle; image: ImageStyle; text: TextStyle } => {
    const sizes = {
      small: {
        container: { width: 32, height: 32 },
        image: { width: 32, height: 32 },
        text: { fontSize: 12 },
      },
      medium: {
        container: { width: 48, height: 48 },
        image: { width: 48, height: 48 },
        text: { fontSize: 16 },
      },
      large: {
        container: { width: 64, height: 64 },
        image: { width: 64, height: 64 },
        text: { fontSize: 18 },
      },
    };

    return sizes[size];
  };

  const getInitials = (fullName?: string): string => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const sizeStyle = getSizeStyle();

  return (
    <View
      style={[
        styles.container,
        sizeStyle.container,
        {
          borderRadius: (sizeStyle.container.width as number) / 2,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[
            sizeStyle.image,
            {
              borderRadius: (sizeStyle.container.width as number) / 2,
            },
          ]}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            sizeStyle.text,
            { color: COLORS.surface, fontWeight: '600' },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '600',
  },
});

