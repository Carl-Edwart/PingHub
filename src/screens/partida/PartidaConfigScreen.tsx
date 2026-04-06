import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge, Button, Card, Divider } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { usePartidaStore } from '@/store/usePartidaStore';
import { MatchConfig, MatchMode, Modality, Player } from '@/types/match';

type Props = NativeStackScreenProps<any, 'PartidaConfig'>;

interface ConfigState {
  player1: Player | null;
  player2: Player | null;
  mode: MatchMode;
  modality: Modality;
  pointsPerSet: number;
  numberOfSets: number;
}

export default function PartidaConfigScreen({ navigation }: Props) {
  const { initMatch } = usePartidaStore();
  const [config, setConfig] = useState<ConfigState>({
    player1: null,
    player2: null,
    mode: MatchMode.COMPETITIVE,
    modality: Modality.SINGLES,
    pointsPerSet: 11,
    numberOfSets: 3,
  });

  const handleSelectPlayer = (playerNumber: 1 | 2) => {
    navigation.navigate('AtletasList', {
      mode: 'select',
      onSelect: (athlete: { id: string; name: string }) => {
        setConfig((prev) => ({
          ...prev,
          [playerNumber === 1 ? 'player1' : 'player2']: {
            athleteId: athlete.id,
            name: athlete.name,
          },
        }));
      },
    });
  };

  const canStart =
    config.player1 && config.player2 && config.player1.name !== config.player2.name;

  const handleStartMatch = () => {
    if (!canStart) {
      Alert.alert(
        'Configuração Incompleta',
        'Selecione 2 jogadores diferentes para iniciar a partida'
      );
      return;
    }

    const matchConfig: MatchConfig = {
      pointsPerSet: config.pointsPerSet,
      numberOfSets: config.numberOfSets,
      mode: config.mode,
      modality: config.modality,
    };

    initMatch(config.player1!, config.player2!, matchConfig);
    navigation.navigate('PartidaPlay');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Players Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jogadores</Text>

        <TouchableOpacity
          style={styles.playerCard}
          onPress={() => handleSelectPlayer(1)}
        >
          <View style={styles.playerCardContent}>
            <MaterialCommunityIcons
              name={config.player1 ? 'account-check' : 'account-plus'}
              size={24}
              color={config.player1 ? COLORS.success : COLORS.textMuted}
            />
            <View style={styles.playerInfo}>
              <Text style={styles.playerLabel}>Jogador 1</Text>
              <Text
                style={[
                  styles.playerName,
                  !config.player1 && styles.playerNameEmpty,
                ]}
              >
                {config.player1?.name || 'Selecionar...'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <Divider />
          <Text style={styles.dividerText}>VS</Text>
        </View>

        <TouchableOpacity
          style={styles.playerCard}
          onPress={() => handleSelectPlayer(2)}
        >
          <View style={styles.playerCardContent}>
            <MaterialCommunityIcons
              name={config.player2 ? 'account-check' : 'account-plus'}
              size={24}
              color={config.player2 ? COLORS.success : COLORS.textMuted}
            />
            <View style={styles.playerInfo}>
              <Text style={styles.playerLabel}>Jogador 2</Text>
              <Text
                style={[
                  styles.playerName,
                  !config.player2 && styles.playerNameEmpty,
                ]}
              >
                {config.player2?.name || 'Selecionar...'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Match Mode & Modality */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Jogo</Text>

        <Card style={styles.card}>
          <Text style={styles.optionLabel}>Modo</Text>
          <View style={styles.optionGroup}>
            {Object.values(MatchMode).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.optionButton,
                  config.mode === mode && styles.optionButtonActive,
                ]}
                onPress={() => setConfig((prev) => ({ ...prev, mode }))}
              >
                <Text
                  style={[
                    styles.optionText,
                    config.mode === mode && styles.optionTextActive,
                  ]}
                >
                  {mode === MatchMode.COMPETITIVE ? '⚔️ Competitivo' : '🤝 Cooperativo'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.optionLabel}>Modalidade</Text>
          <View style={styles.optionGroup}>
            {Object.values(Modality).map((mod) => (
              <TouchableOpacity
                key={mod}
                style={[
                  styles.optionButton,
                  config.modality === mod && styles.optionButtonActive,
                ]}
                onPress={() => setConfig((prev) => ({ ...prev, modality: mod }))}
              >
                <Text
                  style={[
                    styles.optionText,
                    config.modality === mod && styles.optionTextActive,
                  ]}
                >
                  {mod === Modality.SINGLES ? '👤 Simples' : '👥 Duplas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </View>

      {/* Points & Sets Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuração</Text>

        <Card style={styles.card}>
          <View style={styles.configRow}>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Pontos por Set</Text>
              <View style={styles.configButtons}>
                {[11, 21].map((pts) => (
                  <TouchableOpacity
                    key={pts}
                    style={[
                      styles.configButton,
                      config.pointsPerSet === pts && styles.configButtonActive,
                    ]}
                    onPress={() =>
                      setConfig((prev) => ({ ...prev, pointsPerSet: pts }))
                    }
                  >
                    <Text
                      style={[
                        styles.configButtonText,
                        config.pointsPerSet === pts && styles.configButtonTextActive,
                      ]}
                    >
                      {pts}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Melhor de</Text>
              <View style={styles.configButtons}>
                {[1, 3, 5].map((sets) => (
                  <TouchableOpacity
                    key={sets}
                    style={[
                      styles.configButton,
                      config.numberOfSets === sets && styles.configButtonActive,
                    ]}
                    onPress={() =>
                      setConfig((prev) => ({ ...prev, numberOfSets: sets }))
                    }
                  >
                    <Text
                      style={[
                        styles.configButtonText,
                        config.numberOfSets === sets &&
                          styles.configButtonTextActive,
                      ]}
                    >
                      {sets}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* Summary */}
      {config.player1 && config.player2 && (
        <Card style={[styles.card, styles.summaryCard]}>
          <Text style={styles.summaryTitle}>Resumo</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {config.player1.name} vs {config.player2.name}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Badge
              label={config.mode === MatchMode.COMPETITIVE ? 'Competitivo' : 'Cooperativo'}
              variant="accent"
              size="small"
            />
            <Badge
              label={config.modality === Modality.SINGLES ? 'Simples' : 'Duplas'}
              variant="default"
              size="small"
            />
            <Badge
              label={`Até ${config.pointsPerSet}`}
              variant="muted"
              size="small"
            />
          </View>
        </Card>
      )}

      {/* Start Button */}
      <View style={styles.actionContainer}>
        <Button
          variant={canStart ? 'primary' : 'secondary'}
          size="medium"
          onPress={handleStartMatch}
          disabled={!canStart}
        >
          Iniciar Partida
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingVertical: SPACING.md },
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  playerCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md },
  playerInfo: { flex: 1, gap: SPACING.xs },
  playerLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  playerName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  playerNameEmpty: { color: COLORS.textMuted, fontSize: 14 },
  dividerContainer: { position: 'relative', alignItems: 'center', marginVertical: SPACING.md },
  dividerText: { fontSize: 12, fontWeight: '700', color: COLORS.accent, backgroundColor: COLORS.background, paddingHorizontal: SPACING.md, position: 'absolute' },
  card: { marginHorizontal: SPACING.lg, marginVertical: SPACING.sm },
  optionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: SPACING.md },
  optionGroup: { flexDirection: 'row', gap: SPACING.md },
  optionButton: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  optionButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  optionText: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  optionTextActive: { color: COLORS.primary },
  configRow: { flexDirection: 'row', gap: SPACING.lg },
  configItem: { flex: 1, gap: SPACING.md },
  configLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  configButtons: { flexDirection: 'row', gap: SPACING.sm },
  configButton: { flex: 1, paddingVertical: SPACING.sm, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  configButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  configButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  configButtonTextActive: { color: COLORS.primary },
  summaryCard: { marginBottom: SPACING.lg },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginVertical: SPACING.sm },
  summaryText: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  actionContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, gap: SPACING.md },
});
