import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge, Card, Divider, EmptyState, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useRegrasStore } from '@/store/useRegrasStore';
import { Rule } from '@/types/content';

type Props = NativeStackScreenProps<any, 'RegrasList'>;

const MOCK_RULES: Rule[] = [
  {
    id: 'ittf_1',
    title: 'Serviço Válido',
    category: 'Serviço',
    content: 'O serviço deve ser realizado colocando a bola livremente sobre a palma da mão aberta...',
    source: 'ittf',
  },
  {
    id: 'ittf_2',
    title: 'Altura de Rebatida',
    category: 'Pontuação',
    content: 'A bola deve passar acima da rede durante todos os rebatidas...',
    source: 'ittf',
  },
  {
    id: 'local_1',
    title: 'Reserva de Mesas',
    category: 'Uso da Mesa',
    content: 'As mesas devem ser reservadas com mínimo 1 hora de antecedência...',
    source: 'local',
  },
  {
    id: 'local_2',
    title: 'Limpeza Obrigatória',
    category: 'Uso da Mesa',
    content: 'Todo usuário é responsável por limpar a mesa após o uso...',
    source: 'local',
  },
];

export default function RegrasListScreen({ navigation }: Props) {
  const { setRules, rules, searchRules } = useRegrasStore();
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState<'ittf' | 'local' | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setRules(MOCK_RULES);
      setLoading(false);
    }, [])
  );

  const getFilteredRules = (): { ittf: Rule[]; local: Rule[] } => {
    let filtered = rules;

    if (search.trim()) {
      filtered = searchRules(search);
    }

    if (selectedSource) {
      filtered = filtered.filter((r) => r.source === selectedSource);
    }

    return {
      ittf: filtered.filter((r) => r.source === 'ittf'),
      local: filtered.filter((r) => r.source === 'local'),
    };
  };

  if (loading) return <Loader />;

  const { ittf, local } = getFilteredRules();
  const hasResults = ittf.length > 0 || local.length > 0;

  return (
    <View style={styles.container}>
      {/* ── Search Bar ────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por regra..."
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

      {/* ── Source Filter ─────────────────────────────── */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !selectedSource && styles.filterButtonActive]}
          onPress={() => setSelectedSource(null)}
        >
          <Text style={[styles.filterText, !selectedSource && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedSource === 'ittf' && styles.filterButtonActive]}
          onPress={() => setSelectedSource(selectedSource === 'ittf' ? null : 'ittf')}
        >
          <Text style={[styles.filterText, selectedSource === 'ittf' && styles.filterTextActive]}>
            ITTF ({rules.filter((r) => r.source === 'ittf').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedSource === 'local' && styles.filterButtonActive]}
          onPress={() => setSelectedSource(selectedSource === 'local' ? null : 'local')}
        >
          <Text style={[styles.filterText, selectedSource === 'local' && styles.filterTextActive]}>
            Local ({rules.filter((r) => r.source === 'local').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Rules List ────────────────────────────────── */}
      {hasResults ? (
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* ITTF Rules */}
          {ittf.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="book-open-page-variant" size={20} color={COLORS.accent} />
                <Text style={styles.sectionTitle}>Regras ITTF</Text>
              </View>

              <View style={styles.rulesList}>
                {ittf.map((rule, index) => (
                  <View key={rule.id}>
                    <TouchableOpacity
                      style={styles.ruleCard}
                      onPress={() => navigation.navigate('RegrasDetalhe', { ruleId: rule.id })}
                      activeOpacity={0.75}
                    >
                      <View style={styles.ruleHeader}>
                        <Text style={styles.ruleTitle}>{rule.title}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
                      </View>

                      <Text style={styles.ruleCategory}>{rule.category}</Text>
                      <Text style={styles.rulePreview} numberOfLines={2}>
                        {rule.content}
                      </Text>

                      <Badge label="ITTF" size="small" variant="accent" />
                    </TouchableOpacity>

                    {index < ittf.length - 1 && <Divider style={{ marginVertical: 0 }} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Local Rules */}
          {local.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="home-outline" size={20} color={COLORS.success} />
                <Text style={styles.sectionTitle}>Regras Locais</Text>
              </View>

              <View style={styles.rulesList}>
                {local.map((rule, index) => (
                  <View key={rule.id}>
                    <TouchableOpacity
                      style={styles.ruleCard}
                      onPress={() => navigation.navigate('RegrasDetalhe', { ruleId: rule.id })}
                      activeOpacity={0.75}
                    >
                      <View style={styles.ruleHeader}>
                        <Text style={styles.ruleTitle}>{rule.title}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
                      </View>

                      <Text style={styles.ruleCategory}>{rule.category}</Text>
                      <Text style={styles.rulePreview} numberOfLines={2}>
                        {rule.content}
                      </Text>

                      <Badge label="Local" size="small" variant="muted" />
                    </TouchableOpacity>

                    {index < local.length - 1 && <Divider style={{ marginVertical: 0 }} />}
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState title="Nenhuma regra encontrada" description="Tente ajustar sua busca ou filtros" />
        </View>
      )}
    </View>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  filterTextActive: { color: COLORS.primary },
  contentContainer: { flex: 1, paddingVertical: SPACING.lg },
  section: { gap: SPACING.md, paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 2, borderBottomColor: COLORS.border },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  rulesList: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  ruleCard: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, gap: SPACING.sm },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  ruleTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  ruleCategory: { fontSize: 12, fontWeight: '500', color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.3 },
  ruleTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  ruleDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});

