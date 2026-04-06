import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Button, Card, Input } from "@/components";
import { ELO_INITIAL } from "@/constants/matchConfig";
import { BORDER_RADIUS, COLORS, SPACING } from "@/constants/theme";
import { AthleteRepository } from "@/database/repositories/athleteRepository";
import { RankingRepository } from "@/database/repositories/rankingRepository";
import { useAtletasStore } from "@/store/useAtletasStore";
import { useRankingStore } from "@/store/useRankingStore";
import { AthleteLevel, PlayStyle } from "@/types/athlete";
import { isValidName } from "@/utils/validators";

type Props = NativeStackScreenProps<any, "AtletaForm">;

// Opções de nível exibidas na tela
const LEVEL_OPTIONS: {
  value: AthleteLevel;
  label: string;
  description: string;
}[] = [
  {
    value: AthleteLevel.BEGINNER,
    label: "Iniciante",
    description: "Aprendendo as regras",
  },
  {
    value: AthleteLevel.INTERMEDIATE,
    label: "Intermediário",
    description: "Joga com regularidade",
  },
  {
    value: AthleteLevel.ADVANCED,
    label: "Avançado",
    description: "Alto nível técnico",
  },
];

// Opções de estilo de jogo
const STYLE_OPTIONS: { value: PlayStyle; label: string; icon: string }[] = [
  { value: PlayStyle.ATTACK, label: "Ataque", icon: "sword" },
  { value: PlayStyle.DEFENSE, label: "Defesa", icon: "shield" },
  { value: PlayStyle.ALL_ROUND, label: "All-round", icon: "sync" },
];

export default function AtletaFormScreen({ route, navigation }: Props) {
  const atletaId: string | undefined = route.params?.atletaId;
  const isEditing = !!atletaId;

  const { addAthlete, updateAthlete } = useAtletasStore();
  const { updateElo } = useRankingStore();

  // Campos do formulário
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [level, setLevel] = useState<AthleteLevel>(AthleteLevel.BEGINNER);
  const [playStyle, setPlayStyle] = useState<PlayStyle>(PlayStyle.ALL_ROUND);

  // Estado de UI
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [loading, setLoading] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  // Carrega dados do atleta se estiver editando
  useEffect(() => {
    if (isEditing) {
      loadAtleta();
    }
  }, [atletaId]);

  const loadAtleta = async () => {
    try {
      const data = await AthleteRepository.getById(atletaId!);
      if (!data) return;
      setName(data.name);
      setNickname(data.nickname ?? "");
      setPhotoUri(data.photoUri);
      setLevel(data.level);
      setPlayStyle(data.playStyle);
    } catch (err) {
      console.error("Erro ao carregar atleta:", err);
    }
  };

  // Abre o seletor de imagem do dispositivo
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "Autorize o acesso à galeria nas configurações do dispositivo.",
      );
      return;
    }

    setLoadingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert("Remover foto", "Deseja remover a foto deste atleta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => setPhotoUri(undefined),
      },
    ]);
  };

  // Validação e submit
  const handleSave = async () => {
    const nameValidation = isValidName(name.trim());
    if (!nameValidation.isValid) {
      setErrors({ name: nameValidation.message });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      if (isEditing) {
        // Atualiza campos editáveis (ELO é imutável via form)
        const updated = await AthleteRepository.update(atletaId!, {
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          photoUri,
          level,
          playStyle,
        });
        updateAthlete(atletaId!, updated);
        navigation.goBack();
      } else {
        // Cria novo atleta com ELO inicial
        const newAthlete = await AthleteRepository.create({
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          photoUri,
          level,
          playStyle,
          elo: ELO_INITIAL,
        });

        // Cria entrada no ranking
        await RankingRepository.updateElo(newAthlete.id, ELO_INITIAL, 0);
        updateElo(newAthlete.id, ELO_INITIAL, 0);
        addAthlete(newAthlete);
        navigation.goBack();
      }
    } catch (err) {
      console.error("Erro ao salvar atleta:", err);
      Alert.alert("Erro", "Não foi possível salvar o atleta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Foto de perfil ─────────────────────────────── */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoTouchable}
            onPress={photoUri ? handleRemovePhoto : handlePickPhoto}
            disabled={loadingPhoto}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
                <View style={styles.photoOverlay}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color="#FFF"
                  />
                </View>
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons
                  name="camera-plus"
                  size={32}
                  color={COLORS.accent}
                />
                <Text style={styles.photoHint}>Adicionar foto</Text>
              </View>
            )}
          </TouchableOpacity>
          {photoUri && (
            <TouchableOpacity
              onPress={handlePickPhoto}
              style={styles.changePhotoLink}
            >
              <Text style={styles.changePhotoText}>Trocar foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Dados pessoais ─────────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>

          <Input
            label="Nome completo *"
            placeholder="Ex: João da Silva"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors({});
            }}
            error={errors.name}
            size="medium"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Input
            label="Apelido (opcional)"
            placeholder="Ex: Bolinha"
            value={nickname}
            onChangeText={setNickname}
            size="medium"
            autoCapitalize="words"
            returnKeyType="done"
            containerStyle={{ marginTop: SPACING.md }}
          />
        </Card>

        {/* ── Nível ──────────────────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Nível</Text>
          <View style={styles.optionGroup}>
            {LEVEL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionCard,
                  level === opt.value && styles.optionCardActive,
                ]}
                onPress={() => setLevel(opt.value)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    level === opt.value && styles.optionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Estilo de jogo ─────────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Estilo de jogo</Text>
          <View style={styles.styleRow}>
            {STYLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.styleChip,
                  playStyle === opt.value && styles.styleChipActive,
                ]}
                onPress={() => setPlayStyle(opt.value)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={18}
                  color={
                    playStyle === opt.value ? COLORS.primary : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.styleChipLabel,
                    playStyle === opt.value && styles.styleChipLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── ELO informativo (só na edição) ─────────────── */}
        {isEditing && (
          <View style={styles.eloInfo}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={COLORS.textMuted}
            />
            <Text style={styles.eloInfoText}>
              O ELO é calculado automaticamente pelas partidas e torneios.
            </Text>
          </View>
        )}

        {/* ── Ações ──────────────────────────────────────── */}
        <View style={styles.actions}>
          <Button
            variant="secondary"
            size="medium"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="medium"
            loading={loading}
            onPress={handleSave}
            style={{ flex: 1 }}
          >
            {isEditing ? "Salvar alterações" : "Criar atleta"}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PHOTO_SIZE = 96;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // ── Foto ──────────────────────────────────────────────
  photoSection: {
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  photoTouchable: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    overflow: "hidden",
  },
  photoImage: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.xs,
  },
  photoHint: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.accent,
  },
  changePhotoLink: {
    marginTop: SPACING.sm,
  },
  changePhotoText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: "500",
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

  // ── Nível ─────────────────────────────────────────────
  optionGroup: {
    gap: SPACING.sm,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
  },
  optionCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  optionLabelActive: {
    color: COLORS.primary,
  },
  optionDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // ── Estilo de jogo ────────────────────────────────────
  styleRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  styleChip: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  styleChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  styleChipLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  styleChipLabelActive: {
    color: COLORS.primary,
  },

  // ── ELO info ──────────────────────────────────────────
  eloInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  eloInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // ── Ações ─────────────────────────────────────────────
  actions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
});
