import { adminDb, admin } from "../../src/lib/firebase-admin";
import axios from "axios";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.sendStatus(405);

  const { school_id, conversation_id, to, message } = req.body;
  if (!message || !to || !school_id || !conversation_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("MANUAL_SEND_FAILED: Missing Meta API credentials");
    return res.status(500).json({ error: "Meta API configuration is incomplete." });
  }

  try {
    const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("MANUAL_SEND_META_SUCCESS", { to });

    const convRef = adminDb.doc(`schools/${school_id}/whatsapp_conversations/${conversation_id}`);
    
    await convRef.collection("messages").add({
      role: "admin",
      content: message,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    await convRef.update({
      last_message: message,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("MANUAL_SEND_FIRESTORE_SUCCESS");
    res.json({ success: true });
  } catch (error: any) {
    console.error("MANUAL_SEND_ERROR", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send message" });
  }
}
