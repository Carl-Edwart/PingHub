import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Badge, Button, Divider } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useEstudoStore } from '@/store/useEstudoStore';
import { ContentLevel, ContentType, TechniqueContent } from '@/types/content';
import * as WebBrowser from 'expo-web-browser';

type Props = NativeStackScreenProps<any, 'EstudoConteudo'>;

const MOCK_TECHNIQUES: Record<string, TechniqueContent> = {
  '1': {
    id: '1',
    title: 'Agarre Básico',
    level: ContentLevel.BEGINNER,
    category: 'Fundamentos',
    description: 'Aprenda o agarre correto da raquete para iniciantes',
    url: 'https://youtube.com/watch?v=example',
    type: ContentType.VIDEO,
  },
  '2': {
    id: '2',
    title: 'Drive Ofensivo',
    level: ContentLevel.INTERMEDIATE,
    category: 'Ataque',
    description: 'Técnica de drive para armadores',
    url: 'https://youtube.com/watch?v=example',
    type: ContentType.VIDEO,
  },
  '3': {
    id: '3',
    title: 'Loop Agressivo',
    level: ContentLevel.ADVANCED,
    category: 'Ataque',
    description: 'Golpe de loop com topspin máximo',
    url: 'https://youtube.com/watch?v=example',
    type: ContentType.VIDEO,
  },
};

export default function EstudoConteudoScreen({ route, navigation }: Props) {
  const { contentId } = route.params as { contentId: string };
  const { markAsViewed } = useEstudoStore();

  const content = useMemo(() => MOCK_TECHNIQUES[contentId], [contentId]);

  React.useEffect(() => {
    if (content) {
      markAsViewed(contentId);
    }
  }, [contentId]);

  const handleOpenLink = async () => {
    if (content?.url) {
      await WebBrowser.openBrowserAsync(content.url);
    }
  };

  if (!content) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Conteúdo não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Header ────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <MaterialCommunityIcons
            name={content.type === 'video' ? 'play-circle' : 'file-document'}
            size={40}
            color={COLORS.accent}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={3}>
              {content.title}
            </Text>
            <Badge label={content.category} size="small" variant="muted" />
          </View>
        </View>
      </View>

      <Divider />

      {/* ── Meta Info ─────────────────────────────────── */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Nível:</Text>
          <Text style={styles.metaValue}>{getLevelLabel(content.level)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tipo:</Text>
          <Text style={styles.metaValue}>{content.type === 'video' ? 'Vídeo' : 'Artigo'}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Categoria:</Text>
          <Text style={styles.metaValue}>{content.category}</Text>
        </View>
      </View>

      <Divider style={{ marginVertical: SPACING.lg }} />

      {/* ── Description ───────────────────────────────── */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Descrição</Text>
        <Text style={styles.description}>{content.description}</Text>
      </View>

      {/* ── Full Content ──────────────────────────────── */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Conteúdo Completo</Text>
        <Text style={styles.contentText}>
          Este é um exemplo de conteúdo técnico. Em produção, este campo conteria a descrição
          completa da técnica, instruções passo a passo, dicas de treinamento e recomendações
          para melhores resultados.
        </Text>
      </View>

      {/* ── Related Resources ─────────────────────────── */}
      <View style={styles.resourcesContainer}>
        <Text style={styles.sectionTitle}>Recursos Adicionais</Text>

        <TouchableOpacity style={styles.resourceCard} onPress={handleOpenLink}>
          <View style={styles.resourceHeader}>
            <MaterialCommunityIcons
              name={content.type === 'video' ? 'youtube' : 'link'}
              size={24}
              color={COLORS.accent}
            />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>
                {content.type === 'video' ? 'Assista no YouTube' : 'Leia o Artigo'}
              </Text>
              <Text style={styles.resourceDescription}>
                {content.type === 'video'
                  ? 'Vídeo no canal oficial de tênis de mesa'
                  : 'Artigo completo com referências'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Action Button ─────────────────────────────── */}
      <View style={styles.actionContainer}>
        <Button variant="primary" size="medium" onPress={handleOpenLink}>
          {content.type === 'video' ? 'Assistir Vídeo' : 'Ler Artigo Completo'}
        </Button>
      </View>
    </ScrollView>
  );
}

function getLevelLabel(level: ContentLevel): string {
  const labels: Record<ContentLevel, string> = {
    [ContentLevel.BEGINNER]: 'Iniciante',
    [ContentLevel.INTERMEDIATE]: 'Intermediário',
    [ContentLevel.ADVANCED]: 'Avançado',
  };
  return labels[level];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  errorText: { fontSize: 16, color: COLORS.danger, textAlign: 'center', marginTop: 40 },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.md },
  headerTop: { flexDirection: 'row', gap: SPACING.md },
  headerInfo: { flex: 1, gap: SPACING.sm, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  metaContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.md },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  metaValue: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  contentSection: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontSize: 14, lineHeight: 22, color: COLORS.text },
  contentText: { fontSize: 14, lineHeight: 22, color: COLORS.textMuted },
  resourcesContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.md },
  resourceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, gap: SPACING.md },
  resourceHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  resourceInfo: { flex: 1, gap: SPACING.xs },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  resourceDescription: { fontSize: 12, color: COLORS.textMuted },
  actionContainer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.lg },
});
