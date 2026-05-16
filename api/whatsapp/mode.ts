import { adminDb, admin } from "../../src/lib/firebase-admin.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== "PATCH") return res.sendStatus(405);

  const { school_id, conversation_id, mode } = req.body;
  if (!["ai", "human"].includes(mode) || !school_id || !conversation_id) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    await adminDb.doc(`schools/${school_id}/whatsapp_conversations/${conversation_id}`).update({
      mode,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("MODE_UPDATE_SUCCESS", { conversation_id, mode });
    res.json({ success: true });
  } catch (error) {
    console.error("MODE_UPDATE_ERROR", error);
    res.status(500).json({ error: "Failed to update mode" });
  }
}
