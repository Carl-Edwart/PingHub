import { useEffect, useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

interface UseAtletaSelectorReturn {
  selectedAthlete: { id: string; name: string } | null;
  isLoading: boolean;
  selectAthlete: () => void;
  clearSelection: () => void;
}

/**
 * Hook para fluxo de seleção de atleta
 * Navega para AtletasStack em modo seleção e retorna o athleteId selecionado
 * 
 * Uso:
 * const { selectedAthlete, selectAthlete } = useAtletaSelector();
 * 
 * <Button onPress={selectAthlete} title="Selecionar Jogador" />
 * {selectedAthlete && <Text>{selectedAthlete.name}</Text>}
 */
export function useAtletaSelector(): UseAtletaSelectorReturn {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [selectedAthlete, setSelectedAthlete] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Listener para retorno de navegação (quando atleta é selecionado em AtletasStack)
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', () => {
        // Opcional: fazer algo antes de sair da tela
      });

      return unsubscribe;
    }, [navigation])
  );

  const selectAthlete = useCallback(() => {
    setIsLoading(true);

    // Navegar para AtletasStack com modo de seleção
    // O parâmetro 'mode' indica que estamos em modo seleção
    navigation.navigate('Atletas', {
      screen: 'AtletasList',
      params: {
        mode: 'select',
        onSelect: (athlete: { id: string; name: string }) => {
          setSelectedAthlete(athlete);
          setIsLoading(false);
          // Voltar automaticamente para tela anterior
          navigation.goBack();
        },
      },
    });
  }, [navigation]);

  const clearSelection = useCallback(() => {
    setSelectedAthlete(null);
  }, []);

  return {
    selectedAthlete,
    isLoading,
    selectAthlete,
    clearSelection,
  };
}
