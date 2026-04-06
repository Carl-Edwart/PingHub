import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Card, Divider, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { MatchRepository } from '@/database/repositories/matchRepository';
import { usePartidaStore } from '@/store/usePartidaStore';
import { useRankingStore } from '@/store/useRankingStore';
import { EloService } from '@/services/eloService';
import { v4 as uuidv4 } from 'uuid';

type Props = NativeStackScreenProps<any, 'PartidaResultado'>;

export default function PartidaResultadoScreen({ navigation }: Props) {
  const { currentMatch, player1Score, player2Score, setsWon, config } =
    usePartidaStore();
  const { updateElo } = useRankingStore();
  const [saving, setSaving] = useState(false);

  if (!currentMatch || !config) {
    return <Loader />;
  }

  const winner =
    setsWon.player1 > setsWon.player2
      ? currentMatch.player1?.name
      : currentMatch.player2?.name;
  const winnerNumber =
    setsWon.player1 > setsWon.player2 ? 1 : 2;
  const loserNumber = winnerNumber === 1 ? 2 : 1;
  const loserName =
    winnerNumber === 1
      ? currentMatch.player2?.name
      : currentMatch.player1?.name;

  const handleSaveResult = async () => {
    setSaving(true);
    try {
      // Create match record
      const match = {
        id: uuidv4(),
        player1: currentMatch.player1!,
        player2: currentMatch.player2!,
        setsConfig: config,
        sets: [
          { player1Score, player2Score },
        ],
        mode: config.mode,
        duration: Date.now(),
        createdAt: new Date().toISOString(),
      };

      await MatchRepository.create(match);

      // Update ELO if competitive mode
      if (config.mode === 'competitive') {
        const winnerId = winnerNumber === 1 ? currentMatch.player1?.athleteId : currentMatch.player2?.athleteId;
        const loserId = loserNumber === 1 ? currentMatch.player1?.athleteId : currentMatch.player2?.athleteId;

        if (winnerId && loserId) {
          const result = EloService.calculateElo(1500, 1500, 1, false);
          updateElo(winnerId, result.newRatingA, result.deltaA);
          updateElo(loserId, result.newRatingB, result.deltaB);
        }
      }

      Alert.alert('Sucesso', 'Resultado salvo com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('PartidaConfig'),
        },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar resultado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Winner Section */}
      <View style={styles.winnerSection}>
        <MaterialCommunityIcons
          name="trophy"
          size={64}
          color={COLORS.accent}
        />
        <Text style={styles.winnerText}>{winner} venceu!</Text>
      </View>

      <Divider style={{ marginVertical: SPACING.lg }} />

      {/* Score Summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Placar Final</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreColumn}>
            <Text style={styles.playerName}>{currentMatch.player1?.name}</Text>
            <Text style={styles.scoreValue}>{setsWon.player1}</Text>
          </View>
          <Text style={styles.vs}>Sets</Text>
          <View style={styles.scoreColumn}>
            <Text style={styles.playerName}>{currentMatch.player2?.name}</Text>
            <Text style={styles.scoreValue}>{setsWon.player2}</Text>
          </View>
        </View>

        <Divider style={{ marginVertical: SPACING.md }} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Modalidade:</Text>
          <Text style={styles.detailValue}>
            {config.modality === 'singles' ? 'Simples' : 'Duplas'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Modo:</Text>
          <Text style={styles.detailValue}>
            {config.mode === 'competitive' ? 'Competitivo' : 'Cooperativo'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pontos por Set:</Text>
          <Text style={styles.detailValue}>{config.pointsPerSet}</Text>
        </View>
      </Card>

      {/* Match Statistics */}
      <Card style={styles.statsCard}>
        <Text style={styles.summaryTitle}>Estatísticas</Text>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="crown"
              size={20}
              color={COLORS.accent}
            />
            <Text style={styles.statLabel}>Vencedor</Text>
            <Text style={styles.statValue}>{winner}</Text>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="medal"
              size={20}
              color={COLORS.textMuted}
            />
            <Text style={styles.statLabel}>Perdedor</Text>
            <Text style={styles.statValue}>{loserName}</Text>
          </View>
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          variant="primary"
          size="medium"
          onPress={handleSaveResult}
          disabled={saving}
        >
          {saving ? 'Salvando...' : '💾 Salvar Resultado'}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          onPress={() => navigation.navigate('PartidaConfig')}
          disabled={saving}
        >
          ↻ Nova Partida
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingVertical: SPACING.lg },
  winnerSection: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  winnerText: { fontSize: 28, fontWeight: '700', color: COLORS.accent },
  summaryCard: { marginHorizontal: SPACING.lg, marginVertical: SPACING.md },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', marginBottom: SPACING.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: SPACING.md },
  scoreColumn: { alignItems: 'center', gap: SPACING.sm },
  playerName: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  scoreValue: { fontSize: 36, fontWeight: '700', color: COLORS.accent },
  vs: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  detailLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  detailValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statsCard: { marginHorizontal: SPACING.lg, marginVertical: SPACING.md },
  statRow: { flexDirection: 'row', gap: SPACING.md },
  verticalDivider: { width: 1, height: 60, backgroundColor: COLORS.border },
  statItem: { flex: 1, alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  actionContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, gap: SPACING.md },
});
