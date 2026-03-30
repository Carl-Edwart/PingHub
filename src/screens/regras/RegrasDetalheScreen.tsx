import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import regrasITTF from '@/constants/conteudo/regras_ittf.json';

type Props = NativeStackScreenProps<any, 'RegrasDetalhe'>;

export default function RegrasDetalheScreen({ route }: Props) {
  const { regraId } = route.params;

  // Encontra a regra nos dados
  let regraContent = { title: 'Regra não encontrada', description: 'A regra solicitada não existe' };
  
  Object.values(regrasITTF.categories).forEach((category: any) => {
    const regra = category.rules.find((r: any) => r.id === regraId);
    if (regra) {
      regraContent = regra;
    }
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{regraContent.title}</Text>
        <Text style={styles.description}>{regraContent.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 24,
  },
});

