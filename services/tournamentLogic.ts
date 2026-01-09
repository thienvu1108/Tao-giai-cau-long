
import { Team, Match, EventType, RoundKey, MatchSource } from '../types';

export const generatePlayerCode = (index: number): string => {
  return `VDV-${String(index + 1).padStart(3, '0')}`;
};

export const generateTeamCode = (index: number, type: EventType): string => {
  const prefix = type === EventType.SINGLES ? 'S' : 'D';
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const createTeams = (players: any[], type: EventType): Team[] => {
  const teams: Team[] = [];
  const step = type === EventType.SINGLES ? 1 : 2;
  for (let i = 0; i < players.length; i += step) {
    const teamPlayers = players.slice(i, i + step);
    if (teamPlayers.length > 0) {
      const index = Math.floor(i / step);
      teams.push({
        id: `team-${Date.now()}-${index}`,
        teamCode: generateTeamCode(index, type),
        players: teamPlayers,
        club: teamPlayers[0].club || 'Tự do',
      });
    }
  }
  return teams;
};

const getRoundLabel = (totalInMain: number, currentRoundIndex: number): RoundKey => {
  const mainRoundsCount = Math.log2(totalInMain);
  const roundsFromFinal = mainRoundsCount - currentRoundIndex + 1;

  if (roundsFromFinal === 1) return 'F';
  if (roundsFromFinal === 2) return 'SF';
  if (roundsFromFinal === 3) return 'QF';
  if (roundsFromFinal === 4) return 'R16';
  if (roundsFromFinal === 5) return 'R32';
  if (roundsFromFinal === 6) return 'R64';
  return 'R128';
};

export const buildInitialBracket = (teamsCount: number): Match[] => {
  if (teamsCount < 2) return [];

  const MAIN = Math.pow(2, Math.floor(Math.log2(teamsCount)));
  const Q = teamsCount - MAIN; 
  const mainRoundsCount = Math.log2(MAIN);
  
  const allMatches: Match[] = [];
  const roundMatches: Match[][] = [];

  for (let r = 1; r <= mainRoundsCount; r++) {
    const numMatchesInRound = MAIN / Math.pow(2, r);
    const roundKey = getRoundLabel(MAIN, r);
    const round: Match[] = [];
    for (let m = 0; m < numMatchesInRound; m++) {
      round.push({
        id: `m-${r}-${m}`,
        roundKey,
        roundIndex: r,
        side: 'NONE',
        slotA: null,
        slotB: null,
        position: m,
      });
    }
    roundMatches.push(round);
    allMatches.push(...round);
  }

  let thirdPlaceMatch: Match | null = null;
  if (MAIN >= 4) {
    thirdPlaceMatch = {
      id: `m-3rd`,
      roundKey: '3RD',
      roundIndex: mainRoundsCount,
      side: 'NONE',
      slotA: null,
      slotB: null,
      position: 1,
    };
    allMatches.push(thirdPlaceMatch);
  }

  for (let r = 0; r < roundMatches.length - 1; r++) {
    for (let m = 0; m < roundMatches[r].length; m++) {
      const nextRound = roundMatches[r + 1];
      const nextMatch = nextRound[Math.floor(m / 2)];
      roundMatches[r][m].next = {
        matchId: nextMatch.id,
        targetSlot: m % 2 === 0 ? 'A' : 'B'
      };

      if (roundMatches[r][m].roundKey === 'SF' && thirdPlaceMatch) {
        roundMatches[r][m].nextLoser = {
          matchId: thirdPlaceMatch.id,
          targetSlot: m % 2 === 0 ? 'A' : 'B'
        };
      }
    }
  }

  const round1 = roundMatches[0];
  if (Q > 0) {
    for (let i = 0; i < Q; i++) {
      const targetMatchIdx = i % 2 === 0 ? Math.floor(i / 2) : round1.length - 1 - Math.floor(i / 2);
      const targetMatch = round1[targetMatchIdx];
      
      const playIn: Match = {
        id: `p-${i}`,
        roundKey: 'PLAYIN',
        roundIndex: 0,
        side: 'NONE',
        slotA: null,
        slotB: null,
        position: i,
        next: {
          matchId: targetMatch.id,
          targetSlot: targetMatch.slotA === null ? 'A' : 'B'
        }
      };
      allMatches.push(playIn);
      
      if (targetMatch.slotA === null) {
        targetMatch.slotA = { type: 'WINNER_OF', matchId: playIn.id };
      } else {
        targetMatch.slotB = { type: 'WINNER_OF', matchId: playIn.id };
      }
    }
  }

  round1.forEach(m => {
    if (m.slotA === null) m.slotA = { type: 'BYE' };
    if (m.slotB === null) m.slotB = { type: 'BYE' };
  });

  return allMatches;
};

export const fillBracketWithTeams = (teams: Team[], matches: Match[]): Match[] => {
  const T = teams.length;
  if (T === 0) return matches;

  let updated = JSON.parse(JSON.stringify(matches)) as Match[];
  let teamIdx = 0;

  const playIns = updated.filter(m => m.roundKey === 'PLAYIN').sort((a, b) => a.position - b.position);
  playIns.forEach(m => {
    if (teamIdx + 1 < teams.length) {
      m.slotA = { type: 'PAIR', pairId: teams[teamIdx++].id };
      m.slotB = { type: 'PAIR', pairId: teams[teamIdx++].id };
      m.teamA = teams.find(t => t.id === m.slotA?.pairId);
      m.teamB = teams.find(t => t.id === m.slotB?.pairId);
    }
  });

  const round1Matches = updated.filter(m => m.roundIndex === 1).sort((a, b) => a.position - b.position);
  round1Matches.forEach(m => {
    if (m.slotA?.type === 'BYE' && teamIdx < teams.length) {
      const team = teams[teamIdx++];
      m.slotA = { type: 'PAIR', pairId: team.id };
      m.teamA = team;
    }
    if (m.slotB?.type === 'BYE' && teamIdx < teams.length) {
      const team = teams[teamIdx++];
      m.slotB = { type: 'PAIR', pairId: team.id };
      m.teamB = team;
    }
  });

  return recalculateBracket(updated);
};

const resolveWinner = (match: Match): Team | null => {
  const sA = match.scoreA ?? 0;
  const sB = match.scoreB ?? 0;
  if (sA === 0 && sB === 0) return null;
  if (sA > sB) return match.teamA || null;
  if (sB > sA) return match.teamB || null;
  return null;
};

const resolveLoser = (match: Match): Team | null => {
  const sA = match.scoreA ?? 0;
  const sB = match.scoreB ?? 0;
  if (sA === 0 && sB === 0) return null;
  if (sA > sB) return match.teamB || null;
  if (sB > sA) return match.teamA || null;
  return null;
};

export const recalculateBracket = (matches: Match[]): Match[] => {
  let updated = JSON.parse(JSON.stringify(matches)) as Match[];
  const maxRound = Math.max(...updated.map(m => m.roundIndex));

  for (let r = 0; r <= maxRound; r++) {
    const roundMatches = updated.filter(m => m.roundIndex === r);
    for (const m of roundMatches) {
      const winner = resolveWinner(m);
      const loser = resolveLoser(m);

      if (m.next) {
        const nextMatch = updated.find(nm => nm.id === m.next?.matchId);
        if (nextMatch) {
          if (m.next.targetSlot === 'A') nextMatch.teamA = winner;
          else nextMatch.teamB = winner;
        }
      }

      if (m.nextLoser) {
        const loserMatch = updated.find(lm => lm.id === m.nextLoser?.matchId);
        if (loserMatch) {
          if (m.nextLoser.targetSlot === 'A') loserMatch.teamA = loser;
          else loserMatch.teamB = loser;
        }
      }
    }
  }
  return updated;
};

export const advanceWinner = (matches: Match[], matchId: string): Match[] => {
  return recalculateBracket(matches);
};

export const shuffleWithClubProtection = (teams: Team[], protection: boolean): Team[] => {
  if (!protection || teams.length < 4) return shuffleArray(teams);
  return shuffleArray(teams);
};
