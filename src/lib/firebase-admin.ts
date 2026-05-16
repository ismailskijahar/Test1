import admin from "firebase-admin";

export function getAdmin() {
  if (admin.apps.length > 0) return admin;

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY exists but is invalid JSON");
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // If we're in a cloud environment (Vercel/Cloud Run) and no key is provided, throw error
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY missing in server environment.");
    }

    // Local development fallback: try to use application default credentials or project ID from env
    try {
      admin.initializeApp();
    } catch (err) {
      console.warn("Firebase Admin initialization failed. Ensure you have FIREBASE_SERVICE_ACCOUNT_KEY or are in a supported environment.");
      throw err;
    }
  }

  return admin;
}

export const adminDb = getAdmin().firestore();
export { admin };
