import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(cors()); // Enable CORS for all routes

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ Thiếu GEMINI_API_KEY trong .env");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.options("/api/chat", (req, res) => res.sendStatus(204));

app.post("/api/chat", async (req, res) => {
  console.log("📨 Received chat request:", {
    messagesCount: req.body?.messages?.length,
    temperature: req.body?.temperature,
  });

  try {
    let { messages, temperature = 0.7 } = req.body || {};
    if (!Array.isArray(messages)) {
      console.error("❌ Invalid messages format");
      return res.status(400).json({ error: "messages must be an array" });
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Chỉ gửi messages role user/assistant, bỏ system (Gemini không hỗ trợ system)
    const geminiMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (typeof m.content === "string") {
          return { role: m.role, parts: [{ text: m.content }] };
        } else if (Array.isArray(m.content)) {
          // Xử lý message với text và image
          const parts = [];

          m.content.forEach((item) => {
            if (item.type === "text" && item.text) {
              parts.push({ text: item.text });
            } else if (item.type === "image_url" && item.image_url) {
              // Convert data URL to Gemini format
              const dataUrl = item.image_url.url;
              if (dataUrl.startsWith("data:image/")) {
                const [header, base64Data] = dataUrl.split(",");
                const mimeType =
                  header.match(/data:(image\/[^;]+)/)?.[1] || "image/jpeg";

                parts.push({
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                });
              }
            }
          });

          return {
            role: m.role,
            parts: parts.length > 0 ? parts : [{ text: "" }],
          };
        } else {
          return { role: m.role, parts: [{ text: "" }] };
        }
      });

    // Gọi Gemini API (sử dụng gemini-1.5-flash để hỗ trợ vision tốt hơn)
    console.log(
      "🤖 Calling Gemini API with",
      geminiMessages.length,
      "messages"
    );

    // Check if any message contains images
    const hasImages = geminiMessages.some((msg) =>
      msg.parts.some((part) => part.inline_data)
    );

    const model = hasImages ? "gemini-1.5-flash" : "gemini-1.5-flash";
    console.log(
      "📸 Using model:",
      model,
      hasImages ? "(with vision)" : "(text only)"
    );

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { temperature },
        }),
      }
    );

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error("❌ Gemini API error:", upstream.status, errorText);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: `API Error: ${upstream.status}`,
        })}\n\n`
      );
      return res.end();
    }

    // Gemini 1.5 Flash response handling with better error checking
    const data = await upstream.json();
    console.log("✅ Gemini response received", JSON.stringify(data, null, 2));

    const candidates = data.candidates?.[0];
    
    // Check for safety ratings or blocked content
    if (!candidates) {
      console.log("⚠️ No candidates in response, might be blocked by safety filters");
      const finishReason = data.candidates?.[0]?.finishReason;
      let errorMessage = "Xin lỗi, tôi không thể tạo phản hồi cho nội dung này.";
      
      if (finishReason === 'SAFETY') {
        errorMessage = "Nội dung có thể vi phạm chính sách an toàn. Vui lòng thử câu hỏi khác.";
      } else if (finishReason === 'RECITATION') {
        errorMessage = "Nội dung có thể vi phạm bản quyền. Vui lòng thử câu hỏi khác.";
      }
      
      res.write(`data: ${JSON.stringify({ token: errorMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }
    
    // Check finish reason
    const finishReason = candidates.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      console.log("⚠️ Unusual finish reason:", finishReason);
      let warningMessage = "";
      
      if (finishReason === 'MAX_TOKENS') {
        warningMessage = "\n\n*[Phản hồi có thể bị cắt do giới hạn độ dài]*";
      } else if (finishReason === 'SAFETY') {
        warningMessage = "\n\n*[Một phần nội dung có thể bị lọc vì lý do an toàn]*";
      }
      
      const token = candidates?.content?.parts?.[0]?.text ?? "";
      if (token) {
        res.write(`data: ${JSON.stringify({ token: token + warningMessage })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ token: "Phản hồi bị lọc vì lý do an toàn." + warningMessage })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const token = candidates?.content?.parts?.[0]?.text ?? "";

    if (token) {
      console.log("📤 Sending response token, length:", token.length);
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    } else {
      console.log("⚠️ Empty response token, sending fallback message");
      res.write(
        `data: ${JSON.stringify({
          token: "Xin lỗi, tôi đã hiểu câu hỏi của bạn nhưng không thể tạo phản hồi phù hợp lúc này. Vui lòng thử lại hoặc đặt câu hỏi khác.",
        })}\n\n`
      );
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("❌ Server error:", err);
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`
    );
    res.end();
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
