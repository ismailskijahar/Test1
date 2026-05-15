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

  // 1. Return 200 fast to Meta to avoid retry loops
  res.sendStatus(200);

  // 2. Process async to avoid blocking Meta
  (async () => {
    try {
      console.log('--- WHATSAPP WEBHOOK POST RECEIVED ---');
      
      if (!body.object) return;

      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const contact = body.entry[0].changes[0].value.contacts?.[0];
        const from = message.from; // parent phone
        const msgId = message.id;
        const msgBody = message.text ? message.text.body : "";
        const parentName = contact?.profile?.name || "Parent";
        
        console.log(`Incoming Message: From ${from} (${parentName}): "${msgBody}"`);

        // Find which school this parent belongs to
        // We clean the phone number to match formatting
        const cleanFrom = from.replace(/\D/g, "");
        
        const studentsSnapshot = await db.collectionGroup("students")
          .where("parent_phone", "in", [from, cleanFrom])
          .limit(1)
          .get();
        
        let schoolId = "default";
        let studentName = parentName;
        let studentId = "unknown";

        if (!studentsSnapshot.empty) {
          const studentDoc = studentsSnapshot.docs[0];
          const studentData = studentDoc.data();
          studentName = studentData.name;
          studentId = studentDoc.id;
          
          const pathParts = studentDoc.ref.path.split("/");
          if (pathParts[0] === "schools") {
            schoolId = pathParts[1];
          }
          console.log(`Matched Student: ${studentName} in School: ${schoolId}`);
        } else {
          console.warn(`No student found for phone ${from}. Using default school.`);
        }

        // 3. Find or create conversation
        const convRef = db.collection(`schools/${schoolId}/whatsapp_conversations`).doc(from);
        const convDoc = await convRef.get();
        
        let conversationData = convDoc.exists ? convDoc.data() : null;

        if (!convDoc.exists) {
          conversationData = {
            id: from,
            parent_phone: from,
            parent_name: studentName,
            student_id: studentId,
            last_message: msgBody,
            last_message_at: FieldValue.serverTimestamp(),
            unread_count: 1,
            mode: "ai", 
            school_id: schoolId,
            created_at: FieldValue.serverTimestamp()
          };
          await convRef.set(conversationData);
          console.log(`Created new conversation for ${from}`);
        } else {
          await convRef.update({
            last_message: msgBody,
            last_message_at: FieldValue.serverTimestamp(),
            unread_count: FieldValue.increment(1),
            school_id: schoolId // Ensure it's correct
          });
          conversationData = (await convRef.get()).data();
        }

        // 4. Save Message in subcollection
        const msgRef = await convRef.collection("messages").add({
          conversation_id: from,
          whatsapp_message_id: msgId,
          body: msgBody,
          timestamp: FieldValue.serverTimestamp(),
          type: "text",
          direction: "inbound",
          sender_type: "parent",
          status: "delivered",
          school_id: schoolId
        });
        console.log(`Saved message to Firestore: ${msgRef.id}`);

        // 5. AI Auto-Reply Logic
        if (conversationData?.mode === "ai" && OPENROUTER_API_KEY) {
          console.log(`AI mode active. Generating reply via OpenRouter...`);
          const prompt = `You are a specialized AI Assistant for AerovaX School and its management software. 
          
          STRICT LIMITATION: You MUST only answer questions related to AerovaX School (timings, location, fees, attendance, homework, events) or the AerovaX School Management Software.
          
          If the user asks about anything else (general knowledge, coding, unrelated advice, other schools, etc.), you must politely inform them that you are only programmed to assist with AerovaX School and its software.
          
          Current Inquiry: "${msgBody}"
          Student Name: ${studentName}
          Parent Phone: ${from}
          
          AerovaX School Details:
          - Timings: 8:00 AM to 2:00 PM
          - Location: Education Valley
          - Website: aerovax.edu
          
          Response Guidelines:
          - Keep it short, professional, and helpful.
          - Use English and Bengali where appropriate.
          - If they ask for specific private data (like exact fees), tell them to log into the portal.`;

          try {
            const aiResponseRaw = await axios.post(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                model: DEFAULT_AI_MODEL,
                messages: [
                  { 
                    role: "system", 
                    content: "You are a specialized school assistant. You ONLY talk about AerovaX School and its software. You decline all other topics politely." 
                  },
                  { role: "user", content: prompt }
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                  "HTTP-Referer": "https://aerovax.edu",
                  "X-Title": "AerovaX WhatsApp Assistant",
                  "Content-Type": "application/json"
                }
              }
            );

            const aiResponse = aiResponseRaw.data.choices[0].message.content;
            console.log(`AI Reply Generated: ${aiResponse.substring(0, 50)}...`);

            // 6. Send WhatsApp reply via Meta Graph API v25.0 (as requested in Step 7)
            const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
            const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

            if (ACCESS_TOKEN && PHONE_NUMBER_ID) {
              const replyRes = await axios.post(
                `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
                {
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: aiResponse }
                },
                { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
              );
              
              const waReplyId = replyRes.data.messages[0].id;
              console.log(`AI Reply sent to WhatsApp: ${waReplyId}`);

              // 7. Save AI Message to Firestore
              await convRef.collection("messages").add({
                conversation_id: from,
                whatsapp_message_id: waReplyId,
                body: aiResponse,
                timestamp: FieldValue.serverTimestamp(),
                type: "text",
                direction: "outbound",
                sender_type: "ai",
                status: "sent",
                school_id: schoolId
              });

              await convRef.update({
                last_message: aiResponse,
                last_message_at: FieldValue.serverTimestamp(),
                unread_count: 0 // AI reply clears unread count
              });
            } else {
              console.error("WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER_ID missing. Cannot send AI reply.");
            }
          } catch (aiErr: any) {
            console.error("OpenRouter or Meta API Error:", aiErr.response?.data || aiErr.message);
          }
        }
      }
      
      // Handle Status Updates
      else if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.statuses &&
        body.entry[0].changes[0].value.statuses[0]
      ) {
         const status = body.entry[0].changes[0].value.statuses[0];
         const waMsgId = status.id;
         const newStatus = status.status;
         const recipient = status.recipient_id;
         
         console.log(`Status Update: ${waMsgId} for ${recipient} is now ${newStatus}`);
         
         // Find message in any school's conversation and update it
         // This is a bit expensive, but correct for delivery tracking
         const msgSnap = await db.collectionGroup("messages")
          .where("whatsapp_message_id", "==", waMsgId)
          .limit(1)
          .get();
        
        if (!msgSnap.empty) {
          await msgSnap.docs[0].ref.update({ status: newStatus });
          console.log(`Updated message ${waMsgId} status to ${newStatus}`);
        }
      }
    } catch (err) {
      console.error("Webhook Background Processing Error:", err);
    }
  })();
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
  const targetSchoolId = schoolId || "default";

  // 1. Validate Env Variables
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    const missing = !ACCESS_TOKEN ? "WHATSAPP_ACCESS_TOKEN" : "WHATSAPP_PHONE_NUMBER_ID";
    console.error(`FATAL: Missing ${missing} in environment.`);
    return res.status(500).json({ 
      error: "WhatsApp configuration missing on server.", 
      details: `Missing ${missing}` 
    });
  }

  // 2. Format Recipient Number (Meta requires digits only)
  const formattedTo = to.replace(/\D/g, "");
  
  // 3. Debug Logging
  console.log("--- SENDING WHATSAPP TEXT MESSAGE ---");
  console.log("TO (Original):", to);
  console.log("TO (Formatted):", formattedTo);
  console.log("MESSAGE:", text);
  console.log("PHONE NUMBER ID:", PHONE_NUMBER_ID);

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
        type: "text",
        text: { body: text },
      },
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      }
    );

    console.log("META API SUCCESS:", response.data);

    // 4. Track in Firestore ONLY if sent successfully
    if (response.data && response.data.messages) {
      const waMsgId = response.data.messages[0].id;
      const convRef = db.collection(`schools/${targetSchoolId}/whatsapp_conversations`).doc(formattedTo);
      
      await convRef.collection("messages").add({
        whatsapp_message_id: waMsgId,
        body: text,
        timestamp: FieldValue.serverTimestamp(),
        type: "text",
        direction: "outbound",
        sender_type: "human",
        status: "sent",
        school_id: targetSchoolId
      });

      await convRef.set({
        last_message: text,
        last_message_at: FieldValue.serverTimestamp(),
        parent_phone: formattedTo,
        school_id: targetSchoolId
      }, { merge: true });
    }

    res.json(response.data);
  } catch (error: any) {
    const metaError = error.response?.data || { error: error.message };
    console.error("META API FAILURE:", JSON.stringify(metaError));
    
    // Check for common trial number errors
    if (metaError.error?.code === 131030) {
      return res.status(400).json({ 
        error: "Recipient not verified.", 
        details: "During trial mode, you can only send to verified numbers." 
      });
    }

    res.status(error.response?.status || 500).json(metaError);
  }
});

app.post("/api/whatsapp/send", async (req, res) => {
  const { to, template, language, components, schoolId } = req.body;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const targetSchoolId = schoolId || "default";

  // 1. Validate Env Variables
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    const missing = !ACCESS_TOKEN ? "WHATSAPP_ACCESS_TOKEN" : "WHATSAPP_PHONE_NUMBER_ID";
    console.error(`FATAL: Missing ${missing} in environment.`);
    return res.status(500).json({ 
      error: "WhatsApp configuration missing on server.", 
      details: `Missing ${missing}` 
    });
  }

  // 2. Format Recipient Number
  const formattedTo = to.replace(/\D/g, "");

  // 3. Debug Logging
  console.log("--- SENDING WHATSAPP TEMPLATE ---");
  console.log("TO:", formattedTo);
  console.log("TEMPLATE:", template);
  console.log("PHONE NUMBER ID:", PHONE_NUMBER_ID);

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: formattedTo,
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

    console.log("META API SUCCESS (Template):", response.data);

    // 4. Track template message in Firestore ONLY if successful
    if (response.data && response.data.messages) {
      const waMsgId = response.data.messages[0].id;
      const convRef = db.collection(`schools/${targetSchoolId}/whatsapp_conversations`).doc(formattedTo);
      
      await convRef.collection("messages").add({
        whatsapp_message_id: waMsgId,
        body: `[Template: ${template}]`,
        timestamp: FieldValue.serverTimestamp(),
        type: "template",
        direction: "outbound",
        sender_type: "system",
        status: "sent",
        school_id: targetSchoolId
      });

      await convRef.set({
        last_message: `[Template: ${template}]`,
        last_message_at: FieldValue.serverTimestamp(),
        parent_phone: formattedTo,
        school_id: targetSchoolId
      }, { merge: true });
    }

    res.json(response.data);
  } catch (error: any) {
    const metaError = error.response?.data || { error: error.message };
    console.error("META API FAILURE (Template):", JSON.stringify(metaError));
    res.status(error.response?.status || 500).json(metaError);
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
