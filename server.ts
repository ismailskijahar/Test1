import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Import handlers
import webhookHandler from "./api/webhook";
import sendHandler from "./api/whatsapp/send";
import modeHandler from "./api/whatsapp/mode";
import conversationsHandler from "./api/whatsapp/conversations";
import messagesHandler from "./api/whatsapp/messages";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Vercel-style routing shim
  const wrap = (handler: any) => async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error("API_EXECUTION_ERROR", err);
      if (!res.headersSent) res.sendStatus(500);
    }
  };

  // Routes
  app.all("/api/webhook", wrap(webhookHandler));
  app.all("/api/whatsapp/send", wrap(sendHandler));
  app.all("/api/whatsapp/mode", wrap(modeHandler));
  app.all("/api/whatsapp/conversations", wrap(conversationsHandler));
  app.all("/api/whatsapp/messages", wrap(messagesHandler));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FAILED_TO_START_SERVER", err);
});
