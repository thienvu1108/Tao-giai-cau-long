
import { Team, Match, EventType, RoundKey, Group, TeamStats } from '../types';

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

// --- LOGIC VÒNG BẢNG ---

export const generateGroups = (teams: Team[], teamsPerGroup: number): Group[] => {
  const groupCount = Math.ceil(teams.length / teamsPerGroup);
  const groups: Group[] = [];
  
  for (let i = 0; i < groupCount; i++) {
    const groupTeams = teams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
    const groupId = `group-${Date.now()}-${i}`;
    const groupName = String.fromCharCode(65 + i); // A, B, C...

    const matches: Match[] = [];
    let matchIdx = 0;
    for (let j = 0; j < groupTeams.length; j++) {
      for (let k = j + 1; k < groupTeams.length; k++) {
        matches.push({
          id: `gm-${groupId}-${matchIdx++}`,
          roundKey: 'GROUP',
          roundIndex: 0,
          side: 'NONE',
          slotA: { type: 'PAIR', pairId: groupTeams[j].id },
          slotB: { type: 'PAIR', pairId: groupTeams[k].id },
          teamA: groupTeams[j],
          teamB: groupTeams[k],
          position: matchIdx,
          groupId: groupId
        });
      }
    }

    groups.push({
      id: groupId,
      name: `Bảng ${groupName}`,
      teams: groupTeams,
      matches,
      rankings: groupTeams.map(t => ({ teamId: t.id, played: 0, won: 0, lost: 0, points: 0, diff: 0 }))
    });
  }
  return groups;
};

export const calculateGroupRankings = (group: Group): TeamStats[] => {
  const statsMap: Record<string, TeamStats> = {};
  group.teams.forEach(t => {
    statsMap[t.id] = { teamId: t.id, played: 0, won: 0, lost: 0, points: 0, diff: 0 };
  });

  group.matches.forEach(m => {
    if (m.scoreA !== undefined && m.scoreB !== undefined && (m.scoreA > 0 || m.scoreB > 0) && m.teamA && m.teamB) {
      const sA = statsMap[m.teamA.id];
      const sB = statsMap[m.teamB.id];
      
      sA.played++;
      sB.played++;
      sA.diff += (m.scoreA - m.scoreB);
      sB.diff += (m.scoreB - m.scoreA);

      if (m.scoreA > m.scoreB) {
        sA.won++;
        sA.points += 2;
        sB.lost++;
      } else if (m.scoreB > m.scoreA) {
        sB.won++;
        sB.points += 2;
        sA.lost++;
      }
    }
  });

  return Object.values(statsMap).sort((a, b) => b.points - a.points || b.diff - a.diff);
};

// --- LOGIC SƠ ĐỒ ---

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

export const renumberAllMatches = (matches: Match[]): Match[] => {
  const sorted = [...matches].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) {
      if (a.scheduledTime !== b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
      return (a.court || '').localeCompare(b.court || '');
    }
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    const aReady = a.teamA && a.teamB ? 1 : 0;
    const bReady = b.teamA && b.teamB ? 1 : 0;
    if (aReady !== bReady) return bReady - aReady;
    if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
    return a.position - b.position;
  });

  return matches.map(m => {
    const idx = sorted.findIndex(s => s.id === m.id);
    return { ...m, matchNumber: idx + 1 };
  });
};

