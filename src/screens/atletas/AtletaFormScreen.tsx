import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { Input, Button, Card } from '@/components';

type Props = NativeStackScreenProps<any, 'AtletaForm'>;

interface FormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
}

export default function AtletaFormScreen({ route, navigation }: Props) {
  const atletaId = route.params?.atletaId;
  const isEditing = !!atletaId;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      // Aqui carregaria dados do atleta
      loadAtletaData();
    }
  }, [isEditing, atletaId]);

  const loadAtletaData = async () => {
    // Mock: carregar dados do atleta
    setFormData({
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '(11) 99999-9999',
      birthDate: '1990-05-15',
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter no mínimo 2 caracteres';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Aqui faria a chamada para salvar
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Seção de informações básicas */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>

          <Input
            label="Nome Completo"
            placeholder="Ex: João da Silva"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            error={errors.name}
            size="medium"
            style={styles.input}
          />

          <Input
            label="Email"
            placeholder="joao@example.com"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            error={errors.email}
            keyboardType="email-address"
            size="medium"
            style={styles.input}
          />
        </Card>

        {/* Seção de contato */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contato</Text>

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            size="medium"
            style={styles.input}
          />

          <Input
            label="Data de Nascimento"
            placeholder="DD/MM/YYYY"
            value={formData.birthDate}
            onChangeText={(text) => setFormData({ ...formData, birthDate: text })}
            size="medium"
          />
        </Card>

        {/* Botões de ação */}
        <View style={styles.actions}>
          <Button
            label="Cancelar"
            variant="ghost"
            size="medium"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          />

          <Button
            label={isEditing ? 'Atualizar' : 'Criar'}
            variant="primary"
            size="medium"
            onPress={handleSave}
            loading={loading}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  input: {
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
  },
});

