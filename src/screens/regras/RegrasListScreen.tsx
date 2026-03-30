import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import regrasITTF from '@/constants/conteudo/regras_ittf.json';

type Props = NativeStackScreenProps<any, 'RegrasList'>;

export default function RegrasListScreen() {
  const categories = Object.entries(regrasITTF.categories);

  return (
    <ScrollView style={styles.container}>
      {categories.map(([key, category]: any) => (
        <View key={key} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          {category.rules.map((rule: any) => (
            <View key={rule.id} style={styles.ruleItem}>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleDescription}>{rule.description}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  categorySection: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  ruleItem: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
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