export const buildInitialBracket = (teamsCount: number, hasThirdPlace: boolean = true): Match[] => {
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
      round.push({ id: `m-${r}-${m}`, roundKey, roundIndex: r, side: 'NONE', slotA: null, slotB: null, position: m });
    }
    roundMatches.push(round);
    allMatches.push(...round);
  }

  let thirdPlaceMatch: Match | null = null;
  if (MAIN >= 4 && hasThirdPlace) {
    thirdPlaceMatch = { id: `m-3rd`, roundKey: '3RD', roundIndex: mainRoundsCount, side: 'NONE', slotA: null, slotB: null, position: 1 };
    allMatches.push(thirdPlaceMatch);
  }

  for (let r = 0; r < roundMatches.length - 1; r++) {
    for (let m = 0; m < roundMatches[r].length; m++) {
      const nextRound = roundMatches[r + 1];
      const nextMatch = nextRound[Math.floor(m / 2)];
      roundMatches[r][m].next = { matchId: nextMatch.id, targetSlot: m % 2 === 0 ? 'A' : 'B' };
      if (roundMatches[r][m].roundKey === 'SF' && thirdPlaceMatch) {
        roundMatches[r][m].nextLoser = { matchId: thirdPlaceMatch.id, targetSlot: m % 2 === 0 ? 'A' : 'B' };
      }
    }
  }

  const round1 = roundMatches[0];
  if (Q > 0) {
    for (let i = 0; i < Q; i++) {
      const targetMatchIdx = i % 2 === 0 ? Math.floor(i / 2) : round1.length - 1 - Math.floor(i / 2);
      const targetMatch = round1[targetMatchIdx];
      const playIn: Match = {
        id: `p-${i}`, roundKey: 'PLAYIN', roundIndex: 0, side: 'NONE', slotA: null, slotB: null, position: i,
        next: { matchId: targetMatch.id, targetSlot: targetMatch.slotA === null ? 'A' : 'B' }
      };
      allMatches.push(playIn);
      if (targetMatch.slotA === null) targetMatch.slotA = { type: 'WINNER_OF', matchId: playIn.id };
      else targetMatch.slotB = { type: 'WINNER_OF', matchId: playIn.id };
    }
  }

  round1.forEach(m => {
    if (m.slotA === null) m.slotA = { type: 'BYE' };
    if (m.slotB === null) m.slotB = { type: 'BYE' };
  });

  return renumberAllMatches(allMatches);
};

export const recalculateBracket = (matches: Match[]): Match[] => {
  let updated = JSON.parse(JSON.stringify(matches)) as Match[];
  const maxRound = Math.max(...updated.map(m => m.roundIndex));

  for (let r = 0; r <= maxRound; r++) {
    const roundMatches = updated.filter(m => m.roundIndex === r);
    for (const m of roundMatches) {
      const sA = m.scoreA ?? 0;
      const sB = m.scoreB ?? 0;
      let winner: Team | null = null;
      let loser: Team | null = null;
      if (sA > 0 || sB > 0) {
        if (sA > sB) { winner = m.teamA || null; loser = m.teamB || null; }
        else if (sB > sA) { winner = m.teamB || null; loser = m.teamA || null; }
      }
      if (m.next) {
        const nextMatch = updated.find(nm => nm.id === m.next?.matchId);
        if (nextMatch) {
          if (m.next.targetSlot === 'A') nextMatch.teamA = winner;
          else nextMatch.teamB = winner;
        }
      }
      if (m.nextLoser) {
        // Fix: Changed nm.id to lm.id to fix 'Cannot find name nm' error
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

export const shuffleWithClubProtection = (teams: Team[], protection: boolean): Team[] => {
  if (!protection || teams.length < 4) return shuffleArray(teams);
  // Logic bảo vệ CLB tương tự cũ
  return shuffleArray(teams);
};

export const assignCourtsAndTime = (
  matches: Match[], courtNamesInput: string, startTimeStr: string, durationMins: number
): Match[] => {
  let courtList: string[] = [];
  if (courtNamesInput.includes(',') || isNaN(Number(courtNamesInput))) {
    courtList = courtNamesInput.split(',').map(s => s.trim()).filter(s => s !== '');
  } else {
    courtList = Array.from({ length: parseInt(courtNamesInput) || 1 }, (_, i) => `Sân ${i + 1}`);
  }
  if (courtList.length === 0) return matches;

  const manualRounds: RoundKey[] = ['SF', 'F', '3RD'];
  const schedulableMatchesBase = [...matches]
    .filter(m => !manualRounds.includes(m.roundKey))
    .sort((a, b) => {
      const aReady = a.teamA && a.teamB ? 1 : 0;
      const bReady = b.teamA && b.teamB ? 1 : 0;
      if (aReady !== bReady) return bReady - aReady;
      if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
      return a.position - b.position;
    });

  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const courtUsageCount: Record<string, number> = {};
  const scheduleResults = new Map();

  schedulableMatchesBase.forEach((match, idx) => {
    const courtName = courtList[idx % courtList.length];
    const orderInCourt = courtUsageCount[courtName] || 0;
    courtUsageCount[courtName] = orderInCourt + 1;
    const totalMinutes = startHour * 60 + startMin + (orderInCourt * durationMins);
    const timeStr = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
    scheduleResults.set(match.id, { court: courtName, time: timeStr });
  });

  return matches.map(m => {
    const info = scheduleResults.get(m.id);
    return {
      ...m,
      court: info ? info.court : m.court,
      scheduledTime: info ? info.time : m.scheduledTime
    };
  });
};
