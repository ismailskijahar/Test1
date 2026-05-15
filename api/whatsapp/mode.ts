import { Request, Response } from "express";
import { db, FieldValue } from "../../lib/firebase-admin.js";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "PATCH" && req.method !== "POST") return res.sendStatus(405);

  const { schoolId, conversationId, mode } = req.body;
  if (!schoolId || !conversationId || !mode) {
    return res.status(400).json({ error: "schoolId, conversationId and mode required" });
  }

  if (mode !== "ai" && mode !== "human") {
    return res.status(400).json({ error: "Invalid mode. Use 'ai' or 'human'." });
  }

  try {
    const convRef = db.doc(`schools/${schoolId}/whatsapp_conversations/${conversationId}`);
    await convRef.update({
      mode,
      updated_at: FieldValue.serverTimestamp()
    });

    console.log(`[Mode] Updated conversation ${conversationId} to ${mode}`);
    res.json({ success: true, mode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
