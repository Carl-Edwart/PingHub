import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { Button, Card, Avatar, StatsCard, Divider, Badge } from '@/components';

type Props = NativeStackScreenProps<any, 'AtletaPerfil'>;

interface AtletaData {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  mainStats: Array<{ label: string; value: string }>;
  recentMatches: Array<{ opponent: string; result: 'W' | 'L' | 'D'; score: string }>;
}

export default function AtletaPerfilScreen({ route, navigation }: Props) {
  const { atletaId } = route.params;
  const [atleta, setAtleta] = useState<AtletaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAtletaData();
  }, [atletaId]);

  const loadAtletaData = async () => {
    // Mock data
    setTimeout(() => {
      setAtleta({
        id: atletaId,
        name: 'João Silva',
        elo: 1850,
        wins: 24,
        losses: 8,
        draws: 2,
        mainStats: [
          { label: 'Vitórias', value: '24' },
          { label: 'Derrotas', value: '8' },
          { label: 'Empates', value: '2' },
          { label: 'Taxa', value: '75%' },
        ],
        recentMatches: [
          { opponent: 'Maria Santos', result: 'W', score: '3-1' },
          { opponent: 'Pedro Costa', result: 'W', score: '3-0' },
          { opponent: 'Ana Torres', result: 'L', score: '1-3' },
        ],
      });
      setLoading(false);
    }, 500);
  };

  if (loading || !atleta) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.subtitle}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header com Avatar e Info Principal */}
      <Card style={styles.headerCard}>
        <View style={styles.headerContent}>
          <Avatar name={atleta.name} size="large" />
          <View style={styles.headerInfo}>
            <Text style={styles.atletaNome}>{atleta.name}</Text>
            <View style={styles.eloContainer}>
              <Badge label={`ELO ${atleta.elo}`} variant="accent" />
            </View>
          </View>
        </View>
      </Card>

      {/* Estatísticas Principais */}
      <Card style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <StatsCard items={atleta.mainStats} />
      </Card>

      {/* Detalhes adicionais */}
      <Card style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total de Partidas</Text>
          <Text style={styles.detailValue}>{atleta.wins + atleta.losses + atleta.draws}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Taxa de Vitória</Text>
          <Text style={styles.detailValue}>
            {((atleta.wins / (atleta.wins + atleta.losses + atleta.draws)) * 100).toFixed(1)}%
          </Text>
        </View>
      </Card>

      {/* Últimas partidas */}
      <Card style={styles.matchesSection}>
        <Text style={styles.sectionTitle}>Últimas Partidas</Text>
        {atleta.recentMatches.map((match, index) => (
          <View key={index}>
            <View style={styles.matchRow}>
              <View style={styles.matchInfo}>
                <Text style={styles.matchOpponent}>{match.opponent}</Text>
              </View>
              <View style={styles.matchResult}>
                <Badge
                  label={match.result}
                  variant={match.result === 'W' ? 'success' : match.result === 'L' ? 'danger' : 'muted'}
                />
                <Text style={styles.matchScore}>{match.score}</Text>
              </View>
            </View>
            {index < atleta.recentMatches.length - 1 && <Divider style={styles.divider} />}
          </View>
        ))}
      </Card>

      {/* Botões de ação */}
      <View style={styles.actions}>
        <Button
          label="Editar"
          variant="primary"
          size="medium"
          onPress={() => navigation.navigate('AtletaForm', { atletaId })}
          style={styles.actionButton}
        />
        <Button
          label="Ver Matches"
          variant="secondary"
          size="medium"
          onPress={() => {}}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  headerInfo: {
    flex: 1,
  },
  atletaNome: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  eloContainer: {
    alignSelf: 'flex-start',
  },
  statsSection: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  detailsSection: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  matchesSection: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  detailLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  detailValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.accent,
  },
  divider: {
    marginVertical: SPACING.sm,
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  matchInfo: {
    flex: 1,
  },
  matchOpponent: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  matchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  matchScore: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: 0,
    marginBottom: SPACING.xxl,
  },
  actionButton: {
    flex: 1,
  },
});

