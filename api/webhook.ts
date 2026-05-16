import { adminDb, admin } from "../src/lib/firebase-admin";
import OpenAI from "openai";
import axios from "axios";

export default async function handler(req: any, res: any) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID;

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return res.status(200).send(challenge);
    } else {
      console.warn("WEBHOOK_VERIFY_FAILED", { mode, token_match: token === VERIFY_TOKEN });
      return res.sendStatus(403);
    }
  }

  if (req.method === "POST") {
    const body = req.body;
    console.log("WEBHOOK_POST_RECEIVED");

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Handle Messages
      if (value?.messages?.[0]) {
        const message = value.messages[0];
        const contact = value.contacts?.[0];
        const from = message.from;
        const msgId = message.id;
        const name = contact?.profile?.name || from;
        const type = message.type || "text";
        
        let msgText = "";
        if (type === "text") {
          msgText = message.text?.body || "";
        } else {
          msgText = `Media message received (${type})`;
        }

        console.log("MESSAGE_PARSED", { from, msgId, type });

        try {
          // Normalize phone number
          const normalizedFrom = from.replace(/\D/g, "");

          // Resolve School ID
          let schoolId: string | null = null;
          const studentsRef = adminDb.collectionGroup("students");
          
          // Search across multiple fields
          const phoneFields = ["father_phone", "mother_phone", "phone", "parent_phone", "whatsapp_number"];
          
          for (const field of phoneFields) {
            const snap = await studentsRef.where(field, "in", [from, normalizedFrom, `+${normalizedFrom}`]).limit(1).get();
            if (!snap.empty) {
              schoolId = snap.docs[0].data().school_id;
              break;
            }
          }

          if (!schoolId) {
            if (DEFAULT_SCHOOL_ID) {
              schoolId = DEFAULT_SCHOOL_ID;
              console.log("USING_DEFAULT_SCHOOL_ID", schoolId);
            } else {
              console.error("UNKNOWN_SCHOOL_ERROR: No schoolId found for phone and no DEFAULT_SCHOOL_ID set.", { from, normalizedFrom });
              return res.status(200).send("EVENT_RECEIVED");
            }
          }

          console.log("SELECTED_SCHOOL_ID", schoolId);

          // 1. Find or create conversation
          const convsRef = adminDb.collection(`schools/${schoolId}/whatsapp_conversations`);
          const q = await convsRef.where("phone", "==", from).get();
          
          let convId = "";
          let mode = "ai";

          if (q.empty) {
            const newConv = await convsRef.add({
              phone: from,
              name,
              mode: "ai",
              school_id: schoolId,
              unread_count: 1,
              last_message: msgText,
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
              created_at: admin.firestore.FieldValue.serverTimestamp()
            });
            convId = newConv.id;
            console.log("CONVERSATION_CREATED", convId);
          } else {
            const docSnap = q.docs[0];
            convId = docSnap.id;
            // Handle backward compatibility for 'agent' mode
            const rawMode = docSnap.data().mode || "ai";
            mode = rawMode === "agent" ? "ai" : rawMode;
            
            await docSnap.ref.update({
              last_message: msgText,
              unread_count: admin.firestore.FieldValue.increment(1),
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log("CONVERSATION_UPDATED", convId);
          }

          // 2. Save User Message
          await convsRef.doc(convId).collection("messages").add({
            role: "user",
            content: msgText,
            type,
            media_id: message[type]?.id || null,
            whatsapp_msg_id: msgId,
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log("MESSAGE_SAVED_TO_FIRESTORE");

          // 3. AI Reply if in ai mode
          if (mode === "ai") {
            if (!process.env.OPENROUTER_API_KEY) {
              console.error("AI_REPLY_FAILED: OPENROUTER_API_KEY is missing");
              await convsRef.doc(convId).collection("messages").add({
                role: "system",
                content: "Error: AI assistant is temporarily unavailable due to missing configuration.",
                created_at: admin.firestore.FieldValue.serverTimestamp()
              });
              return res.status(200).send("EVENT_RECEIVED");
            }

            console.log("TRIGGERING_AI_REPLY");
            const historySnap = await convsRef.doc(convId).collection("messages")
              .orderBy("created_at", "desc")
              .limit(10)
              .get();
            
            const history = historySnap.docs
              .map(d => ({ 
                role: d.data().role, 
                content: d.data().content 
              }))
              .reverse();

            const openai = new OpenAI({
              apiKey: process.env.OPENROUTER_API_KEY,
              baseURL: "https://openrouter.ai/api/v1",
            });

            try {
              const completion = await openai.chat.completions.create({
                model: process.env.AI_MODEL || "anthropic/claude-3.5-sonnet",
                messages: [
                  { 
                    role: "system", 
                    content: `You are the AerovaX AI Assistant for a school (ID: ${schoolId}). 
                    Answer queries about attendance, fees, receipts, homework, school timings, notices, and exams.
                    Be polite and concise. 
                    If unsure, reply: "Please contact the school office for confirmation."` 
                  },
                  ...history as any
                ],
              });

              const aiReply = completion.choices[0].message.content || "I'm sorry, I couldn't process that.";
              console.log("OPENROUTER_SUCCESS");

              // Send to WhatsApp
              if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
                console.error("META_SEND_FAILED: Missing WhatsApp credentials");
                await convsRef.doc(convId).collection("messages").add({
                  role: "system",
                  content: "Error: Meta API credentials are missing. Could not send reply.",
                  created_at: admin.firestore.FieldValue.serverTimestamp()
                });
                return res.status(200).send("EVENT_RECEIVED");
              }

              const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
              await axios.post(
                url,
                {
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: aiReply },
                },
                {
                  headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              console.log("META_SEND_SUCCESS");

              await convsRef.doc(convId).collection("messages").add({
                role: "assistant",
                content: aiReply,
                created_at: admin.firestore.FieldValue.serverTimestamp()
              });

              await convsRef.doc(convId).update({
                last_message: aiReply,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
              });
            } catch (aiErr) {
              console.error("AI_PROCESSING_ERROR", aiErr);
              await convsRef.doc(convId).collection("messages").add({
                role: "system",
                content: "Error processing AI reply. Please check logs.",
                created_at: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
        } catch (err) {
          console.error("WEBHOOK_PROCESS_ERROR", err);
        }
      }

      // Handle Status Updates
      if (value?.statuses?.[0]) {
        const status = value.statuses[0];
        const statusId = status.id;
        const msgStatus = status.status;
        const recipient = status.recipient_id;
        console.log("STATUS_RECEIVED", { id: statusId, status: msgStatus });
        
        try {
          // Identify schoolId for the delivery log
          let logSchoolId = DEFAULT_SCHOOL_ID || "unknown_school";
          
          // Try to find conversation to resolve schoolId
          const convSearch = await adminDb.collectionGroup("whatsapp_conversations")
            .where("phone", "==", recipient)
            .limit(1)
            .get();
          
          if (!convSearch.empty) {
            logSchoolId = convSearch.docs[0].data().school_id;
          }

          await adminDb.collection(`schools/${logSchoolId}/whatsapp_delivery_logs`).add({
            whatsapp_msg_id: statusId,
            phone: recipient,
            status: msgStatus,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            raw: status
          });
        } catch (err) {
          console.error("STATUS_LOG_ERROR", err);
        }
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  }

  res.sendStatus(405);
}
