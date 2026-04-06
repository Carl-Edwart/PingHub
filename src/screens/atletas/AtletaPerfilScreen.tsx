import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge, Button, Divider, Loader } from "@/components";
import { BORDER_RADIUS, COLORS, SPACING } from "@/constants/theme";
import { AthleteRepository } from "@/database/repositories/athleteRepository";
import { MatchRepository } from "@/database/repositories/matchRepository";
import { RankingRepository } from "@/database/repositories/rankingRepository";
import { useAtletasStore } from "@/store/useAtletasStore";
import { useRankingStore } from "@/store/useRankingStore";
import { Athlete, AthleteLevel, PlayStyle } from "@/types/athlete";
import { Match } from "@/types/match";
import { RankingEntry } from "@/types/ranking";
import { formatDate, formatElo } from "@/utils/formatters";

type Props = NativeStackScreenProps<any, "AtletaPerfil">;

// Dados completos da tela
interface PerfilData {
  atleta: Athlete;
  ranking: RankingEntry | null;
  recentMatches: Match[];
}

const LEVEL_LABELS: Record<AthleteLevel, string> = {
  [AthleteLevel.BEGINNER]: "Iniciante",
  [AthleteLevel.INTERMEDIATE]: "Intermediário",
  [AthleteLevel.ADVANCED]: "Avançado",
};

const STYLE_LABELS: Record<PlayStyle, string> = {
  [PlayStyle.ATTACK]: "Ataque",
  [PlayStyle.DEFENSE]: "Defesa",
  [PlayStyle.ALL_ROUND]: "All-round",
};

const STYLE_ICONS: Record<PlayStyle, string> = {
  [PlayStyle.ATTACK]: "sword",
  [PlayStyle.DEFENSE]: "shield",
  [PlayStyle.ALL_ROUND]: "sync",
};

