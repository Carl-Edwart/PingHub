import { Player, MatchConfig } from './match';

export enum BracketType {
  SINGLE_ELIMINATION = 'single_elimination',
  ALL_VS_ALL = 'all_vs_all',
}

export enum TournamentStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface TournamentMatch {
  id: string;
  player1: Player;
  player2: Player;
  matchId?: string;
  result?: {
    winner: Player;
    score: string;
  };
  status: 'pending' | 'ongoing' | 'finished';
}

export interface Bracket {
  rounds: {
    roundNumber: number;
    matches: TournamentMatch[];
  }[];
}

export interface AllVsAllTable {
  participants: Player[];
  results: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  bracketType: BracketType;
  participants: Player[];
  bracket?: Bracket;
  table?: AllVsAllTable;
  matchConfig: MatchConfig;
  status: TournamentStatus;
  createdAt: string;
}

export interface TournamentResult {
  tournamentId: string;
  standings: Array<{
    position: number;
    player: Player;
    points: number;
    eloBonus: number;
  }>;
}
