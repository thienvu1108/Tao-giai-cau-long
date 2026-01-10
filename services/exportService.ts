
import { TournamentState, EventCategory, Match, TournamentFormat } from '../types';
import { calculateGroupRankings } from './tournamentLogic';

/**
 * Xuất dữ liệu ra file CSV tương thích Excel (UTF-8 with BOM)
 */
export const exportTournamentToCSV = (state: TournamentState) => {
  let csvContent = "\uFEFF"; // Byte Order Mark for UTF-8 (Excel friendly)
  
  // Thông tin chung của giải
  csvContent += `GIẢI ĐẤU: ${state.tournamentName.toUpperCase()}\n`;
  csvContent += `ĐỊA ĐIỂM: ${state.venue || 'N/A'}\n`;
  csvContent += `NGÀY: ${state.date || 'N/A'}\n`;
  csvContent += `TỔ CHỨC: ${state.organizer || 'N/A'}\n\n`;

  state.categories.forEach((cat: EventCategory) => {
    csvContent += `--- NỘI DUNG: ${cat.name} ---\n`;
    
    // Nếu là vòng bảng, xuất bảng xếp hạng trước
    if (cat.format === TournamentFormat.GROUP_STAGE_ELIMINATION && cat.groups.length > 0) {
      csvContent += `\nBẢNG XẾP HẠNG VÒNG BẢNG\n`;
      cat.groups.forEach(group => {
        csvContent += `\n${group.name.toUpperCase()}\n`;
        csvContent += "HẠNG,ĐỘI,CLB,SỐ TRẬN,THẮNG,BẠI,HIỆU SỐ,ĐIỂM\n";
        const rankings = calculateGroupRankings(group);
        rankings.forEach((stat, idx) => {
          const team = group.teams.find(t => t.id === stat.teamId);
          const teamName = team?.players.map(p => p.name).join(' & ') || "N/A";
          const row = [
            idx + 1,
            `"${teamName}"`,
            `"${team?.club || 'Tự do'}"`,
            stat.played,
            stat.won,
            stat.lost,
            stat.diff,
            stat.points
          ];
          csvContent += row.join(",") + "\n";
        });
      });
      csvContent += "\n";
    }

    // Xuất kết quả các trận đấu
    csvContent += "CHI TIẾT KẾT QUẢ CÁC TRẬN ĐẤU\n";
    csvContent += "LOẠI,VÒNG,MÃ TRẬN,SÂN,GIỜ,ĐỘI A,CLB A,TỶ SỐ A,TỶ SỐ B,CLB B,ĐỘI B,KẾT QUẢ\n";

    // Gộp tất cả trận đấu (bao gồm cả trong group)
    const allMatches: Match[] = [];
    if (cat.format === TournamentFormat.GROUP_STAGE_ELIMINATION) {
      cat.groups.forEach(g => allMatches.push(...g.matches));
    }
    allMatches.push(...cat.matches);

    // Sắp xếp theo vòng và số trận
    const sortedMatches = allMatches.sort((a, b) => {
      if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    });

    sortedMatches.forEach((m: Match) => {
      const teamAName = m.teamA ? m.teamA.players.map(p => p.name).join(' & ') : "Chờ đối thủ";
      const teamBName = m.teamB ? m.teamB.players.map(p => p.name).join(' & ') : "Chờ đối thủ";
      const scoreA = m.scoreA ?? 0;
      const scoreB = m.scoreB ?? 0;
      
      let status = "Chưa diễn ra";
      if (m.scoreA !== undefined && m.scoreB !== undefined && (m.scoreA > 0 || m.scoreB > 0)) {
        status = scoreA > scoreB ? "Đội A thắng" : "Đội B thắng";
      }

      const row = [
        m.roundKey === 'GROUP' ? "Bảng" : "Knockout",
        m.roundKey,
        m.id,
        m.court || '-',
        m.scheduledTime || '-',
        `"${teamAName}"`,
        `"${m.teamA?.club || '-'}"`,
        scoreA,
        scoreB,
        `"${m.teamB?.club || '-'}"`,
        `"${teamBName}"`,
        status
      ];
      csvContent += row.join(",") + "\n";
    });
    csvContent += "\n\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Ket_Qua_Giai_${state.tournamentName.replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTournamentToPro = (state: TournamentState) => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = state.tournamentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.pro`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
