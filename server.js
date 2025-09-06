const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { format } = require("date-fns");
const dotenv = require("dotenv");
const path = require("path");
const { createServer } = require("http");

dotenv.config();

const app = express();
const upload = multer();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error("❌ GOOGLE_API_KEY missing in .env");
}
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- ROUTES ---
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "MediClick",
    model: "Gemini 1.5 Flash",
    provider: "Google AI Studio",
    api_configured: true,
    timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
  });
});

app.post("/upload_and_query", upload.single("image"), async (req, res) => {
  try {
    const query = req.body.query;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: { message: "No image uploaded" } });

    const medicalPrompt = `Analyze this medical image. Patient's question: ${query}`;

    const response = await model.generateContent([
      { text: medicalPrompt },
      {
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString("base64"),
        },
      },
    ]);

    const analysis = response.response.text();
    if (!analysis) throw new Error("Empty response from Gemini API");

    res.json({
      success: true,
      model_info: { name: "MediClick", provider: "Google AI Studio" },
      analysis: {
        content: analysis,
        timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        query,
        image_filename: file.originalname,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// --- Serve index.html ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Serve other static assets (CSS, JS, images) ---
app.use(express.static(__dirname));

// --- Start ---
const PORT = 8000;
createServer(app).listen(PORT, () => {
  console.log(`🚑 MediClick running: http://localhost:${PORT}`);
});
