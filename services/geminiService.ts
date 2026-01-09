
import { GoogleGenAI } from "@google/genai";

export const getAITournamentInsight = async (tournamentName: string, playersCount: number, eventType: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Hãy đóng vai một chuyên gia tổ chức giải cầu lông. 
      Tên giải: ${tournamentName}. 
      Số lượng VĐV: ${playersCount}. 
      Nội dung: ${eventType === 'SINGLES' ? 'Đánh đơn' : 'Đánh đôi'}.
      
      Hãy đưa ra 3 lời khuyên ngắn gọn để giải đấu diễn ra thành công và hấp dẫn. Trả lời bằng tiếng Việt.`,
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Hãy chuẩn bị trọng tài và sân bãi thật tốt để giải đấu diễn ra thuận lợi!";
  }
};
