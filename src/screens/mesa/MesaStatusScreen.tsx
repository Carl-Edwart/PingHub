import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge, Card, Divider, EmptyState, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { TableRepository } from '@/database/repositories/tableRepository';
import { useMesaStore } from '@/store/useMesaStore';
import { Table, TableStatus, TableStats } from '@/types/table';
import { formatDate } from '@/utils/formatters';

type Props = NativeStackScreenProps<any, 'MesaStatus'>;

interface MesaStatusData {
  tables: Table[];
  stats: TableStats;
}

const STATUS_LABELS: Record<TableStatus, string> = {
  [TableStatus.AVAILABLE]: 'Disponível',
  [TableStatus.IN_USE]: 'Em uso',
  [TableStatus.MAINTENANCE]: 'Manutenção',
};

const STATUS_ICONS = {
  [TableStatus.AVAILABLE]: 'check-circle',
  [TableStatus.IN_USE]: 'play-circle',
  [TableStatus.MAINTENANCE]: 'wrench',
} as const;

const STATUS_COLORS: Record<TableStatus, string> = {
  [TableStatus.AVAILABLE]: COLORS.success,
  [TableStatus.IN_USE]: COLORS.accent,
  [TableStatus.MAINTENANCE]: COLORS.danger,
};

export default function MesaStatusScreen({ navigation }: Props) {
  const { tables, setTables } = useMesaStore();
  const [data, setData] = useState<MesaStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const allTables = await TableRepository.getAllTables();
      setTables(allTables);

      // Calcular stats
      const stats: TableStats = {
        totalTables: allTables.length,
        availableTables: allTables.filter((t) => t.status === TableStatus.AVAILABLE).length,
        inUseTables: allTables.filter((t) => t.status === TableStatus.IN_USE).length,
        maintenanceTables: allTables.filter((t) => t.status === TableStatus.MAINTENANCE).length,
        queueLength: 0, // Será preenchido separadamente
        averageMatchDuration: 0,
      };

      setData({ tables: allTables, stats });
    } catch (err) {
      console.error('Erro ao carregar status das mesas:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: TableStatus): 'default' | 'muted' | 'accent' => {
    if (status === TableStatus.AVAILABLE) return 'accent';
    if (status === TableStatus.IN_USE) return 'default';
    return 'muted';
  };

  if (loading) return <Loader />;
  if (!data) return null;

  const { tables: allTables, stats } = data;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Header Stats ──────────────────────────────── */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {stats.totalTables}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {stats.availableTables}
          </Text>
          <Text style={styles.statLabel}>Disponíveis</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>
            {stats.inUseTables}
          </Text>
          <Text style={styles.statLabel}>Em uso</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>
            {stats.maintenanceTables}
          </Text>
          <Text style={styles.statLabel}>Manutenção</Text>
        </View>
      </View>

      {/* ── Mesas por Status ──────────────────────────── */}
      {allTables.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status das Mesas</Text>

          <View style={styles.tableList}>
            {allTables.map((table, index) => (
              <View key={table.id}>
                <TouchableOpacity
                  style={styles.tableCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('MesaFila')}
                >
                  {/* Número da mesa */}
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableNumber}>Mesa {table.number}</Text>

                    <Badge
                      label={STATUS_LABELS[table.status]}
                      variant={getStatusVariant(table.status)}
                      size="small"
                    />
                  </View>

                  {/* Status indicator */}
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons
                      name={STATUS_ICONS[table.status]}
                      size={16}
                      color={STATUS_COLORS[table.status]}
                    />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[table.status] }]}>
                      {STATUS_LABELS[table.status]}
                    </Text>
                  </View>

                  {/* Jogadores (se em uso) */}
                  {table.status === TableStatus.IN_USE && table.player1Name && table.player2Name ? (
                    <View style={styles.playersSection}>
                      <Text style={styles.vs}>
                        <Text style={styles.playerName}>{table.player1Name}</Text>
                        <Text style={styles.vsText}> vs </Text>
                        <Text style={styles.playerName}>{table.player2Name}</Text>
                      </Text>

                      {table.startedAt && (
                        <Text style={styles.duration}>
                          Iniciada em {formatDate(table.startedAt, true)}
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {/* Empty state para mesa disponível */}
                  {table.status === TableStatus.AVAILABLE && (
                    <Text style={styles.emptyStatus}>Selecione jogadores para começar</Text>
                  )}

                  {/* Empty state para manutenção */}
                  {table.status === TableStatus.MAINTENANCE && (
                    <Text style={styles.emptyStatus}>Mesa em manutenção</Text>
                  )}
                </TouchableOpacity>

                {index < allTables.length - 1 && <Divider style={{ marginVertical: 0 }} />}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <EmptyState
            title="Nenhuma mesa registrada"
            description="Configure as mesas disponíveis primeiro"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },

  // ── Stats Container ──────────────────────────────
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ── Section ───────────────────────────────────────
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // ── Table List ────────────────────────────────────
  tableList: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableCard: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Players ────────────────────────────────────────
  playersSection: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  vs: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
  },
  playerName: {
    fontWeight: '600',
  },
  vsText: {
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  duration: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyStatus: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

