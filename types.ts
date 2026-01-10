
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
  matchNumber?: number; // Số thứ tự trận đấu (1, 2, 3...)
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
  court?: string;
  scheduledTime?: string;
}

export type AppView = 'SETUP' | 'DRAW' | 'BRACKET' | 'DASHBOARD';

export interface EventCategory {
  id: string;
  name: string;
  eventType: EventType;
  players: Player[];
  teams: Team[];
  matches: Match[];
  isDrawDone: boolean;
  hasThirdPlaceMatch: boolean;
}

export interface TournamentState {
  id: string;
  tournamentName: string;
  venue?: string;
  date?: string;
  organizer?: string;
  googleSheetId?: string;
  linkedSpreadsheetUrl?: string;
  categories: EventCategory[];
  activeCategoryId: string;
  view: AppView;
  clubProtection: boolean;
  lastUpdated?: number;
  courtCount?: number;
  matchDuration?: number; // minutes
  startTime?: string; // HH:mm
}

export interface TournamentMetadata {
  id: string;
  name: string;
  date: string;
  venue: string;
  playerCount: number;
  lastUpdated: number;
  isCloudLinked: boolean;
}
