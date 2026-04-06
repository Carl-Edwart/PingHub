import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Avatar, Badge, Button, Card, Divider, EmptyState, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { TableRepository } from '@/database/repositories/tableRepository';
import { useMesaStore } from '@/store/useMesaStore';
import { QueueEntry } from '@/types/table';
import { formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<any, 'MesaFila'>;

interface FilaData {
  queue: QueueEntry[];
}

export default function MesaFilaScreen({ navigation }: Props) {
  const { queue, setQueue, removeFromQueue } = useMesaStore();
  const [data, setData] = useState<FilaData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [])
  );

  const loadQueue = async () => {
    setLoading(true);
    try {
      const queueData = await TableRepository.getQueue();
      setQueue(queueData);
      setData({ queue: queueData });
    } catch (err) {
      console.error('Erro ao carregar fila:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromQueue = (id: string, name: string) => {
    Alert.alert(
      'Remover da fila',
      `Deseja remover "${name}" da fila de espera?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await TableRepository.removeFromQueue(id);
              removeFromQueue(id);
              loadQueue(); // Recarregar fila
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível remover da fila.');
            }
          },
        },
      ]
    );
  };

  const getModalityLabel = (modality?: string): string => {
    if (modality === 'singles') return 'Simples';
    if (modality === 'doubles') return 'Duplas';
    return 'Qualquer';
  };

  if (loading) return <Loader />;
  if (!data) return null;

  const { queue: filaAtual } = data;

  return (
    <View style={styles.container}>
      {/* ── Header Info ───────────────────────────────── */}
      <View style={styles.headerInfo}>
        <View style={styles.queueStats}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={20}
            color={COLORS.accent}
          />
          <View style={styles.statsText}>
            <Text style={styles.statsLabel}>Jogadores na fila</Text>
            <Text style={styles.statsValue}>{filaAtual.length}</Text>
          </View>
        </View>
      </View>

      {/* ── Fila de espera ───────────────────────────── */}
      {filaAtual.length > 0 ? (
        <FlatList
          data={filaAtual}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.queueItemContainer}>
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>#{index + 1}</Text>
              </View>

              <Card style={styles.queueCard}>
                {/* Avatar + info ─ */}
                <View style={styles.playerInfo}>
                  <Avatar
                    name={item.name}
                    source={item.photoUri}
                    size="medium"
                  />

                  <View style={styles.playerDetails}>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.nickname ? (
                      <Text style={styles.playerNickname} numberOfLines={1}>
                        "{item.nickname}"
                      </Text>
                    ) : null}

                    <View style={styles.playerBadges}>
                      <Badge
                        label={getModalityLabel(item.preferredModality)}
                        size="small"
                        variant="muted"
                      />
                      <Text style={styles.addedTime}>
                        há {calculateTimeAgo(item.addedAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Remove button ─ */}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveFromQueue(item.id, item.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="close-circle-outline"
                    size={20}
                    color={COLORS.danger}
                  />
                </TouchableOpacity>
              </Card>

              {index < filaAtual.length - 1 && (
                <View style={styles.dividerContainer}>
                  <Divider />
                </View>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Nenhuma fila de espera"
            description="Não há jogadores esperando por uma mesa"
          />
        </View>
      )}

      {/* ── Action Button ─────────────────────────────── */}
      <View style={styles.actionContainer}>
        <Button
          variant="primary"
          size="medium"
          onPress={() => navigation.navigate('AtletasList', { mode: 'queue' })}
        >
          <MaterialCommunityIcons name="plus" size={18} color={COLORS.primary} />
          <Text>Adicionar à fila</Text>
        </Button>
      </View>
    </View>
  );
}

// Helper: calcula tempo decorrido desde adição à fila
function calculateTimeAgo(isoDate: string): string {
  const now = new Date();
  const time = new Date(isoDate);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header Info ────────────────────────────────────
  headerInfo: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  queueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statsText: {
    gap: 2,
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },

  // ── List Content ───────────────────────────────────
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },

  // ── Queue Item ─────────────────────────────────────
  queueItemContainer: {
    gap: SPACING.sm,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  positionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },

  // ── Player Info ────────────────────────────────────
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  playerDetails: {
    flex: 1,
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  playerNickname: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  playerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  addedTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // ── Remove Button ──────────────────────────────────
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // ── Divider ────────────────────────────────────────
  dividerContainer: {
    marginVertical: SPACING.sm,
  },

  // ── Empty State ────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Action Container ──────────────────────────────
  actionContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

