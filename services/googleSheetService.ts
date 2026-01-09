
import { TournamentState } from '../types';

/**
 * Gửi dữ liệu giải đấu tới Google Sheets Web App URL.
 * Sử dụng Blob text/plain để đảm bảo là "Simple Request", tránh lỗi CORS Preflight.
 */
export const syncToGoogleSheet = async (url: string, state: TournamentState): Promise<{success: boolean, spreadsheetUrl?: string, error?: string}> => {
  if (!url || !url.startsWith('http')) return { success: false, error: 'URL không hợp lệ' };

  try {
    const payload = JSON.stringify({
      action: 'sync_tournament',
      tournamentName: state.tournamentName,
      categories: state.categories.map(cat => ({
        name: cat.name,
        matches: cat.matches.map(m => ({
          id: m.id,
          round: m.roundKey,
          teamA: m.teamA ? m.teamA.players.map(p => p.name).join(' & ') : 'Chờ...',
          scoreA: m.scoreA ?? 0,
          scoreB: m.scoreB ?? 0,
          teamB: m.teamB ? m.teamB.players.map(p => p.name).join(' & ') : 'Chờ...',
          status: (m.scoreA !== undefined && m.scoreB !== undefined) ? (m.scoreA > m.scoreB ? 'Đội A thắng' : 'Đội B thắng') : 'Chưa đấu'
        }))
      }))
    });

    // Ép kiểu Blob text/plain để trình duyệt không gửi OPTIONS request (tránh CORS error)
    const blob = new Blob([payload], { type: 'text/plain' });

    const response = await fetch(url, {
      method: 'POST',
      body: blob,
      mode: 'cors',
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return { success: true, spreadsheetUrl: result.spreadsheetUrl };
      }
      return { success: false, error: result.error || 'Script báo lỗi xử lý' };
    }

    return { success: false, error: `Lỗi kết nối (${response.status}). Hãy kiểm tra lại Deployment.` };
  } catch (error) {
    console.error("Lỗi đồng bộ Cloud:", error);
    return { success: false, error: 'Không thể kết nối tới Cloud. Hãy chắc chắn bạn đã Deploy đúng quyền "Anyone".' };
  }
};

/**
 * Mã script mẫu tối ưu
 */
export const getGASCode = () => {
  return `
/**
 * BADMINTON PRO DRAW - GOOGLE SHEETS SYNC SCRIPT
 * 
 * BƯỚC 1: Dán code này vào Apps Script và nhấn Save.
 * BƯỚC 2: Chọn hàm "setup" ở thanh công cụ phía trên và nhấn "Run".
 * BƯỚC 3: Một bảng hiện ra, chọn "Review Permissions" -> Chọn Tài khoản -> "Advanced" -> "Go to... (unsafe)" -> "Allow".
 * BƯỚC 4: Nhấn "Deploy" -> "New Deployment" -> "Web App".
 * BƯỚC 5: Execute as: "Me", Who has access: "Anyone".
 */

function setup() {
  // Hàm này để kích hoạt hộp thoại cấp quyền (Authorize)
  DriveApp.getRootFolder();
  SpreadsheetApp.create("Test Connection");
  console.log("Cấp quyền thành công! Bây giờ bạn có thể Deploy.");
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);
    var tournamentName = payload.tournamentName || "Giai Dau Cau Long";
    var categories = payload.categories || [];
    
    var files = DriveApp.getFilesByName(tournamentName);
    var ss;
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(tournamentName);
    }
    
    categories.forEach(function(cat) {
      var sheetName = cat.name.substring(0, 31);
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      sheet.clear();
      
      var header = [["MÃ TRẬN", "VÒNG", "ĐỘI A", "ĐIỂM A", "ĐIỂM B", "ĐỘI B", "TRẠNG THÁI"]];
      sheet.getRange(1, 1, 1, 7).setValues(header)
        .setBackground("#0f172a")
        .setFontColor("white")
        .setFontWeight("bold");
      
      var rows = cat.matches.map(function(m) {
        return [m.id, m.round, m.teamA, m.scoreA, m.scoreB, m.teamB, m.status];
      });
      
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 7).setValues(rows);
      }
      sheet.autoResizeColumns(1, 7);
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      spreadsheetUrl: ss.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput("Cloud Sync is Active!");
}
  `.trim();
};
