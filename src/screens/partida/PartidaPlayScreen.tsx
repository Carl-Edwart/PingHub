import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button, Card } from '@/components';
import { ScoreBoard, ScoreButton, SetCounter } from '@/components/partida';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { usePartidaStore } from '@/store/usePartidaStore';

type Props = NativeStackScreenProps<any, 'PartidaPlay'>;

export default function PartidaPlayScreen({ navigation }: Props) {
  const {
    currentMatch,
    player1Score,
    player2Score,
    currentSet,
    setsWon,
    config,
    addPoint,
    undo,
    finishSet,
    finishMatch,
    isMatchOver,
    getWinner,
  } = usePartidaStore();
  const [startTime] = useState(Date.now());

  useFocusEffect(
    useCallback(() => {
      // Keep screen awake during match
      return () => {};
    }, [])
  );

  if (!currentMatch || !config) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erro ao carregar partida</Text>
      </View>
    );
  }

  const handleFinishSet = () => {
    finishSet();
    const isOver = isMatchOver();

    if (isOver) {
      const winner = getWinner();
      Alert.alert(
        '🏆 Partida Finalizada',
        `${winner === 1 ? currentMatch.player1?.name : currentMatch.player2?.name} venceu!`,
        [
          {
            text: 'Ver Resultado',
            onPress: () => navigation.navigate('PartidaResultado'),
          },
        ]
      );
    }
  };

  const handleUndo = () => {
    if (player1Score === 0 && player2Score === 0) {
      Alert.alert('Aviso', 'Nenhum ponto para desfazer');
      return;
    }
    undo();
  };

  const canFinishSet =
    (player1Score >= (config.pointsPerSet || 11) ||
      player2Score >= (config.pointsPerSet || 11)) &&
    Math.abs(player1Score - player2Score) >= 2;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Set Counter */}
      <SetCounter
        currentSet={currentSet}
        player1Sets={setsWon.player1}
        player2Sets={setsWon.player2}
        totalSets={config.numberOfSets}
        style={styles.setCounter}
      />

      {/* Main Scoreboard */}
      <ScoreBoard
        player1Name={currentMatch.player1?.name || 'Jogador 1'}
        player2Name={currentMatch.player2?.name || 'Jogador 2'}
        player1Score={player1Score}
        player2Score={player2Score}
        style={styles.scoreboard}
      />

      {/* Game Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.scoreButtons}>
          <ScoreButton
            value={player1Score}
            onPress={() => addPoint(1)}
            size="large"
          />
          <ScoreButton
            value={player2Score}
            onPress={() => addPoint(2)}
            size="large"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="secondary"
            size="medium"
            onPress={handleUndo}
            disabled={player1Score === 0 && player2Score === 0}
          >
            ↶ Desfazer
          </Button>
          <Button
            variant={canFinishSet ? 'primary' : 'secondary'}
            size="medium"
            onPress={handleFinishSet}
            disabled={!canFinishSet}
          >
            ✓ Finalizar Set
          </Button>
        </View>
      </View>

      {/* Match Info */}
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Modalidade</Text>
          <Text style={styles.infoValue}>
            {config.modality === 'singles' ? 'Simples' : 'Duplas'}
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Set Até</Text>
          <Text style={styles.infoValue}>{config.pointsPerSet} pontos</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  errorText: { fontSize: 16, color: COLORS.danger, textAlign: 'center', marginTop: 40 },
  setCounter: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  scoreboard: { marginHorizontal: SPACING.lg, marginVertical: SPACING.lg },
  controlsContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.lg },
  scoreButtons: { flexDirection: 'row', justifyContent: 'space-around', gap: SPACING.lg },
  actionButtons: { gap: SPACING.md },
  infoCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm },
  infoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  infoValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  infoDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
});
