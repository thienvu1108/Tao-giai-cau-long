
export enum EventType {
  SINGLES = 'SINGLES',
  DOUBLES = 'DOUBLES'
}

export type RoundKey = 'PLAYIN' | 'R128' | 'R64' | 'R32' | 'R16' | 'QF' | 'SF' | 'F' | '3RD';
export type Side = 'LEFT' | 'RIGHT' | 'NONE';
export type SourceType = 'PAIR' | 'WINNER_OF' | 'BYE';

export interface MatchSource {
  type: SourceType;
  pairId?: string;
  matchId?: string;
}

export interface Player {
  id: string;
  name: string;
  club: string;
  code: string;
}

export interface Team {
  id: string;
  teamCode: string;
  players: Player[];
  club: string;
  seed?: number;
}

export interface Match {
  id: string;
  roundKey: RoundKey;
  roundIndex: number;
  side: Side;
  slotA: MatchSource | null;
  slotB: MatchSource | null;
  teamA?: Team | null;
  teamB?: Team | null;
  scoreA?: number;
  scoreB?: number;
  winner?: Team | null;
  next?: {
    matchId: string;
    targetSlot: 'A' | 'B';
  };
  nextLoser?: {
    matchId: string;
    targetSlot: 'A' | 'B';
  };
  position: number;
}

export type AppView = 'SETUP' | 'DRAW' | 'BRACKET';

export interface EventCategory {
  id: string;
  name: string;
  eventType: EventType;
  players: Player[];
  teams: Team[];
  matches: Match[];
  isDrawDone: boolean;
}

export interface TournamentState {
  tournamentName: string;
  venue?: string;
  date?: string;
  organizer?: string;
  googleSheetId?: string; // Web App URL
  linkedSpreadsheetUrl?: string; // Link to the actual generated Google Sheet
  categories: EventCategory[];
  activeCategoryId: string;
  view: AppView;
  clubProtection: boolean;
}
