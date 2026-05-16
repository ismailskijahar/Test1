import { adminDb } from "../../src/lib/firebase-admin.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.sendStatus(405);

  const { school_id, conversation_id } = req.query;
  if (!school_id || !conversation_id) return res.status(400).json({ error: "Missing params" });

  try {
    const snap = await adminDb.collection(`schools/${school_id}/whatsapp_conversations/${conversation_id}/messages`)
      .orderBy("created_at", "asc")
      .get();
    
    const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(messages);
  } catch (error) {
    console.error("FETCH_MESSAGES_ERROR", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}
