import { Request, Response } from "express";
import axios from "axios";
import { db, FieldValue } from "../lib/firebase-admin.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_AI_MODEL = "google/gemini-2.0-flash-lite:free";
const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID || "aerovax_default";

export default async function handler(req: Request, res: Response) {
  // Verification (GET)
  if (req.method === "GET") {
    const hubMode = req.query['hub.mode'];
    const hubVerifyToken = req.query['hub.verify_token'];
    const hubChallenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;

    if (hubMode === 'subscribe' && hubVerifyToken === verifyToken) {
      console.log('--- WEBHOOK VERIFIED ---');
      return res.status(200).send(hubChallenge);
    } else {
      console.warn('--- WEBHOOK VERIFICATION FAILED ---');
      return res.sendStatus(403);
    }
  }

  // Incoming Message (POST)
  if (req.method === "POST") {
    const body = req.body;
    res.sendStatus(200); // Quick 200 to Meta

    (async () => {
      try {
        if (!body.object) return;

        if (
          body.entry &&
          body.entry[0].changes &&
          body.entry[0].changes[0] &&
          body.entry[0].changes[0].value.messages &&
          body.entry[0].changes[0].value.messages[0]
        ) {
          console.log('--- WHATSAPP INCOMING MESSAGE ---');
          const message = body.entry[0].changes[0].value.messages[0];
          const contact = body.entry[0].changes[0].value.contacts?.[0];
          const from = message.from; 
          const waMsgId = message.id;
          const msgBody = message.text ? message.text.body : "";
          const parentName = contact?.profile?.name || "Parent";
          
          const cleanFrom = from.replace(/\D/g, "");
          
          // Find school and student
          let matchedStudentSnap = await db.collectionGroup("students")
            .where("father_phone", "in", [from, cleanFrom])
            .limit(1)
            .get();
          
          if (matchedStudentSnap.empty) {
            matchedStudentSnap = await db.collectionGroup("students")
              .where("mother_phone", "in", [from, cleanFrom])
              .limit(1)
              .get();
          }
          
          let schoolId = DEFAULT_SCHOOL_ID;
          let studentName = parentName;
          let studentId = "unknown";

          if (!matchedStudentSnap.empty) {
            const studentDoc = matchedStudentSnap.docs[0];
            const studentData = studentDoc.data();
            studentName = studentData.name;
            studentId = studentDoc.id;
            const pathParts = studentDoc.ref.path.split("/");
            if (pathParts[0] === "schools") schoolId = pathParts[1];
          }

          // 3. Find or create conversation
          const convRef = db.doc(`schools/${schoolId}/whatsapp_conversations/${cleanFrom}`);
          const convDoc = await convRef.get();
          
          let conversationData = convDoc.exists ? convDoc.data() : null;

          if (!convDoc.exists) {
            conversationData = {
              id: cleanFrom,
              conversation_id: cleanFrom,
              parent_phone: cleanFrom,
              parent_name: studentName,
              linked_student_id: studentId,
              linked_student_name: studentName,
              mode: "ai", 
              last_message: msgBody,
              last_message_at: FieldValue.serverTimestamp(),
              unread_count: 1,
              school_id: schoolId,
              created_at: FieldValue.serverTimestamp(),
              updated_at: FieldValue.serverTimestamp()
            };
            await convRef.set(conversationData);
            console.log(`[Webhook] Created new conversation: ${cleanFrom} in school ${schoolId}`);
          } else {
            await convRef.update({
              last_message: msgBody,
              last_message_at: FieldValue.serverTimestamp(),
              unread_count: FieldValue.increment(1),
              updated_at: FieldValue.serverTimestamp(),
              parent_name: studentName,
              linked_student_id: studentId,
              linked_student_name: studentName
            });
            conversationData = (await convRef.get()).data();
          }

          // 4. Save Message
          await convRef.collection("messages").add({
            conversation_id: cleanFrom,
            whatsapp_message_id: waMsgId,
            message_text: msgBody,
            message_type: "text",
            direction: "inbound",
            sender_type: "parent",
            status: "delivered",
            created_at: FieldValue.serverTimestamp(),
            delivered_at: FieldValue.serverTimestamp(),
            school_id: schoolId
          });

          // 5. AI Auto-Reply Logic
          if (conversationData?.mode === "ai" && OPENROUTER_API_KEY) {
            const aiSettingsSnap = await db.doc(`schools/${schoolId}/settings/whatsapp_ai_settings`).get();
            const settings = aiSettingsSnap.exists ? aiSettingsSnap.data() : null;

            if (settings && settings.is_enabled === false) {
              console.log(`AI disabled for school ${schoolId}`);
              return;
            }

            const systemPrompt = settings?.prompt_template || "You are a specialized school assistant. You ONLY talk about school timings, fees, and events.";
            const fallBack = settings?.fall_back_message || "Please contact the school office for confirmation.";

            try {
              const aiResponseRaw = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                  model: DEFAULT_AI_MODEL,
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: msgBody }
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

              let aiResponse = aiResponseRaw.data.choices[0].message.content;
              if (!aiResponse || aiResponse.length < 2) aiResponse = fallBack;

              // Send WhatsApp reply
              const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
              const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

              if (ACCESS_TOKEN && PHONE_NUMBER_ID) {
                const replyRes = await axios.post(
                  `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
                  {
                    messaging_product: "whatsapp",
                    to: cleanFrom,
                    type: "text",
                    text: { body: aiResponse }
                  },
                  { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
                );
                
                const waReplyId = replyRes.data.messages[0].id;

                // Save AI Reply
                const aiMsgRef = await convRef.collection("messages").add({
                  conversation_id: cleanFrom,
                  whatsapp_message_id: waReplyId,
                  message_text: aiResponse,
                  message_type: "text",
                  direction: "outbound",
                  sender_type: "ai",
                  status: "sent",
                  created_at: FieldValue.serverTimestamp(),
                  sent_at: FieldValue.serverTimestamp(),
                  school_id: schoolId
                });

                // Add Delivery Log for AI
                await db.collection(`schools/${schoolId}/whatsapp_delivery_logs`).add({
                  message_id: aiMsgRef.id,
                  whatsapp_message_id: waReplyId,
                  recipient: cleanFrom,
                  status: "sent",
                  sent_at: FieldValue.serverTimestamp(),
                  type: "text",
                  school_id: schoolId
                });

                await convRef.update({
                  last_message: aiResponse,
                  last_message_at: FieldValue.serverTimestamp(),
                  updated_at: FieldValue.serverTimestamp(),
                  unread_count: 0
                });
                console.log(`AI Replied: ${waReplyId}`);
              }
            } catch (aiErr: any) {
              console.error("AI/Meta Error:", aiErr.response?.data || aiErr.message);
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
           
           const msgSnap = await db.collectionGroup("messages")
            .where("whatsapp_message_id", "==", waMsgId)
            .limit(1)
            .get();
          
          if (!msgSnap.empty) {
            const updateData: any = { status: newStatus };
            if (newStatus === "delivered") updateData.delivered_at = FieldValue.serverTimestamp();
            if (newStatus === "read") updateData.read_at = FieldValue.serverTimestamp();
            await msgSnap.docs[0].ref.update(updateData);
          }
        }
      } catch (err) {
        console.error("Webhook Error:", err);
      }
    })();
  }
}
