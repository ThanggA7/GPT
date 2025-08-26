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
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

if (!GEMINI_API_KEY) {
  console.error("❌ Thiếu GEMINI_API_KEY trong .env");
  process.exit(1);
}

const PORT = process.env.PORT || 5500;

app.options("/api/chat", (req, res) => res.sendStatus(204));

app.post("/api/chat", async (req, res) => {
  console.log("📨 Received chat request:", {
    hasMessage: !!req.body?.message,
    imageCount: req.body?.images?.length || 0,
    temperature: req.body?.temperature,
  });

  try {
    const { message, images = [], temperature = 0.7 } = req.body || {};

    // Validate input - message should be non-empty string or images should be provided
    const hasMessage =
      message && typeof message === "string" && message.trim().length > 0;
    const hasImages = images && Array.isArray(images) && images.length > 0;

    if (!hasMessage && !hasImages) {
      return res.status(400).json({
        error: "Message or images required",
        details: "Please provide either a text message or upload images",
      });
    }

    const parts = [];

    // Add text message if provided
    if (hasMessage) {
      parts.push({ text: message.trim() });
    }

    // Add images if provided
    if (hasImages) {
      for (const image of images) {
        parts.push({
          inline_data: {
            mime_type: image.mimeType || "image/jpeg",
            data: image.data.split(",")[1], // Remove data:image/jpeg;base64, prefix
          },
        });
      }
    }

    const requestBody = {
      contents: [
        {
          parts: parts,
        },
      ],
      generationConfig: {
        temperature: Math.max(0, Math.min(1, temperature)),
        maxOutputTokens: 4096,
        topP: 0.8,
        topK: 40,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    };

    console.log(
      "🤖 Calling Gemini API with",
      hasImages ? "text + images" : "text only"
    );

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Gemini API Error:", data);
      throw new Error(data.error?.message || "API request failed");
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response generated");
    }

    const candidate = data.candidates[0];

    // Check for safety filters
    if (candidate.finishReason === "SAFETY") {
      return res.status(400).json({
        error: "Nội dung bị chặn do vi phạm chính sách an toàn",
        safetyRatings: candidate.safetyRatings,
      });
    }

    // Check for other finish reasons
    if (candidate.finishReason === "RECITATION") {
      return res.status(400).json({
        error: "Nội dung bị chặn do vi phạm bản quyền",
      });
    }

    if (!candidate.content?.parts?.[0]?.text) {
      console.error("❌ Invalid response structure:", data);
      return res.status(500).json({
        error: "Phản hồi không hợp lệ từ AI",
        finishReason: candidate.finishReason,
      });
    }

    const aiResponse = candidate.content.parts[0].text;

    console.log("✅ Sending response, length:", aiResponse.length);
    res.status(200).json({
      message: aiResponse,
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
    });
  } catch (error) {
    console.error("❌ Server error:", error);

    let errorMessage = "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.";

    if (error.message.includes("API key")) {
      errorMessage = "Lỗi cấu hình API key";
    } else if (
      error.message.includes("quota") ||
      error.message.includes("limit")
    ) {
      errorMessage = "Đã vượt quá giới hạn API, vui lòng thử lại sau";
    } else if (
      error.message.includes("network") ||
      error.message.includes("fetch")
    ) {
      errorMessage = "Lỗi kết nối mạng, vui lòng thử lại";
    }

    res.status(500).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// For local development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
