import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Button } from '@/components/common/Button';

interface CronometroProps {
  onTimeEnd?: () => void;
  duration?: number;
  style?: ViewStyle;
}

export const Cronometro: React.FC<CronometroProps> = ({
  onTimeEnd,
  duration = 3600,
  style,
}) => {
  const [time, setTime] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onTimeEnd?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, time, onTimeEnd]);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLowTime = time <= 10;

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[styles.time, { color: isLowTime ? COLORS.danger : COLORS.accent }]}
      >
        {formattedTime}
      </Text>

      <View style={styles.buttons}>
        <Button
          size="small"
          variant={isRunning ? 'danger' : 'primary'}
          onPress={() => setIsRunning(!isRunning)}
        >
          {isRunning ? 'Pausar' : 'Iniciar'}
        </Button>
        <Button
          size="small"
          variant="secondary"
          onPress={() => {
            setIsRunning(false);
            setTime(duration);
          }}
        >
          Reset
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  time: {
    fontSize: TYPOGRAPHY.display.fontSize,
    fontWeight: '700',
    lineHeight: TYPOGRAPHY.display.lineHeight,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
