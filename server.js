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
    timestamp: new Date().toISOString(),
  });

  // Set timeout for the entire request
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.error("⏰ Request timeout after 30 seconds");
      res.status(408).json({
        error: "Yêu cầu hết thời gian chờ",
        details: "AI đang quá tải, vui lòng thử lại sau ít phút",
      });
    }
  }, 30000);

  try {
    const {
      message,
      images = [],
      temperature = 0.7,
      conversationHistory = [],
    } = req.body || {};

    // Validate input - message should be non-empty string or images should be provided
    const hasMessage =
      message && typeof message === "string" && message.trim().length > 0;
    const hasImages = images && Array.isArray(images) && images.length > 0;

    if (!hasMessage && !hasImages) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: "Message or images required",
        details: "Please provide either a text message or upload images",
      });
    }

    console.log(
      `💭 Processing request with ${conversationHistory.length} previous messages`
    );

    // Build conversation contents for Gemini
    const contents = [];

    // Add conversation history (limit to last 20 messages to avoid token limit)
    const recentHistory = conversationHistory.slice(-20);
    for (const historyItem of recentHistory) {
      if (historyItem.role === "user") {
        contents.push({
          role: "user",
          parts: [{ text: historyItem.content }],
        });
      } else if (historyItem.role === "assistant") {
        contents.push({
          role: "model", // Gemini uses 'model' instead of 'assistant'
          parts: [{ text: historyItem.content }],
        });
      }
    }

    // Add current message parts
    const currentParts = [];

    // Add text message if provided
    if (hasMessage) {
      currentParts.push({ text: message.trim() });
    }

    // Add images if provided
    if (hasImages) {
      for (const image of images) {
        currentParts.push({
          inline_data: {
            mime_type: image.mimeType || "image/jpeg",
            data: image.data.split(",")[1], // Remove data:image/jpeg;base64, prefix
          },
        });
      }
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: currentParts,
    });

    const requestBody = {
      contents: contents,
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

    // Retry logic with exponential backoff
    let lastError = null;
    let response = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 API attempt ${attempt}/3`);

        const controller = new AbortController();
        const apiTimeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout per attempt

        response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(apiTimeout);

        if (response.ok) {
          console.log(`✅ API call successful on attempt ${attempt}`);
          break; // Success, exit retry loop
        } else {
          const errorText = await response.text();
          console.error(
            `❌ API attempt ${attempt} failed with status ${response.status}:`,
            errorText
          );
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);

          // Don't retry on client errors (4xx), only server errors (5xx)
          if (response.status < 500) {
            throw lastError;
          }
        }
      } catch (error) {
        console.error(`❌ API attempt ${attempt} error:`, error.message);
        lastError = error;

        // Don't retry on abort errors or client errors
        if (error.name === "AbortError" || error.message.includes("400")) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < 3) {
          const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("All API attempts failed");
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      console.error("❌ No candidates in response:", data);
      throw new Error(
        "AI không thể tạo phản hồi, có thể do nội dung bị hạn chế"
      );
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
    clearTimeout(timeoutId); // Clear timeout on success

    res.status(200).json({
      message: aiResponse,
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    clearTimeout(timeoutId); // Clear timeout on error

    // Don't send response if already sent (timeout case)
    if (res.headersSent) {
      return;
    }

    let errorMessage = "Xin lỗi, tôi không nhận được phản hồi từ AI.";
    let statusCode = 500;

    if (error.name === "AbortError" || error.message.includes("timeout")) {
      errorMessage = "AI đang quá tải, vui lòng thử lại sau ít giây";
      statusCode = 408;
    } else if (error.message.includes("API key")) {
      errorMessage = "Lỗi cấu hình API key";
      statusCode = 401;
    } else if (
      error.message.includes("quota") ||
      error.message.includes("limit")
    ) {
      // Instead of returning error, provide demo response
      console.log("📝 API quota exceeded, providing demo response");
      const demoResponse = getDemoResponse(message || "");
      return res.json({ response: demoResponse.text });
    } else if (
      error.message.includes("network") ||
      error.message.includes("fetch")
    ) {
      errorMessage = "Lỗi kết nối mạng, vui lòng thử lại";
      statusCode = 503;
    } else if (
      error.message.includes("bị hạn chế") ||
      error.message.includes("candidates")
    ) {
      errorMessage =
        "Nội dung có thể vi phạm chính sách, vui lòng thử câu hỏi khác";
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
      retryAfter: statusCode === 429 ? 60 : statusCode === 408 ? 10 : undefined,
    });
  }
});

// Demo response function when API quota is exceeded
function getDemoResponse(userMessage) {
  const message = userMessage.toLowerCase();

  if (message.includes("machine learning") || message.includes("ml")) {
    return {
      text: `# Machine Learning - Học Máy

## Khái niệm cơ bản
Machine Learning (Học máy) là một nhánh của Trí tuệ nhân tạo (AI) cho phép máy tính học hỏi và đưa ra dự đoán hoặc quyết định mà không cần được lập trình rõ ràng cho từng tác vụ cụ thể.

## Các loại Machine Learning
1. **Supervised Learning** (Học có giám sát): Sử dụng dữ liệu đã được gán nhãn
2. **Unsupervised Learning** (Học không giám sát): Tìm pattern trong dữ liệu chưa gán nhãn  
3. **Reinforcement Learning** (Học tăng cường): Học thông qua phần thưởng và phạt

## Code Python đơn giản - Linear Regression

\`\`\`python
# Import thư viện cần thiết
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# Tạo dữ liệu mẫu
np.random.seed(42)
X = np.random.rand(100, 1) * 10  # 100 điểm dữ liệu
y = 2 * X.ravel() + 1 + np.random.randn(100) * 2  # y = 2x + 1 + noise

# Chia dữ liệu thành tập huấn luyện và kiểm tra
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Tạo model Linear Regression
model = LinearRegression()

# Huấn luyện model
model.fit(X_train, y_train)

# Dự đoán
y_pred = model.predict(X_test)

# Đánh giá model
from sklearn.metrics import mean_squared_error, r2_score
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"Mean Squared Error: {mse:.2f}")
print(f"R² Score: {r2:.2f}")
print(f"Hệ số: {model.coef_[0]:.2f}")
print(f"Intercept: {model.intercept_:.2f}")

# Vẽ biểu đồ
plt.figure(figsize=(10, 6))
plt.scatter(X_test, y_test, color='blue', alpha=0.6, label='Dữ liệu thực')
plt.plot(X_test, y_pred, color='red', linewidth=2, label='Dự đoán')
plt.xlabel('X')
plt.ylabel('y')
plt.title('Linear Regression Demo')
plt.legend()
plt.show()
\`\`\`

## Ứng dụng thực tế
- Dự đoán giá nhà
- Phân loại email spam
- Nhận dạng hình ảnh
- Gợi ý sản phẩm

*Lưu ý: Đây là response demo do API đã đạt giới hạn. Hãy thử lại sau hoặc liên hệ để cập nhật API key.*`,
    };
  }

  return {
    text: `Xin lỗi, API hiện tại đã đạt giới hạn quota. Đây là response demo.

Để giải quyết vấn đề này:
1. Chờ quota reset (thường là 24h)
2. Cập nhật API key mới
3. Nâng cấp plan API

Câu hỏi của bạn: "${userMessage}"

*Response này được tạo tự động khi API không khả dụng.*`,
  };
}

// For local development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
