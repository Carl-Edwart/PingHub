import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';

import { Avatar, Badge, Button, Card, Input } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { AthleteRepository } from '@/database/repositories/athleteRepository';
import { TournamentRepository } from '@/database/repositories/tournamentRepository';
import { useTorneioStore } from '@/store/useTorneioStore';
import { BracketType } from '@/types/tournament';
import { Player } from '@/types/match';

type Props = NativeStackScreenProps<any, 'TorneioCreate'>;

export default function TorneioCreateScreen({ navigation, route }: Props) {
  const { createTournament, generateBracket } = useTorneioStore();
  const tournamentId = route.params?.tournamentId;
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [bracketType, setBracketType] = useState<BracketType>('single_elimination' as BracketType);
  const [selectedAthletes, setSelectedAthletes] = useState<Player[]>([]);
  const [allAthletes, setAllAthletes] = useState<Player[]>([]);
  const [showAthletePicker, setShowAthletePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadAthletes = async () => {
      const athletes = await AthleteRepository.getAll();
      setAllAthletes(
        athletes.map((a) => ({ name: a.name, athleteId: a.id }))
      );
    };
    loadAthletes();
  }, []);

  const toggleAthlete = (athlete: Player) => {
    const exists = selectedAthletes.find((a) => a.athleteId === athlete.athleteId);
    if (exists) {
      setSelectedAthletes(selectedAthletes.filter((a) => a.athleteId !== athlete.athleteId));
    } else {
      setSelectedAthletes([...selectedAthletes, athlete]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedAthletes.length < 2 || !date.trim()) {
      alert('Preencha todos os campos e selecione pelo menos 2 atletas');
      return;
    }

    try {
      setLoading(true);
      const matchConfig = { pointsPerSet: 11, bestOf: 3 };
      createTournament(name, date, bracketType, matchConfig);
      selectedAthletes.forEach((a) => useTorneioStore.getState().addParticipant(a));
      useTorneioStore.getState().generateBracket(bracketType);

      const tournament = useTorneioStore.getState().currentTournament;
      if (tournament) {
        await TournamentRepository.create(tournament);
      }

      navigation.navigate('TorneioChave');
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Erro ao criar torneio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Título */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Básicas</Text>
        <Input
          placeholder="Nome do torneio"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
        <Input
          placeholder="Data (DD/MM/YYYY)"
          value={date}
          onChangeText={setDate}
          editable={!loading}
          style={{ marginTop: SPACING.md }}
        />
      </View>

      {/* Tipo de Chaveamento */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Chaveamento</Text>
        <View style={styles.bracketContainer}>
          {([BracketType.SINGLE_ELIMINATION, BracketType.ALL_VS_ALL]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.bracketOption,
                bracketType === type && styles.bracketOptionActive,
              ]}
              onPress={() => setBracketType(type)}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name={type === BracketType.SINGLE_ELIMINATION ? 'layers' : 'view-grid'}
                size={24}
                color={bracketType === type ? COLORS.accent : COLORS.text}
              />
              <Text
                style={[
                  styles.bracketLabel,
                  bracketType === type && styles.bracketLabelActive,
                ]}
              >
                {type === BracketType.SINGLE_ELIMINATION ? 'Eliminatória' : 'Todos vs Todos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Atletas */}
      <View style={styles.section}>
        <View style={styles.athletesHeader}>
          <Text style={styles.sectionTitle}>Participantes ({selectedAthletes.length})</Text>
          {selectedAthletes.length >= 2 && (
            <Badge label="✓ Válido" variant="success" size="small" />
          )}
        </View>

        {selectedAthletes.length > 0 && (
          <View style={styles.selectedContainer}>
            {selectedAthletes.map((a) => (
              <View key={a.athleteId} style={styles.selectedBadge}>
                <Text style={styles.selectedText}>{a.name}</Text>
                <TouchableOpacity onPress={() => toggleAthlete(a)} disabled={loading}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={16}
                    color={COLORS.danger}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Button
          size="medium"
          variant="secondary"
          onPress={() => setShowAthletePicker(!showAthletePicker)}
          disabled={loading}
          style={{ marginTop: SPACING.md }}
        >
          {showAthletePicker ? '← Fechar' : '+ Adicionar Atleta'}
        </Button>

        {showAthletePicker && (
          <View style={styles.pickerContainer}>
            <FlatList
              data={allAthletes}
              keyExtractor={(item, index) => item.athleteId || `athlete-${index}`}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const isSelected = selectedAthletes.some((a) => a.athleteId === item.athleteId);
                return (
                  <TouchableOpacity
                    style={[styles.athleteItem, isSelected && styles.athleteItemSelected]}
                    onPress={() => toggleAthlete(item)}
                    disabled={loading}
                  >
                    <Avatar source={undefined} name={item.name} size="small" />
                    <Text style={[styles.athleteName, isSelected && styles.athleteNameSelected]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={COLORS.success}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <Button
          size="medium"
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          ← Cancelar
        </Button>
        <Button
          size="medium"
          onPress={handleCreate}
          disabled={loading || selectedAthletes.length < 2}
        >
          {loading ? 'Criando...' : 'Criar Torneio'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingVertical: SPACING.lg },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', marginBottom: SPACING.md },
  bracketContainer: { flexDirection: 'row', gap: SPACING.md },
  bracketOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  bracketOptionActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  bracketLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  bracketLabelActive: { color: COLORS.primary },
  athletesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  selectedContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accent,
  },
  selectedText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  pickerContainer: { marginTop: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, maxHeight: 300 },
  athleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  athleteItemSelected: { backgroundColor: COLORS.accent },
  athleteName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  athleteNameSelected: { color: COLORS.primary },
  actionContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, gap: SPACING.md, flexDirection: 'row' },
});
