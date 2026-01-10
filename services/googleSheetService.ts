
import { TournamentState } from '../types';

/**
 * Gửi dữ liệu giải đấu tới Google Sheets Web App URL.
 * Bản V7.0: Tối ưu hóa payload và headers để vượt qua mọi rào cản CORS.
 */
export const syncToGoogleSheet = async (url: string, state: TournamentState): Promise<{success: boolean, error?: string}> => {
  if (!url || !url.startsWith('http')) return { success: false, error: 'URL Web App không hợp lệ' };

  try {
    const payload = {
      version: '7.0',
      tournamentName: state.tournamentName,
      venue: state.venue || "Chưa xác định",
      date: state.date || "",
      organizer: state.organizer || "Ban Tổ Chức",
      categories: state.categories.map(cat => ({
        name: cat.name,
        isDrawDone: cat.isDrawDone,
        matches: cat.matches.map(m => {
          const teamAStr = m.teamA ? m.teamA.players.map(p => p.name).join(' & ') : 'Chờ đối thủ';
          const teamBStr = m.teamB ? m.teamB.players.map(p => p.name).join(' & ') : 'Chờ đối thủ';
          const scoreA = m.scoreA ?? 0;
          const scoreB = m.scoreB ?? 0;
          
          let status = 'Chờ thi đấu';
          let winner = '-';
          if (m.scoreA !== undefined && m.scoreB !== undefined && (m.scoreA > 0 || m.scoreB > 0)) {
            status = 'Hoàn thành';
            winner = scoreA > scoreB ? teamAStr : teamBStr;
          } else if (m.teamA && m.teamB) {
            status = 'Sẵn sàng';
          }

          return {
            id: m.id,
            round: m.roundKey,
            court: m.court || '-',
            time: m.scheduledTime || '-',
            teamA: teamAStr,
            clubA: m.teamA?.club || '-',
            scoreA: scoreA,
            scoreB: scoreB,
            clubB: m.teamB?.club || '-',
            teamB: teamBStr,
            status: status,
            winner: winner
          };
        })
      }))
    };

    // Gửi payload dưới dạng chuỗi thuần túy để tránh Preflight CORS
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });

    return { success: true };
  } catch (error) {
    console.error("Google Sync V7 Error:", error);
    return { success: false, error: String(error) };
  }
};

export const getGASCode = () => {
  return `
/**
 * BADMINTON PRO DRAW - CLOUD SYNC V7.0 (INVINCIBLE)
 * KHẮC PHỤC TRIỆT ĐỂ LỖI GHI DỮ LIỆU
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return HtmlService.createHtmlOutput(
    "<div style='font-family:sans-serif; text-align:center; padding:40px; background:#f8fafc; color:#1e293b;'>" +
    "<h1 style='color:#2563eb;'>Cloud Sync V7.0 Online</h1>" +
    "<p>Dữ liệu đang được kết nối tới: <b>" + ss.getName() + "</b></p>" +
    "<div style='margin-top:20px; padding:20px; background:white; border-radius:12px; border:1px solid #e2e8f0;'>" +
    "<p>Trạng thái: <span style='color:#16a34a; font-weight:bold;'>SẴN SÀNG NHẬN DỮ LIỆU</span></p>" +
    "</div>" +
    "<br><a href='" + ss.getUrl() + "' target='_blank' style='background:#1e293b; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;'>MỞ FILE GOOGLE SHEETS</a>" +
    "</div>"
  ).setTitle("Sync V7 Status");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); 
  
  try {
    // SỬ DỤNG getDataAsString() ĐỂ TRÁNH LỖI PARSE
    var jsonString = e.postData.getDataAsString();
    var data = JSON.parse(jsonString);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.tournamentName) ss.rename(data.tournamentName);

    data.categories.forEach(function(cat) {
      var safeName = cat.name.substring(0, 20);
      var sheetName = "SƠ ĐỒ: " + safeName;
      var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
      sheet.clear();
      
      // 1. TẠO TIÊU ĐỀ
      var header = [["MÃ", "VÒNG", "SÂN", "GIỜ", "ĐỘI A", "CLB A", "TỶ SỐ", "CLB B", "ĐỘI B", "TRẠNG THÁI", "THẮNG"]];
      sheet.getRange(1, 1, 1, 11).setValues(header)
           .setBackground("#1e293b").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
      
      // 2. CHUẨN BỊ DỮ LIỆU
      var rows = cat.matches.map(function(m) {
        return [
          m.id, m.round, m.court, m.time, m.teamA, m.clubA, 
          m.scoreA + " - " + m.scoreB, 
          m.clubB, m.teamB, m.status, m.winner
        ];
      });

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 11).setValues(rows).setHorizontalAlignment("center");
        
        // Tô màu trạng thái
        var statusRange = sheet.getRange(2, 10, rows.length, 1);
        var rules = sheet.getConditionalFormatRules();
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Hoàn thành").setBackground("#dcfce7").setFontColor("#15803d").build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Sẵn sàng").setBackground("#dbeafe").setFontColor("#1e40af").build());
        sheet.setConditionalFormatRules(rules);
      }
      
      sheet.autoResizeColumns(1, 11);
      sheet.setFrozenRows(1);
    });

    // 3. SHEET TỔNG HỢP & BẢNG VÀNG
    var dash = ss.getSheetByName("KẾT QUẢ TỔNG HỢP") || ss.insertSheet("KẾT QUẢ TỔNG HỢP", 0);
    dash.clear();
    var dashData = [
      ["BÁO CÁO GIẢI ĐẤU: " + data.tournamentName.toUpperCase()],
      ["Địa điểm:", data.venue],
      ["Thời gian:", data.date],
      ["Đơn vị tổ chức:", data.organizer],
      ["Cập nhật cuối:", new Date().toLocaleString("vi-VN")],
      [""],
      ["DANH SÁCH NỘI DUNG", "SỐ LƯỢNG VĐV", "TRẠNG THÁI", "XEM CHI TIẾT"]
    ];
    
    data.categories.forEach(function(cat) {
      var sName = "SƠ ĐỒ: " + cat.name.substring(0, 20);
      var sId = ss.getSheetByName(sName).getSheetId();
      dashData.push([
        cat.name, 
        "-", 
        cat.isDrawDone ? "Đã bốc thăm" : "Chờ",
        '=HYPERLINK("#gid=' + sId + '", "Mở Sơ Đồ")'
      ]);
    });
    
    dash.getRange(1, 1, dashData.length, 4).setValues(dashData);
    dash.getRange(1, 1, 1, 4).merge().setBackground("#2563eb").setFontColor("white").setFontWeight("bold").setFontSize(14).setHorizontalAlignment("center");
    dash.autoResizeColumns(1, 4);

    return ContentService.createTextOutput("SUCCESS").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}
  `.trim();
};
