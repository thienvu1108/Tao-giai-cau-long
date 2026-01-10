
export enum EventType {
  SINGLES = 'SINGLES',
  DOUBLES = 'DOUBLES'
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  GROUP_STAGE_ELIMINATION = 'GROUP_STAGE_ELIMINATION'
}

export type RoundKey = 'PLAYIN' | 'R128' | 'R64' | 'R32' | 'R16' | 'QF' | 'SF' | 'F' | '3RD' | 'GROUP';
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
  matchNumber?: number;
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
  groupId?: string; // Liên kết với bảng đấu nếu có
}

export interface TeamStats {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  diff: number; // Hiệu số điểm (nếu cần)
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
  matches: Match[];
  rankings: TeamStats[];
}

export type AppView = 'SETUP' | 'DRAW' | 'BRACKET' | 'DASHBOARD' | 'VIEWER' | 'GROUP_STAGE';

export interface EventCategory {
  id: string;
  name: string;
  eventType: EventType;
  format: TournamentFormat;
  players: Player[];
  teams: Team[];
  matches: Match[];
  groups: Group[];
  isDrawDone: boolean;
  hasThirdPlaceMatch: boolean;
  teamsPerGroup: number;
  advancePerGroup: number;
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
  matchDuration?: number;
  startTime?: string;
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
