import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import fs from "fs";

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

// Webhook handler logic
const handleWebhookVerification = (req: express.Request, res: express.Response) => {
  try {
    const hubMode = req.query['hub.mode'];
    const hubVerifyToken = req.query['hub.verify_token'];
    const hubChallenge = req.query['hub.challenge'];
    const debug = req.query['debug'] === 'true';

    // Critical Meta Bot Logging
    console.log('--- WEBHOOK VERIFICATION ATTEMPT ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User-Agent:', req.headers['user-agent']);
    console.log('Origin:', req.headers['origin'] || 'N/A');
    console.log('Mode:', hubMode);
    console.log('Token exists:', !!hubVerifyToken);
    console.log('Challenge exists:', !!hubChallenge);

    const VERIFY_TOKEN =
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (debug) {
      return res.json({
        verifyTokenExists: !!VERIFY_TOKEN,
        receivedMode: hubMode,
        challengeExists: !!hubChallenge,
        userAgent: req.headers['user-agent'],
        headers: req.headers
      });
    }

    if (!VERIFY_TOKEN) {
      console.error('CRITICAL: WHATSAPP_VERIFY_TOKEN is missing in environment.');
      return res.status(500).send('Missing verify token');
    }

    if (hubMode === 'subscribe' && hubVerifyToken === VERIFY_TOKEN) {
      console.log('VERIFICATION SUCCESSFUL - Sending Challenge');
      // Set header manually and send the raw challenge
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(String(hubChallenge || ''));
    }

    console.error('VERIFICATION FAILED: Token mismatch or invalid mode.');
    return res.status(403).send('Forbidden');
  } catch (error) {
    console.error('Webhook GET Error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

// EXTREMELY IMPORTANT: WEBHOOK ROUTES MUST BE BEFORE express.json() 
// and any other middleware to avoid Meta verification failures.
app.head("/api/webhook", (req, res) => res.status(200).end());
app.get("/api/webhook", handleWebhookVerification);
app.get("/api/whatsapp/webhook", handleWebhookVerification);

app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const handleInboundWebhook = async (req: express.Request, res: express.Response) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // parent phone
      const msgId = message.id;
      const msgBody = message.text ? message.text.body : "";
      
      console.log(`Received WhatsApp from ${from}: ${msgBody}`);

      try {
        // Find which school this parent belongs to
        const studentsSnapshot = await db.collectionGroup("students")
          .where("parent_phone", "==", from)
          .limit(1)
          .get();
        
        let schoolId = "default";
        let studentName = "Unknown Parent";
        let studentId = "unknown";

        if (!studentsSnapshot.empty) {
          const studentDoc = studentsSnapshot.docs[0];
          const studentData = studentDoc.data();
          studentName = studentData.name;
          studentId = studentDoc.id;
          
          // Reconstruct schoolId from path: schools/{schoolId}/students/{studentId}
          const pathParts = studentDoc.ref.path.split("/");
          if (pathParts[0] === "schools") {
            schoolId = pathParts[1];
          }
        }

        // 1. Find or create conversation in school-scoped path
        const convRef = db.collection(`schools/${schoolId}/whatsapp_conversations`).doc(from);
        const convDoc = await convRef.get();
        
        let conversationData = convDoc.exists ? convDoc.data() : null;

        if (!convDoc.exists) {
          conversationData = {
            parent_phone: from,
            parent_name: studentName,
            student_id: studentId,
            last_message: msgBody,
            last_message_at: FieldValue.serverTimestamp(),
            unread_count: 1,
            mode: "ai", 
            school_id: schoolId
          };
          await convRef.set(conversationData);
        } else {
          await convRef.update({
            last_message: msgBody,
            last_message_at: FieldValue.serverTimestamp(),
            unread_count: FieldValue.increment(1)
          });
          // Refresh conversationData for logic below
          conversationData = (await convRef.get()).data();
        }

        // 2. Save Message
        await convRef.collection("messages").add({
          conversation_id: from,
          body: msgBody,
          timestamp: FieldValue.serverTimestamp(),
          type: "text",
          direction: "inbound",
          status: "delivered",
          school_id: schoolId
        });

        // 3. AI Agent Logic
        if (conversationData?.mode === "ai" && OPENROUTER_API_KEY) {
          const prompt = `You are an AI School Assistant for AerovaX School. 
          A parent with phone ${from} asked: "${msgBody}".
          The student name is ${studentName}.
          
          If they ask about attendance, fee, or homework, tell them you'll fetch it or direct them to the portal.
          Keep answers short, professional, and helpful. Use English and Bengali where appropriate.
          
          AerovaX School Info:
          - Timings: 8:00 AM to 2:00 PM
          - Location: Education Valley
          
          Current Request: ${msgBody}`;

          try {
            const response = await axios.post(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                model: DEFAULT_AI_MODEL,
                messages: [
                  { role: "system", content: "You are a helpful school assistant for AerovaX School." },
                  { role: "user", content: prompt }
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                  "HTTP-Referer": "https://aerovax.edu", // Optional: your site URL
                  "X-Title": "AerovaX WhatsApp Assistant", // Optional: your site name
                  "Content-Type": "application/json"
                }
              }
            );

            const aiResponse = response.data.choices[0].message.content;

            // Send WhatsApp reply
            const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
            const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

            if (ACCESS_TOKEN && PHONE_NUMBER_ID) {
              await axios.post(
                `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
                {
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: aiResponse }
                },
                { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
              );

              // Save AI Message to Firestore
              await convRef.collection("messages").add({
                conversation_id: from,
                body: aiResponse,
                timestamp: FieldValue.serverTimestamp(),
                type: "text",
                direction: "outbound",
                status: "sent",
                school_id: schoolId
              });

              await convRef.update({
                last_message: aiResponse,
                last_message_at: FieldValue.serverTimestamp()
              });
            }
          } catch (aiErr: any) {
            console.error("OpenRouter Error:", aiErr.response?.data || aiErr.message);
          }
        }
      } catch (err) {
        console.error("Error processing incoming WhatsApp:", err);
      }
    }
    // Handle Status Updates
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.statuses &&
      body.entry[0].changes[0].value.statuses[0]
    ) {
       const status = body.entry[0].changes[0].value.statuses[0];
       const msgId = status.id;
       const newStatus = status.status;
       console.log(`WhatsApp Status update for ${msgId}: ${newStatus}`);
       // TODO: Update specific message status in Firestore if tracking by msgId
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
};

// WhatsApp Webhook Events
app.post("/api/webhook", handleInboundWebhook);
app.post("/api/whatsapp/webhook", handleInboundWebhook);

// Proxy for sending WhatsApp (to keep token on server if needed, 
// though for this app we might use server-side for all logic)
app.post("/api/whatsapp/send_text", async (req, res) => {
  const { to, text, schoolId } = req.body;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      },
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      }
    );

    // Track in Firestore if sent successfully
    if (response.data && response.data.messages) {
      const msgId = response.data.messages[0].id;
      const convRef = db.collection("whatsapp_conversations").doc(to);
      
      await convRef.collection("messages").add({
        msg_id: msgId,
        body: text,
        timestamp: FieldValue.serverTimestamp(),
        type: "text",
        direction: "outbound",
        status: "sent"
      });

      await convRef.set({
        last_message: text,
        last_message_at: FieldValue.serverTimestamp(),
        parent_phone: to,
      }, { merge: true });
    }

    res.json(response.data);
  } catch (error: any) {
    console.error("WhatsApp API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post("/api/whatsapp/send", async (req, res) => {
  const { to, template, language, components, schoolId } = req.body;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: language || "en_US" },
          components: components || [],
        },
      },
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      }
    );

    // Track template message in Firestore too
    if (response.data && response.data.messages) {
      const msgId = response.data.messages[0].id;
      const convRef = db.collection("whatsapp_conversations").doc(to);
      
      await convRef.collection("messages").add({
        msg_id: msgId,
        body: `[Template: ${template}]`,
        timestamp: FieldValue.serverTimestamp(),
        type: "template",
        direction: "outbound",
        status: "sent"
      });

      await convRef.set({
        last_message: `[Template: ${template}]`,
        last_message_at: FieldValue.serverTimestamp(),
        parent_phone: to,
      }, { merge: true });
    }

    res.json(response.data);
  } catch (error: any) {
    console.error("WhatsApp API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
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
