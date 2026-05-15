import { Request, Response } from "express";
import { db } from "../../lib/firebase-admin.js";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") return res.sendStatus(405);

  const { schoolId, conversationId } = req.query;
  if (!schoolId || !conversationId) return res.status(400).json({ error: "schoolId and conversationId required" });

  try {
    const snap = await db.collection(`schools/${schoolId}/whatsapp_conversations/${conversationId}/messages`)
      .orderBy("created_at", "asc")
      .get();
    
    const messages = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
