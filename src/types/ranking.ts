export interface RankingEntry {
  athleteId: string;
  name: string;
  photoUri?: string;
  elo: number;
  wins: number;
  losses: number;
  tournamentsWon?: number;
  position: number;
  eloChange: number;
  lastUpdated: string;
}

export interface EloResult {
  newRatingA: number;
  newRatingB: number;
  deltaA: number;
  deltaB: number;
}

export interface RankingUpdate {
  athleteId: string;
  eloChange: number;
  newElo: number;
  timestamp: string;
}

export interface EloHistory {
  athleteId: string;
  entries: Array<{
    date: string;
    elo: number;
    change: number;
    matchId?: string;
  }>;
}
