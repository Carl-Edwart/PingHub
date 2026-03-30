// Configurações padronizadas para partidas de tênis de mesa

export const POINT_OPTIONS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21] as const;
export type PointOption = typeof POINT_OPTIONS[number];

export const SET_OPTIONS = [1, 3, 5, 7] as const;
export type SetOption = typeof SET_OPTIONS[number];

export const ELO_K_MATCH = 32;
export const ELO_K_TOURNAMENT = 16;
export const ELO_INITIAL = 1000;

export const DEFAULT_MATCH_CONFIG = {
  pointsPerSet: 11,
  numberOfSets: 3,
  timeLimit: undefined,
} as const;
