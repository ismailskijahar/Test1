import { Request, Response } from "express";
import { db } from "../../lib/firebase-admin.js";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") return res.sendStatus(405);

  const { schoolId } = req.query;
  if (!schoolId) return res.status(400).json({ error: "schoolId required" });

  try {
    const snap = await db.collection(`schools/${schoolId}/whatsapp_conversations`)
      .orderBy("last_message_at", "desc")
      .get();
    
    const conversations = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
