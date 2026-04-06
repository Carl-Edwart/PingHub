import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge, Card, EmptyState, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { TournamentRepository } from '@/database/repositories/tournamentRepository';
import { useTorneioStore } from '@/store/useTorneioStore';
import { TournamentStatus, Tournament, BracketType } from '@/types/tournament';

type Props = NativeStackScreenProps<any, 'TorneioList'>;

export default function TorneioListScreen({ navigation }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<TournamentStatus>('planning' as TournamentStatus);

  useFocusEffect(
    useCallback(() => {
      const loadTournaments = async () => {
        try {
          setLoading(true);
          const data = await TournamentRepository.getAll();
          setTournaments(data);
        } finally {
          setLoading(false);
        }
      };
      loadTournaments();
    }, [])
  );

  const filtered = tournaments.filter((t) => t.status === selectedTab);

  const handleTournamentPress = (tournament: Tournament) => {
    if (tournament.status === 'planning') {
      navigation.navigate('TorneioCreate', { tournamentId: tournament.id });
    } else if (tournament.status === 'active') {
      navigation.navigate('TorneioChave', { tournamentId: tournament.id });
    } else {
      navigation.navigate('TorneioResultado', { tournamentId: tournament.id });
    }
  };

  const handleCreateNew = () => {
    navigation.navigate('TorneioCreate');
  };

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'planning':
        return COLORS.accent;
      case 'active':
        return COLORS.success;
      case 'completed':
        return COLORS.textMuted;
      default:
        return COLORS.border;
    }
  };

  const getStatusLabel = (status: TournamentStatus): string => {
    switch (status) {
      case TournamentStatus.PLANNING:
        return 'Planejamento';
      case TournamentStatus.ACTIVE:
        return 'Em Andamento';
      case TournamentStatus.COMPLETED:
        return 'Finalizado';
      default:
        return 'Desconhecido';
    }
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      {/* Tab Selection */}
      <View style={styles.tabContainer}>
        {([TournamentStatus.PLANNING, TournamentStatus.ACTIVE, TournamentStatus.COMPLETED] as TournamentStatus[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {getStatusLabel(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title={`Nenhum torneio em ${getStatusLabel(selectedTab).toLowerCase()}`}
            description="Crie um novo torneio para começar"
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={filtered.length > 3}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleTournamentPress(item)}
              activeOpacity={0.7}
            >
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleContainer}>
                    <MaterialCommunityIcons
                      name="tournament"
                      size={24}
                      color={getStatusColor(item.status)}
                    />
                    <View style={styles.titleContent}>
                      <Text style={styles.title}>{item.name}</Text>
                      <Text style={styles.date}>
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={getStatusLabel(item.status)}
                    variant={item.status === 'planning' ? 'accent' : item.status === 'active' ? 'success' : 'default'}
                  />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <MaterialCommunityIcons
                        name="account-multiple"
                        size={16}
                        color={COLORS.textMuted}
                      />
                      <Text style={styles.infoLabel}>
                        {item.participants.length} participantes
                      </Text>
                    </View>

                    <View style={styles.infoItem}>
                      <MaterialCommunityIcons
                      name={item.bracketType === BracketType.SINGLE_ELIMINATION ? 'layers' : 'view-grid'}
                      size={16}
                      color={COLORS.textMuted}
                    />
                    <Text style={styles.infoLabel}>
                      {item.bracketType === BracketType.SINGLE_ELIMINATION ? 'Eliminatória' : 'Todos vs Todos'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.participantsPreview}>
                    {item.participants.slice(0, 3).map((p) => (
                      <View key={p.name} style={styles.participantBadge}>
                        <Text style={styles.participantText} numberOfLines={1}>
                          {p.name}
                        </Text>
                      </View>
                    ))}
                    {item.participants.length > 3 && (
                      <View style={styles.participantBadge}>
                        <Text style={styles.participantText}>
                          +{item.participants.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNew}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color={COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  tabTextActive: { color: COLORS.primary },
  listContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  card: { marginVertical: SPACING.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  titleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  titleContent: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  date: { fontSize: 12, fontWeight: '500', color: COLORS.textMuted, marginTop: SPACING.xs },
  cardBody: { gap: SPACING.md },
  infoRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  infoLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textMuted },
  participantsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  participantBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  participantText: { fontSize: 11, fontWeight: '500', color: COLORS.text, maxWidth: 80 },
  emptyContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.text,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
