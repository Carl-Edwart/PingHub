export enum MatchMode {
  COMPETITIVE = 'competitive',
  COOPERATIVE = 'cooperative',
}

export enum Modality {
  SINGLES = 'singles',
  DOUBLES = 'doubles',
}

export interface Player {
  athleteId?: string;
  name: string;
}

export interface SetResult {
  player1Score: number;
  player2Score: number;
}

export interface MatchConfig {
  pointsPerSet: number;
  numberOfSets: number;
  mode: MatchMode;
  modality: Modality;
  timeLimit?: number;
}

export interface Match {
  id: string;
  player1: Player;
  player2: Player;
  setsConfig: MatchConfig;
  sets: SetResult[];
  mode: MatchMode;
  duration: number;
  createdAt: string;
}

export interface MatchResult {
  matchId: string;
  winner: Player;
  loser: Player;
  score: string;
  eloChange?: {
    winner: number;
    loser: number;
  };
}
