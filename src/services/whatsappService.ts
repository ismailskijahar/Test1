import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  doc, 
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import axios from 'axios';

export interface WhatsAppConversation {
  id: string;
  phone: string;
  name: string;
  mode: 'ai' | 'human';
  school_id: string;
  unread_count: number;
  last_message?: string;
  updated_at: any;
  created_at: any;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'admin' | 'system';
  content: string;
  type?: 'text' | 'image' | 'audio' | 'document' | 'video' | 'voice' | 'sticker';
  media_id?: string | null;
  whatsapp_msg_id?: string;
  school_id: string;
  created_at: any;
}

export const whatsappService = {
  // Get conversations for a school
  getConversations: async (schoolId: string) => {
    const path = `schools/${schoolId}/whatsapp_conversations`;
    try {
      const q = query(collection(db, path), orderBy('updated_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WhatsAppConversation[];
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }
  },

  // Subscribe to conversations for real-time updates
  subscribeToConversations: (schoolId: string, callback: (conversations: WhatsAppConversation[]) => void) => {
    const path = `schools/${schoolId}/whatsapp_conversations`;
    const q = query(collection(db, path), orderBy('updated_at', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WhatsAppConversation[];
      callback(convs);
    }, (error) => {
      console.error("Subscription error (conversations):", error);
    });
  },

  // Get messages for a specific conversation
  getMessages: async (schoolId: string, conversationId: string) => {
    const path = `schools/${schoolId}/whatsapp_conversations/${conversationId}/messages`;
    try {
      const q = query(
        collection(db, path), 
        orderBy('created_at', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WhatsAppMessage[];
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  },

  // Subscribe to messages for real-time chat
  subscribeToMessages: (schoolId: string, conversationId: string, callback: (messages: WhatsAppMessage[]) => void) => {
    const path = `schools/${schoolId}/whatsapp_conversations/${conversationId}/messages`;
    const q = query(
      collection(db, path), 
      orderBy('created_at', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WhatsAppMessage[];
      callback(msgs);
    }, (error) => {
      console.error("Subscription error (messages):", error);
    });
  },

  // Update conversation mode
  updateMode: async (schoolId: string, conversationId: string, mode: 'ai' | 'human') => {
    try {
      await axios.patch('/api/whatsapp/mode', {
        school_id: schoolId,
        conversation_id: conversationId,
        mode
      });
      return true;
    } catch (error) {
      console.error("Error updating mode:", error);
      return false;
    }
  },

  // Mark messages as read
  markAsRead: async (schoolId: string, conversationId: string) => {
    const path = `schools/${schoolId}/whatsapp_conversations/${conversationId}`;
    try {
      await updateDoc(doc(db, `schools/${schoolId}/whatsapp_conversations`, conversationId), { 
        unread_count: 0 
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  },

  // Send a manual message from dashboard
  sendMessage: async (schoolId: string, conversationId: string, phone: string, content: string) => {
    try {
      // 1. Send via Meta API (This should ideally happen through our server API to keep keys secret)
      // For simplicity in this demo, if the keys were in client, we'd use them, 
      // but guidelines say keep keys server-side.
      // So we'll call our own server endpoint.
      const response = await axios.post('/api/whatsapp/send', {
        school_id: schoolId,
        conversation_id: conversationId,
        to: phone,
        message: content
      });

      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
};
