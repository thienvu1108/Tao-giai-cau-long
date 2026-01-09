
import { TournamentState, EventCategory, Match } from '../types';

export const exportTournamentToCSV = (state: TournamentState) => {
  let csvContent = "\uFEFF"; // Byte Order Mark for UTF-8 (Excel friendly)
  
  // Header
  csvContent += "NỘI DUNG,VÒNG ĐẤU,MÃ TRẬN,ĐỘI A,ĐIỂM A,ĐIỂM B,ĐỘI B,KẾT QUẢ\n";

  state.categories.forEach((cat: EventCategory) => {
    // Sort matches by round and position
    const sortedMatches = [...cat.matches].sort((a, b) => a.roundIndex - b.roundIndex || a.position - b.position);
    
    sortedMatches.forEach((m: Match) => {
      const teamAName = m.teamA ? m.teamA.players.map(p => p.name).join(' & ') : "Đang chờ";
      const teamBName = m.teamB ? m.teamB.players.map(p => p.name).join(' & ') : "Đang chờ";
      const scoreA = m.scoreA ?? 0;
      const scoreB = m.scoreB ?? 0;
      
      let result = "Chưa diễn ra";
      if (scoreA > scoreB) result = `Đội A thắng`;
      else if (scoreB > scoreA) result = `Đội B thắng`;
      else if (m.scoreA !== undefined) result = "Hòa/Chưa xong";

      const row = [
        cat.name,
        m.roundKey,
        m.id,
        `"${teamAName}"`,
        scoreA,
        scoreB,
        `"${teamBName}"`,
        result
      ];
      
      csvContent += row.join(",") + "\n";
    });
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Ket_Qua_${state.tournamentName.replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
