import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Avatar, Badge, Card, Divider, EmptyState, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { RankingRepository } from '@/database/repositories/rankingRepository';
import { useRankingStore } from '@/store/useRankingStore';
import { RankingEntry } from '@/types/ranking';

type Props = NativeStackScreenProps<any, 'RankingList'>;

const MEDAL_COLORS = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
} as const;

const MEDAL_ICONS = {
  1: 'medal',
  2: 'medal',
  3: 'medal',
} as const;

export default function RankingListScreen({ navigation }: Props) {
  const { setRankings, rankings, topThree } = useRankingStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'top' | 'all'>('top');

  useFocusEffect(
    useCallback(() => {
      const loadRankings = async () => {
        try {
          setLoading(true);
          const data = await RankingRepository.getRanking();
          setRankings(data);
        } finally {
          setLoading(false);
        }
      };
      loadRankings();
    }, [])
  );

  const filtered = search.trim()
    ? rankings.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.position.toString().includes(search)
      )
    : rankings;

  const topThreeData = topThree();

  if (loading) return <Loader />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar atleta ou posição..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tab Selection */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'top' && styles.tabActive]}
          onPress={() => setSelectedTab('top')}
        >
          <Text style={[styles.tabText, selectedTab === 'top' && styles.tabTextActive]}>
            🏆 Top 3
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            📊 Todos
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'top' ? (
        <View style={styles.topThreeContainer}>
          {topThreeData.length === 0 ? (
            <EmptyState title="Sem dados" description="Nenhum ranking disponível" />
          ) : (
            <View style={styles.podium}>
              {/* 2nd Place */}
              {topThreeData[1] && (
                <View style={styles.podiumItem}>
                  <Card style={[styles.medalistCard, styles.silver]}>
                    <MaterialCommunityIcons
                      name="medal"
                      size={32}
                      color={MEDAL_COLORS[2]}
                    />
                    <Text style={styles.positionBadge}>2º</Text>
                  </Card>
                  <Avatar source={topThreeData[1].photoUri} size="large" />
                  <Text style={styles.medalistName} numberOfLines={1}>
                    {topThreeData[1].name}
                  </Text>
                  <Badge label={`${topThreeData[1].elo} ELO`} variant="accent" size="small" />
                </View>
              )}

              {/* 1st Place */}
              {topThreeData[0] && (
                <View style={styles.podiumItem}>
                  <Card style={[styles.medalistCard, styles.gold]}>
                    <MaterialCommunityIcons
                      name="medal"
                      size={40}
                      color={MEDAL_COLORS[1]}
                    />
                    <Text style={styles.positionBadge}>1º</Text>
                  </Card>
                  <Avatar source={topThreeData[0].photoUri} size="large" />
                  <Text style={styles.medalistName} numberOfLines={1}>
                    {topThreeData[0].name}
                  </Text>
                  <Badge label={`${topThreeData[0].elo} ELO`} variant="accent" size="small" />
                </View>
              )}

              {/* 3rd Place */}
              {topThreeData[2] && (
                <View style={styles.podiumItem}>
                  <Card style={[styles.medalistCard, styles.bronze]}>
                    <MaterialCommunityIcons
                      name="medal"
                      size={32}
                      color={MEDAL_COLORS[3]}
                    />
                    <Text style={styles.positionBadge}>3º</Text>
                  </Card>
                  <Avatar source={topThreeData[2].photoUri} size="large" />
                  <Text style={styles.medalistName} numberOfLines={1}>
                    {topThreeData[2].name}
                  </Text>
                  <Badge label={`${topThreeData[2].elo} ELO`} variant="accent" size="small" />
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.athleteId}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item, index }) => (
            <>
              <TouchableOpacity
                style={styles.rankingItem}
                onPress={() => navigation.navigate('RankingPerfil', { athleteId: item.athleteId })}
              >
                <View style={styles.positionContainer}>
                  <Text style={styles.positionText}>#{item.position}</Text>
                </View>

                <Avatar source={item.photoUri} size="medium" />

                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.statsRow}>
                    <Badge
                      label={`${item.wins}W ${item.losses}L`}
                      variant="default"
                      size="small"
                    />
                    <Badge
                      label={`${item.elo} ELO`}
                      variant="accent"
                      size="small"
                    />
                  </View>
                </View>

                <View style={styles.eloChangeContainer}>
                  {item.eloChange !== 0 && (
                    <View
                      style={[
                        styles.eloChange,
                        item.eloChange > 0
                          ? styles.eloChangePositive
                          : styles.eloChangeNegative,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.eloChange > 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={COLORS.surface}
                      />
                      <Text style={styles.eloChangeText}>
                        {Math.abs(item.eloChange)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {index < filtered.length - 1 && <Divider style={{ marginVertical: 0 }} />}
            </>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyContainer}>
              <EmptyState
                title="Nenhum resultado"
                description="Tente ajustar sua busca"
              />
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontSize: 14,
  },
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
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  tabTextActive: { color: COLORS.primary },
  topThreeContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  podiumItem: { alignItems: 'center', gap: SPACING.sm },
  medalistCard: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gold: { backgroundColor: COLORS.accent },
  silver: { backgroundColor: COLORS.textMuted },
  bronze: { backgroundColor: COLORS.danger },
  positionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
    borderRadius: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  medalistName: { fontSize: 12, fontWeight: '600', color: COLORS.text, maxWidth: 80 },
  listContainer: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  positionContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
  itemContent: { flex: 1, gap: SPACING.xs },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  eloChangeContainer: { alignItems: 'center' },
  eloChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  eloChangePositive: { backgroundColor: COLORS.success },
  eloChangeNegative: { backgroundColor: COLORS.danger },
  eloChangeText: { fontSize: 12, fontWeight: '700', color: COLORS.surface },
  emptyContainer: { paddingVertical: SPACING.xl },
});
