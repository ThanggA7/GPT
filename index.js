import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chatHandler from "./api/chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.static(join(__dirname, "public")));

// API Routes
app.post("/api/chat", chatHandler);

// Serve static files
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// Handle all other routes - serve index.html for SPA
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

export default app;