export default function AtletaPerfilScreen({ route, navigation }: Props) {
  const { atletaId } = route.params as { atletaId: string };
  const { deleteAthlete } = useAtletasStore();
  const { updateElo } = useRankingStore();

  const [data, setData] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadPerfil();
    }, [atletaId]),
  );

  const loadPerfil = async () => {
    setLoading(true);
    try {
      const [atleta, ranking, recentMatches] = await Promise.all([
        AthleteRepository.getById(atletaId),
        RankingRepository.getByAthleteId(atletaId),
        MatchRepository.getByAthleteId(atletaId, 8),
      ]);

      if (!atleta) {
        navigation.goBack();
        return;
      }

      setData({ atleta, ranking, recentMatches });
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir atleta",
      `Deseja excluir "${data?.atleta.name}" permanentemente? Todos os dados de ranking serão removidos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await AthleteRepository.delete(atletaId);
              deleteAthlete(atletaId);
              navigation.goBack();
            } catch {
              Alert.alert("Erro", "Não foi possível excluir o atleta.");
            }
          },
        },
      ],
    );
  };

  // Calcula resultado de uma partida para este atleta
  const getMatchResult = (
    match: Match,
  ): { result: "V" | "D"; label: string; eloChange?: number } => {
    const isPlayer1 = match.player1.athleteId === atletaId;
    const sets = match.sets;
    const p1 = sets.filter((s) => s.player1Score > s.player2Score).length;
    const p2 = sets.filter((s) => s.player2Score > s.player1Score).length;

    const won = isPlayer1 ? p1 > p2 : p2 > p1;
    const score = isPlayer1 ? `${p1}-${p2}` : `${p2}-${p1}`;

    return { result: won ? "V" : "D", label: score };
  };

  const getOpponentName = (match: Match): string => {
    const isP1 = match.player1.athleteId === atletaId;
    return isP1 ? match.player2.name : match.player1.name;
  };

  const getRankColor = (position?: number | null): string => {
    if (position === 1) return "#F5C518";
    if (position === 2) return "#C0C0C0";
    if (position === 3) return "#CD7F32";
    return COLORS.accent;
  };

  if (loading) return <Loader />;
  if (!data) return null;

  const { atleta, ranking, recentMatches } = data;
  const wins = ranking?.wins ?? 0;
  const losses = ranking?.losses ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: foto + nome + ações ───────────────────── */}
      <View style={styles.heroCard}>
        {/* Foto ou placeholder */}
        {atleta.photoUri ? (
          <Image source={{ uri: atleta.photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoInitials}>
              {atleta.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{atleta.name}</Text>
          {atleta.nickname ? (
            <Text style={styles.heroNickname}>"{atleta.nickname}"</Text>
          ) : null}

          <View style={styles.heroBadges}>
            <Badge
              label={LEVEL_LABELS[atleta.level]}
              variant="default"
              size="small"
            />
            <Badge
              label={STYLE_LABELS[atleta.playStyle]}
              variant="muted"
              size="small"
            />
          </View>
        </View>

        {/* Botão editar no canto */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("AtletaForm", { atletaId })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={18}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── ELO e posição ──────────────────────────────── */}
      <View style={styles.eloRow}>
        <View style={styles.eloCard}>
          <Text
            style={[
              styles.eloValue,
              { color: getRankColor(ranking?.position) },
            ]}
          >
            {atleta.elo}
          </Text>
          <Text style={styles.eloLabel}>ELO atual</Text>
        </View>

        <View style={styles.eloDivider} />

        <View style={styles.eloCard}>
          <Text
            style={[
              styles.eloValue,
              { color: getRankColor(ranking?.position) },
            ]}
          >
            {ranking?.position ? `#${ranking.position}` : "—"}
          </Text>
          <Text style={styles.eloLabel}>Ranking geral</Text>
        </View>

        {ranking?.eloChange !== undefined && ranking.eloChange !== 0 ? (
          <>
            <View style={styles.eloDivider} />
            <View style={styles.eloCard}>
              <Text
                style={[
                  styles.eloValue,
                  {
                    color:
                      ranking.eloChange > 0 ? COLORS.success : COLORS.danger,
                  },
                ]}
              >
                {formatElo(ranking.eloChange)}
              </Text>
              <Text style={styles.eloLabel}>Última partida</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* ── Estatísticas ───────────────────────────────── */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {wins}
          </Text>
          <Text style={styles.statLabel}>Vitórias</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>
            {losses}
          </Text>
          <Text style={styles.statLabel}>Derrotas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>
            {winRate}%
          </Text>
          <Text style={styles.statLabel}>Aproveitamento</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {ranking?.tournamentsWon ?? 0}
          </Text>
          <Text style={styles.statLabel}>Torneios ganhos</Text>
        </View>
      </View>

      {/* ── Histórico recente de partidas ─────────────── */}
      {recentMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partidas recentes</Text>

          <View style={styles.matchList}>
            {recentMatches.map((match, i) => {
              const { result, label } = getMatchResult(match);
              const opponent = getOpponentName(match);
              const isWin = result === "V";

              return (
                <View key={match.id}>
                  <View style={styles.matchRow}>
                    {/* Resultado */}
                    <View
                      style={[
                        styles.resultPill,
                        {
                          backgroundColor: isWin
                            ? COLORS.success
                            : COLORS.danger,
                        },
                      ]}
                    >
                      <Text style={styles.resultText}>{result}</Text>
                    </View>

                    {/* Adversário e data */}
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchOpponent} numberOfLines={1}>
                        vs {opponent}
                      </Text>
                      <Text style={styles.matchDate}>
                        {formatDate(match.createdAt, true)}
                      </Text>
                    </View>

                    {/* Placar */}
                    <Text
                      style={[
                        styles.matchScore,
                        { color: isWin ? COLORS.success : COLORS.danger },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>

                  {i < recentMatches.length - 1 && (
                    <Divider style={{ marginVertical: 0 }} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {recentMatches.length === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partidas recentes</Text>
          <Text style={styles.emptyText}>
            Nenhuma partida registrada ainda.
          </Text>
        </View>
      )}

      {/* ── Ações destrutivas ──────────────────────────── */}
      <View style={styles.dangerZone}>
        <Button variant="danger" size="medium" onPress={handleDelete}>
          Excluir atleta
        </Button>
      </View>
    </ScrollView>
  );
}

const PHOTO_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },

  // ── Hero ──────────────────────────────────────────────
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
  photoPlaceholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitials: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
  },
  heroInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  heroNickname: {
    fontSize: 13,
    fontStyle: "italic",
    color: COLORS.textMuted,
  },
  heroBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },

  // ── ELO row ───────────────────────────────────────────
  eloRow: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  eloCard: {
    flex: 1,
    alignItems: "center",
    gap: SPACING.xs,
  },
  eloValue: {
    fontSize: 26,
    fontWeight: "700",
  },
  eloLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.accentMuted,
    textAlign: "center",
  },
  eloDivider: {
    width: 1,
    backgroundColor: COLORS.primaryMid,
    marginVertical: SPACING.xs,
  },

  // ── Stats grid ────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.textMuted,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // ── Seção genérica ────────────────────────────────────
  section: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: SPACING.xl,
  },

  // ── Partidas ──────────────────────────────────────────
  matchList: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  resultPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  resultText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchOpponent: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  matchDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  matchScore: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Danger zone ───────────────────────────────────────
  dangerZone: {
    marginTop: SPACING.md,
  },
});
