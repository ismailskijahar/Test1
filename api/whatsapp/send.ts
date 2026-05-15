import { Request, Response } from "express";
import axios from "axios";
import { db, FieldValue } from "../../lib/firebase-admin.js";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.sendStatus(405);

  const { to, text, schoolId, type = "text", template, language, components } = req.body;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const targetSchoolId = schoolId || process.env.DEFAULT_SCHOOL_ID || "aerovax_default";

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return res.status(500).json({ error: "WhatsApp credentials missing." });
  }

  const formattedTo = to.replace(/\D/g, "");

  try {
    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo
    };

    if (type === "text") {
      payload.type = "text";
      payload.text = { body: text };
    } else if (type === "template") {
      payload.type = "template";
      payload.template = {
        name: template,
        language: { code: language || "en_US" },
        components: components || []
      };
    }

    const response = await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
    );

    const waMsgId = response.data.messages[0].id;
    const convRef = db.doc(`schools/${targetSchoolId}/whatsapp_conversations/${formattedTo}`);
    
    // Save to Firestore
    const msgRef = await convRef.collection("messages").add({
      conversation_id: formattedTo,
      whatsapp_message_id: waMsgId,
      message_text: type === "text" ? text : `[Template: ${template}]`,
      message_type: type,
      direction: "outbound",
      sender_type: type === "text" ? "admin" : "system",
      status: "sent",
      created_at: FieldValue.serverTimestamp(),
      sent_at: FieldValue.serverTimestamp(),
      school_id: targetSchoolId
    });

    // Add Delivery Log
    await db.collection(`schools/${targetSchoolId}/whatsapp_delivery_logs`).add({
      message_id: msgRef.id,
      whatsapp_message_id: waMsgId,
      recipient: formattedTo,
      status: "sent",
      sent_at: FieldValue.serverTimestamp(),
      type: type,
      school_id: targetSchoolId
    });

    await convRef.set({
      last_message: type === "text" ? text : `[Template: ${template}]`,
      last_message_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      parent_phone: formattedTo,
      school_id: targetSchoolId
    }, { merge: true });

    res.json(response.data);
  } catch (error: any) {
    console.error("Send Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
}
