import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

if (getApps().length === 0) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      // If the key is a stringified JSON, parse it.
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized with Service Account Key.");
    } else {
      // Fallback to default (usually works in GCP/Cloud Run if permissions are set)
      initializeApp();
      console.log("Firebase Admin initialized with default credentials.");
    }
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
    // In production, we might want to throw if we strictly require the key
    if (process.env.NODE_ENV === "production" && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
       console.error("FATAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing in production.");
    }
  }
}

export const db = getFirestore();
export { FieldValue };
