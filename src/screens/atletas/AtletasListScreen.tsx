import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/theme';
import { Button, Card, Avatar, Badge, EmptyState } from '@/components';

type Props = NativeStackScreenProps<any, 'AtletasList'>;

interface Atleta {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  wRate: number; // percentual
}

// Mock data
const MOCK_ATLETAS: Atleta[] = [
  { id: '1', name: 'João Silva', elo: 1850, wins: 24, losses: 8, wRate: 75 },
  { id: '2', name: 'Maria Santos', elo: 1720, wins: 18, losses: 12, wRate: 60 },
  { id: '3', name: 'Pedro Costa', elo: 1650, wins: 15, losses: 10, wRate: 60 },
  { id: '4', name: 'Ana Torres', elo: 1580, wins: 12, losses: 15, wRate: 44 },
];

export default function AtletasListScreen({ navigation }: Props) {
  const [atletas, setAtletas] = useState<Atleta[]>(MOCK_ATLETAS);
  const [searchTerm, setSearchTerm] = useState('');

  useFocusEffect(
    useCallback(() => {
      // Aqui viriam dados do store/database
      setAtletas(MOCK_ATLETAS);
    }, [])
  );

  const filteredAtletas = atletas.filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderAtletaItem = ({ item }: { item: Atleta }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('AtletaPerfil', { atletaId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.atletaCard}>
        <View style={styles.cardContent}>
          {/* Avatar + Nome */}
          <View style={styles.leftSection}>
            <Avatar name={item.name} size="medium" />
            <View style={styles.nameSection}>
              <Text style={styles.atletaNome}>{item.name}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statText}>{item.wins}V</Text>
                <Text style={styles.statSeparator}>•</Text>
                <Text style={styles.statText}>{item.losses}D</Text>
              </View>
            </View>
          </View>

          {/* ELO Badge */}
          <View style={styles.rightSection}>
            <Badge
              label={`${item.elo}`}
              variant={item.elo >= 1700 ? 'success' : item.elo >= 1500 ? 'default' : 'muted'}
            />
            <View style={styles.taxaContainer}>
              <Text style={styles.taxaLabel}>Taxa</Text>
              <Text style={styles.taxa}>{item.wRate}%</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header com botão novo */}
      <View style={styles.header}>
        <Button
          label="+ Novo Atleta"
          variant="primary"
          size="small"
          onPress={() => navigation.navigate('AtletaForm')}
          style={styles.newButton}
        />
      </View>

      {/* Lista */}
      {filteredAtletas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Nenhum atleta cadastrado"
            description="Crie um novo atleta para começar"
            actionLabel="Novo Atleta"
            onAction={() => navigation.navigate('AtletaForm')}
          />
        </View>
      ) : (
        <FlatList
          data={filteredAtletas}
          renderItem={renderAtletaItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  newButton: {
    alignSelf: 'flex-end',
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  atletaCard: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  nameSection: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  atletaNome: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statSeparator: {
    color: COLORS.border,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  taxaContainer: {
    alignItems: 'center',
  },
  taxaLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  taxa: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.accent,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
