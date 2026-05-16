import { adminDb } from "../../src/lib/firebase-admin.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.sendStatus(405);

  const { school_id } = req.query;
  if (!school_id) return res.status(400).json({ error: "Missing school_id" });

  try {
    const snap = await adminDb.collection(`schools/${school_id}/whatsapp_conversations`)
      .orderBy("updated_at", "desc")
      .get();
    
    const conversations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(conversations);
  } catch (error) {
    console.error("FETCH_CONVERSATIONS_ERROR", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
}
