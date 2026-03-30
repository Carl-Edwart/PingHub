import { MatchConfig, MatchMode, Modality } from '@/types/match';
import { POINT_OPTIONS, SET_OPTIONS } from '@/constants/matchConfig';

export interface ValidationError {
  isValid: boolean;
  message?: string;
}

/**
 * Valida nome de atleta
 * Regras: não vazio, mín 2 caracteres, sem números no início
 */
export function isValidName(name: string): ValidationError {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: 'Nome é obrigatório.' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, message: 'Nome deve ter no mínimo 2 caracteres.' };
  }

  if (/^\d/.test(name)) {
    return { isValid: false, message: 'Nome não pode começar com número.' };
  }

  if (name.length > 50) {
    return { isValid: false, message: 'Nome não pode ter mais de 50 caracteres.' };
  }

  return { isValid: true };
}

/**
 * Valida configuração de partida
 */
export function isValidMatchConfig(config: MatchConfig): ValidationError {
  if (!config) {
    return { isValid: false, message: 'Configuração de partida inválida.' };
  }

  if (!Object.values(MatchMode).includes(config.mode)) {
    return { isValid: false, message: 'Modo de partida inválido.' };
  }

  if (!Object.values(Modality).includes(config.modality)) {
    return { isValid: false, message: 'Modalidade inválida.' };
  }

  if (!POINT_OPTIONS.includes(config.pointsPerSet as any)) {
    return { isValid: false, message: `Pontos por set deve ser um de: ${POINT_OPTIONS.join(', ')}` };
  }

  if (!SET_OPTIONS.includes(config.numberOfSets as any)) {
    return { isValid: false, message: `Número de sets deve ser um de: ${SET_OPTIONS.join(', ')}` };
  }

  if (config.timeLimit !== undefined && config.timeLimit <= 0) {
    return { isValid: false, message: 'Limite de tempo deve ser maior que 0.' };
  }

  return { isValid: true };
}

/**
 * Valida nome de torneio
 */
export function isValidTournamentName(name: string): ValidationError {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: 'Nome do torneio é obrigatório.' };
  }

  if (name.trim().length < 3) {
    return { isValid: false, message: 'Nome do torneio deve ter no mínimo 3 caracteres.' };
  }

  if (name.length > 60) {
    return { isValid: false, message: 'Nome do torneio não pode ter mais de 60 caracteres.' };
  }

  return { isValid: true };
}

/**
 * Valida número de participantes do torneio
 */
export function isValidParticipantCount(count: number): ValidationError {
  if (count < 2) {
    return { isValid: false, message: 'Torneio deve ter no mínimo 2 participantes.' };
  }

  if (count > 64) {
    return { isValid: false, message: 'Torneio não pode ter mais de 64 participantes.' };
  }

  return { isValid: true };
}

/**
 * Valida data do torneio
 */
export function isValidTournamentDate(dateString: string): ValidationError {
  try {
    const date = new Date(dateString);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return { isValid: false, message: 'Data inválida.' };
    }

    if (date < now) {
      return { isValid: false, message: 'Data do torneio deve ser no futuro.' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, message: 'Erro ao validar data.' };
  }
}
