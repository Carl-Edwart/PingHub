export enum AthleteLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum PlayStyle {
  ATTACK = 'attack',
  DEFENSE = 'defense',
  ALL_ROUND = 'all_round',
}

export interface Athlete {
  id: string;
  name: string;
  nickname?: string;
  photoUri?: string;
  level: AthleteLevel;
  playStyle: PlayStyle;
  elo: number;
  createdAt: string;
}

export interface AthleteStats {
  athleteId: string;
  wins: number;
  losses: number;
  tournamentsWon: number;
  eloChange?: number;
}

export interface AthleteProfile extends Athlete, AthleteStats {
  winRate: number;
  recentMatches?: Array<{
    matchId: string;
    opponent: string;
    result: 'W' | 'L';
    eloChange: number;
    date: string;
  }>;
  tournaments?: string[];
}
