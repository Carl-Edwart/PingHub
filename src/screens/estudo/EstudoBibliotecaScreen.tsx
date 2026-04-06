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

import { Badge, Card, Divider, EmptyState, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useEstudoStore } from '@/store/useEstudoStore';
import { ContentLevel, ContentType, TechniqueContent } from '@/types/content';

type Props = NativeStackScreenProps<any, 'EstudoBiblioteca'>;

const LEVEL_LABELS: Record<ContentLevel, string> = {
  [ContentLevel.BEGINNER]: 'Iniciante',
  [ContentLevel.INTERMEDIATE]: 'Intermediário',
  [ContentLevel.ADVANCED]: 'Avançado',
};

const LEVEL_COLORS: Record<ContentLevel, string> = {
  [ContentLevel.BEGINNER]: COLORS.success,
  [ContentLevel.INTERMEDIATE]: COLORS.accent,
  [ContentLevel.ADVANCED]: COLORS.danger,
};

const LEVEL_ORDER = [ContentLevel.BEGINNER, ContentLevel.INTERMEDIATE, ContentLevel.ADVANCED];

interface GroupedTechniques {
  level: ContentLevel;
  items: TechniqueContent[];
}

const MOCK_TECHNIQUES: TechniqueContent[] = [
  {
    id: '1',
    title: 'Agarre Básico',
    level: ContentLevel.BEGINNER,
    category: 'Fundamentos',
    description: 'Aprenda o agarre correto da raquete para iniciantes',
    url: 'https://youtube.com/watch?v=example',
    type: ContentType.VIDEO,
  },
  {
    id: '2',
    title: 'Drive Ofensivo',
    level: ContentLevel.INTERMEDIATE,
    category: 'Ataque',
    description: 'Técnica de drive para armadores',
    url: 'https://youtube.com/watch?v=example',
    type: ContentType.VIDEO,
  },
  {
    id: '3',
    title: 'Loop Agressivo',
    level: ContentLevel.ADVANCED,
    category: 'Ataque',
    description: 'Golpe de loop com topspin máximo',
    url: 'https://youtube.com/watch?v=example',
    type: ContentType.VIDEO,
  },
];

export default function EstudoBibliotecaScreen({ navigation }: Props) {
  const { setTechniques, techniques, searchTechniques } = useEstudoStore();
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ContentLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setTechniques(MOCK_TECHNIQUES);
      setLoading(false);
    }, [])
  );

  const getFilteredTechniques = (): GroupedTechniques[] => {
    let filtered = techniques;

    if (search.trim()) {
      filtered = searchTechniques(search);
    }

    if (selectedLevel) {
      filtered = filtered.filter((t) => t.level === selectedLevel);
    }

    const grouped: Record<ContentLevel, TechniqueContent[]> = {
      [ContentLevel.BEGINNER]: [],
      [ContentLevel.INTERMEDIATE]: [],
      [ContentLevel.ADVANCED]: [],
    };

    filtered.forEach((t) => {
      grouped[t.level].push(t);
    });

    return LEVEL_ORDER.filter((level) => grouped[level].length > 0).map((level) => ({
      level,
      items: grouped[level],
    }));
  };

  if (loading) return <Loader />;

  const grouped = getFilteredTechniques();
  const hasResults = grouped.some((g) => g.items.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar conteúdo..."
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

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !selectedLevel && styles.filterButtonActive]}
          onPress={() => setSelectedLevel(null)}
        >
          <Text style={[styles.filterText, !selectedLevel && styles.filterTextActive]}>Todos</Text>
        </TouchableOpacity>

        {LEVEL_ORDER.map((level) => {
          const count = techniques.filter((t) => t.level === level).length;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.filterButton, selectedLevel === level && styles.filterButtonActive]}
              onPress={() => setSelectedLevel(selectedLevel === level ? null : level)}
            >
              <Text style={[styles.filterText, selectedLevel === level && styles.filterTextActive]}>
                {LEVEL_LABELS[level]} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {hasResults ? (
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {grouped.map((group, groupIndex) => (
            <View key={group.level} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.levelIndicator, { backgroundColor: LEVEL_COLORS[group.level] }]} />
                <Text style={styles.groupTitle}>{LEVEL_LABELS[group.level]}</Text>
                <Badge label={`${group.items.length}`} variant="muted" size="small" />
              </View>

              <View style={styles.groupItems}>
                {group.items.map((item, itemIndex) => (
                  <View key={item.id}>
                    <TouchableOpacity
                      style={styles.contentCard}
                      onPress={() => navigation.navigate('EstudoConteudo', { contentId: item.id })}
                      activeOpacity={0.75}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <MaterialCommunityIcons
                          name={item.type === ContentType.VIDEO ? 'play-circle-outline' : 'file-document-outline'}
                          size={20}
                          color={COLORS.accent}
                        />
                      </View>

                      <Text style={styles.cardCategory}>{item.category}</Text>
                      <Text style={styles.cardDescription} numberOfLines={2}>
                        {item.description}
                      </Text>

                      <View style={styles.cardFooter}>
                        <Badge
                          label={item.type === ContentType.VIDEO ? 'Vídeo' : 'Artigo'}
                          size="small"
                          variant={item.type === ContentType.VIDEO ? 'accent' : 'default'}
                        />
                      </View>
                    </TouchableOpacity>

                    {itemIndex < group.items.length - 1 && <Divider style={{ marginVertical: 0 }} />}
                  </View>
                ))}
              </View>

              {groupIndex < grouped.length - 1 && <View style={styles.groupDivider} />}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState title="Nenhum resultado" description="Tente ajustar sua busca ou filtros" />
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
  contentContainer: { flex: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  group: { marginBottom: SPACING.xl, gap: SPACING.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 2, borderBottomColor: COLORS.border },
  levelIndicator: { width: 4, height: 24, borderRadius: 2 },
  groupTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  groupItems: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  contentCard: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, gap: SPACING.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.xs },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  cardCategory: { fontSize: 12, fontWeight: '500', color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardDescription: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  cardFooter: { marginTop: SPACING.sm },
  groupDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
