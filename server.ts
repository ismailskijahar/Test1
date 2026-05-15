import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import fs from "fs";

// Import API Handlers
import webhookHandler from "./api/webhook.js";
import sendHandler from "./api/whatsapp/send.js";
import conversationsHandler from "./api/whatsapp/conversations.js";
import messagesHandler from "./api/whatsapp/messages.js";
import modeHandler from "./api/whatsapp/mode.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (getApps().length === 0) {
  try {
    initializeApp();
    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
}
const db = getFirestore();

// Initialize OpenRouter (Optional: Keep Gemini if used elsewhere, but for now we focus on WhatsApp)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_AI_MODEL = "google/gemini-2.0-flash-lite:free";

const app = express();
const PORT = 3000;

// Required for correct protocol detection (HTTPS) when behind proxies (Cloud Run/Nginx)
app.set('trust proxy', true);

// Webhook endpoints (MUST BE BEFORE express.json())
app.all("/api/webhook", webhookHandler);
app.all("/api/whatsapp/webhook", webhookHandler);

app.use(express.json());

// WhatsApp specialized endpoints
app.all("/api/whatsapp/send", sendHandler);
app.all("/api/whatsapp/conversations", conversationsHandler);
app.all("/api/whatsapp/messages", messagesHandler);
app.all("/api/whatsapp/mode", modeHandler);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

async function startServer() {
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Initializing Vite in middleware mode...");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      // Explicitly handle SPA fallback in dev mode if needed, 
      // although appType: "spa" should do it.
      app.get("*", async (req, res, next) => {
        if (req.originalUrl.startsWith("/api")) {
          return next();
        }
        try {
          const template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
          const html = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ "Content-Type": "text/html" }).send(html);
        } catch (e) {
          next(e);
        }
      });
      console.log("Vite middleware attached.");
    } else {
      const distPath = path.join(process.cwd(), "dist");
      console.log(`Serving static files from ${distPath}`);
      if (!fs.existsSync(distPath)) {
        console.warn("WARNING: dist directory not found! Have you run 'npm run build'?");
      }
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          console.error(`index.html not found at ${indexPath}`);
          res.status(404).send("Application index.html missing. Please rebuild.");
        }
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Critical error during server startup:", err);
    process.exit(1);
  }
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
