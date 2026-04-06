import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar, Badge, Button, EmptyState } from "@/components";
import { BORDER_RADIUS, COLORS, SPACING } from "@/constants/theme";
import { AthleteRepository } from "@/database/repositories/athleteRepository";
import { RankingRepository } from "@/database/repositories/rankingRepository";
import { useAtletasStore } from "@/store/useAtletasStore";
import { Athlete } from "@/types/athlete";

type Props = NativeStackScreenProps<any, "AtletasList">;

interface AtletaListItem extends Athlete {
  rankPosition?: number;
  wins: number;
  losses: number;
}

export default function AtletasListScreen({ navigation, route }: Props) {
  const { atletas, setAtletas } = useAtletasStore();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [rankData, setRankData] = useState<
    Record<string, { position: number; wins: number; losses: number }>
  >({});

  // Modo seleção: chamado por PartidaConfig ou TorneioCreate
  const isSelectMode = route.params?.mode === "select";
  const onSelect: ((a: { id: string; name: string }) => void) | undefined =
    route.params?.onSelect;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await AthleteRepository.getAll();
      setAtletas(data);

      const rankings = await RankingRepository.getRanking();
      const map: Record<
        string,
        { position: number; wins: number; losses: number }
      > = {};
      rankings.forEach((r) => {
        map[r.athleteId] = {
          position: r.position,
          wins: r.wins,
          losses: r.losses,
        };
      });
      setRankData(map);
    } catch (err) {
      console.error("Erro ao carregar atletas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered: AtletaListItem[] = atletas
    .filter((a) => {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.nickname ?? "").toLowerCase().includes(q)
      );
    })
    .map((a) => ({
      ...a,
      rankPosition: rankData[a.id]?.position,
      wins: rankData[a.id]?.wins ?? 0,
      losses: rankData[a.id]?.losses ?? 0,
    }))
    .sort((a, b) => (a.rankPosition ?? 9999) - (b.rankPosition ?? 9999));

  const handlePress = (item: AtletaListItem) => {
    if (isSelectMode && onSelect) {
      onSelect({ id: item.id, name: item.nickname ?? item.name });
      return;
    }
    navigation.navigate("AtletaPerfil", { atletaId: item.id });
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
    };
    return labels[level] ?? level;
  };

  const getLevelVariant = (level: string): "muted" | "default" | "accent" => {
    if (level === "advanced") return "accent";
    if (level === "intermediate") return "default";
    return "muted";
  };

  const getRankColor = (position?: number): string => {
    if (position === 1) return "#F5C518";
    if (position === 2) return "#C0C0C0";
    if (position === 3) return "#CD7F32";
    return COLORS.textMuted;
  };

  const renderItem = ({ item }: { item: AtletaListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePress(item)}
      activeOpacity={0.75}
    >
      {/* Posição */}
      <View style={styles.rankBadge}>
        <Text
          style={[
            styles.rankNumber,
            { color: getRankColor(item.rankPosition) },
          ]}
        >
          {item.rankPosition ? `#${item.rankPosition}` : "—"}
        </Text>
      </View>

      {/* Avatar */}
      <Avatar name={item.name} source={item.photoUri} size="medium" />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {item.nickname ? (
          <Text style={styles.nickname} numberOfLines={1}>
            "{item.nickname}"
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Badge
            label={getLevelLabel(item.level)}
            variant={getLevelVariant(item.level)}
            size="small"
          />
          <Text style={styles.record}>
            {item.wins}V · {item.losses}D
          </Text>
        </View>
      </View>

      {/* ELO */}
      <View style={styles.eloBlock}>
        <Text style={styles.eloValue}>{item.elo}</Text>
        <Text style={styles.eloLabel}>ELO</Text>
      </View>

      {isSelectMode && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={COLORS.accent}
          style={{ marginLeft: SPACING.xs }}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Campo de busca */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={COLORS.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar atleta..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Header com contagem e botão novo (fora do modo seleção) */}
      {!isSelectMode && (
        <View style={styles.listHeader}>
          <Text style={styles.countText}>
            {filtered.length} {filtered.length === 1 ? "atleta" : "atletas"}
          </Text>
          <Button
            variant="primary"
            size="small"
            onPress={() => navigation.navigate("AtletaForm")}
          >
            + Novo atleta
          </Button>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏓"
          title={search ? "Nenhum resultado" : "Sem atletas cadastrados"}
          description={
            search
              ? `Nenhum atleta encontrado para "${search}"`
              : "Cadastre o primeiro atleta para iniciar o ranking"
          }
          actionButton={
            !isSelectMode && !search ? (
              <Button
                variant="primary"
                size="medium"
                onPress={() => navigation.navigate("AtletaForm")}
              >
                Cadastrar primeiro atleta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
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

  // ── Busca ─────────────────────────────────────────────
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // ── Header da lista ───────────────────────────────────
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  countText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textMuted,
  },

  // ── FlatList ──────────────────────────────────────────
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // ── Card ──────────────────────────────────────────────
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  rankBadge: {
    width: 28,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  nickname: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 2,
  },
  record: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },

  // ── ELO ──────────────────────────────────────────────
  eloBlock: {
    alignItems: "center",
    minWidth: 48,
  },
  eloValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  eloLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Estados ───────────────────────────────────────────
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
