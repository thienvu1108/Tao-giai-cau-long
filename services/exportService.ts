
import { TournamentState, EventCategory, Match } from '../types';

/**
 * Xuất toàn bộ giải đấu ra file CSV tương thích Excel
 */
export const exportTournamentToCSV = (state: TournamentState) => {
  let csvContent = "\uFEFF"; // Byte Order Mark for UTF-8 (Excel friendly)
  
  // Thông tin chung của giải
  csvContent += `GIẢI ĐẤU: ${state.tournamentName}\n`;
  csvContent += `ĐỊA ĐIỂM: ${state.venue || 'N/A'}\n`;
  csvContent += `NGÀY: ${state.date || 'N/A'}\n`;
  csvContent += `TỔ CHỨC: ${state.organizer || 'N/A'}\n\n`;

  state.categories.forEach((cat: EventCategory) => {
    csvContent += `--- NỘI DUNG: ${cat.name} ---\n`;
    csvContent += "VÒNG ĐẤU,MÃ TRẬN,ĐỘI A,ĐIỂM A,ĐIỂM B,ĐỘI B,TRẠNG THÁI\n";

    // Sắp xếp trận đấu theo vòng và vị trí
    const sortedMatches = [...cat.matches].sort((a, b) => a.roundIndex - b.roundIndex || a.position - b.position);
    
    sortedMatches.forEach((m: Match) => {
      const teamAName = m.teamA ? m.teamA.players.map(p => p.name).join(' & ') : "Chờ đối thủ";
      const teamBName = m.teamB ? m.teamB.players.map(p => p.name).join(' & ') : "Chờ đối thủ";
      const scoreA = m.scoreA ?? 0;
      const scoreB = m.scoreB ?? 0;
      
      let status = "Chưa đấu";
      if (m.scoreA !== undefined && m.scoreB !== undefined) {
        status = scoreA > scoreB ? `Đội A thắng` : (scoreB > scoreA ? `Đội B thắng` : "Hòa");
      }

      const row = [
        m.roundKey,
        m.id,
        `"${teamAName}"`,
        scoreA,
        scoreB,
        `"${teamBName}"`,
        status
      ];
      
      csvContent += row.join(",") + "\n";
    });
    csvContent += "\n"; // Khoảng trống giữa các nội dung
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Giai_Dau_${state.tournamentName.replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
