import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { Card, EmptyState } from '@/components';

type Props = NativeStackScreenProps<any, 'MesaFila'>;

export default function MesaFilaScreen() {
  const filaVazia = true; // Placeholder

  if (filaVazia) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Nenhuma fila de espera"
          description="Não há jogadores esperando por uma mesa"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={({ item }) => (
          <Card style={styles.filaItem}>
            <Text style={styles.playerName}>{item}</Text>
          </Card>
        )}
        keyExtractor={(item, index) => index.toString()}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  filaItem: {
    marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  playerName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
});

