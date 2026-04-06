import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Badge, Button, Divider } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { Rule } from '@/types/content';

type Props = NativeStackScreenProps<any, 'RegrasDetalhe'>;

const MOCK_RULES: Record<string, Rule> = {
  'ittf_1': {
    id: 'ittf_1',
    title: 'Serviço Válido',
    category: 'Serviço',
    content: 'O serviço deve ser realizado colocando a bola livremente sobre a palma da mão aberta, mantendo a bola acima da altura da mesa e atrás da linha de fundo. A bola deve ser lançada verticalmente para cima, sem efeito, para uma altura mínima de 16cm.',
    source: 'ittf',
    relatedRules: ['ittf_2'],
  },
  'ittf_2': {
    id: 'ittf_2',
    title: 'Altura de Rebatida',
    category: 'Pontuação',
    content: 'A bola deve passar acima da rede durante todos os rebatidas, sendo que a altura mínima é de 15,25cm. Se a bola tocar a rede mas passar para o lado adversário, é considerado um bom golpe.',
    source: 'ittf',
    relatedRules: ['ittf_1'],
  },
  'local_1': {
    id: 'local_1',
    title: 'Reserva de Mesas',
    category: 'Uso da Mesa',
    content: 'As mesas devem ser reservadas com mínimo 1 hora de antecedência através do sistema de agendamento. Reservas com mais de 3 horas de antecedência têm prioridade.',
    source: 'local',
  },
  'local_2': {
    id: 'local_2',
    title: 'Limpeza Obrigatória',
    category: 'Uso da Mesa',
    content: 'Todo usuário é responsável por limpar a mesa após o uso. Fornecer kit de limpeza disponível na sala. Falha em limpar resultará em suspensão de acesso por 7 dias.',
    source: 'local',
  },
};

export default function RegrasDetalheScreen({ route, navigation }: Props) {
  const { ruleId } = route.params as { ruleId: string };

  const rule = useMemo(() => MOCK_RULES[ruleId], [ruleId]);

  if (!rule) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Regra não encontrada</Text>
      </View>
    );
  }

  const sourceIcon = rule.source === 'ittf' ? 'book-open-page-variant' : 'home-outline';
  const sourceLabel = rule.source === 'ittf' ? 'Regra ITTF' : 'Regra Local';
  const sourceColor = rule.source === 'ittf' ? COLORS.accent : COLORS.success;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Header ────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <MaterialCommunityIcons
            name={sourceIcon}
            size={40}
            color={sourceColor}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={3}>
              {rule.title}
            </Text>
            <Badge
              label={sourceLabel}
              size="small"
              variant={rule.source === 'ittf' ? 'accent' : 'muted'}
            />
          </View>
        </View>
      </View>

      <Divider />

      {/* ── Meta Info ─────────────────────────────────── */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Categoria:</Text>
          <Text style={styles.metaValue}>{rule.category}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fonte:</Text>
          <Text style={styles.metaValue}>{sourceLabel}</Text>
        </View>
      </View>

      <Divider style={{ marginVertical: SPACING.lg }} />

      {/* ── Full Content ──────────────────────────────── */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Descrição Completa</Text>
        <Text style={styles.contentText}>{rule.content}</Text>
      </View>

      {/* ── Important Notes ───────────────────────────── */}
      <View style={styles.notesSection}>
        <View style={styles.noteRow}>
          <MaterialCommunityIcons
            name="lightbulb-on"
            size={20}
            color={COLORS.accent}
          />
          <Text style={styles.noteText}>
            Esta regra é fundamental para o jogo justo e deve ser entendida por todos os
            participantes.
          </Text>
        </View>
      </View>

      {/* ── Related Rules ─────────────────────────────── */}
      {rule.relatedRules && rule.relatedRules.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.sectionTitle}>Regras Relacionadas</Text>

          {rule.relatedRules.map((relatedId) => {
            const relatedRule = MOCK_RULES[relatedId];
            if (!relatedRule) return null;

            return (
              <TouchableOpacity
                key={relatedId}
                style={styles.relatedCard}
                onPress={() =>
                  navigation.push('RegrasDetalhe', { ruleId: relatedId })
                }
              >
                <View style={styles.relatedContent}>
                  <Text style={styles.relatedTitle}>{relatedRule.title}</Text>
                  <Text style={styles.relatedCategory}>{relatedRule.category}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Share Button ──────────────────────────────── */}
      <View style={styles.actionContainer}>
        <Button variant="ghost" size="medium">
          <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.primary} />
          <Text>Compartilhar</Text>
        </Button>
      </View>
    </ScrollView>
  );
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
  contentText: { fontSize: 14, lineHeight: 22, color: COLORS.text },
  notesSection: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, gap: SPACING.md },
  noteText: { flex: 1, fontSize: 13, lineHeight: 20, color: COLORS.text },
  relatedSection: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.md },
  relatedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, gap: SPACING.md },
  relatedContent: { flex: 1, gap: SPACING.xs },
  relatedTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  relatedCategory: { fontSize: 11, color: COLORS.textMuted },
  actionContainer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.lg },
});

