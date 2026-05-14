import axios from "axios";
import { dataService } from "./dataService";
import { WhatsAppLog, Student } from "../types";

export const whatsappService = {
  /**
   * Sends a template message via our Express backend
   */
  sendTemplate: async (
    schoolId: string,
    student: Student,
    templateName: string,
    languageCode: string = "en",
    components: any[] = []
  ) => {
    const parentPhone = student.father_phone || student.mother_phone;
    if (!parentPhone) {
      console.warn(`No phone number for student ${student.name}`);
      return null;
    }

    // Standardize phone format if needed (Meta usually wants 12 digit with country code)
    // For now assuming the user provides it correctly or we'll add a helper
    const formattedPhone = parentPhone.replace(/\D/g, "");

    try {
      const response = await axios.post("/api/whatsapp/send", {
        to: formattedPhone,
        template: templateName,
        language: languageCode,
        components
      });

      // Log the success in Firestore
      const log: Omit<WhatsAppLog, 'id'> = {
        student_id: student.id,
        student_name: student.name,
        parent_phone: parentPhone,
        status: "sent",
        message: `Template: ${templateName}`,
        type: "template",
        sent_at: new Date().toISOString(),
        school_id: schoolId
      };
      
      await dataService.addWhatsAppLog(schoolId, log);
      return response.data;
    } catch (error: any) {
      console.error("WhatsApp Send Error:", error.response?.data || error.message);
      
      // Log the failure
      const log: Omit<WhatsAppLog, 'id'> = {
        student_id: student.id,
        student_name: student.name,
        parent_phone: parentPhone,
        status: "failed",
        message: error.response?.data?.error?.message || error.message,
        type: "template",
        sent_at: new Date().toISOString(),
        school_id: schoolId
      };
      await dataService.addWhatsAppLog(schoolId, log);
      
      throw error;
    }
  },

  /**
   * Automated Attendance Alert
   */
  sendAttendanceAlert: async (schoolId: string, student: Student, status: 'present' | 'absent') => {
    // Note: Template names must be pre-approved in Meta Business Suite
    // Assuming templates like 'attendance_alert' exist
    const templateName = status === 'present' ? 'attendance_present' : 'attendance_absent';
    
    // Example components for "Your child {{1}} of Class {{2}} is marked {{3}} today"
    const components = [
      {
        type: "body",
        parameters: [
          { type: "text", text: student.name },
          { type: "text", text: student.class },
          { type: "text", text: status.toUpperCase() }
        ]
      }
    ];

    return whatsappService.sendTemplate(schoolId, student, templateName, "en", components);
  },

  /**
   * Automated Fee Receipt Alert
   */
  sendFeeReceiptAlert: async (schoolId: string, student: Student, amount: number, receiptNo: string) => {
    const components = [
      {
        type: "body",
        parameters: [
          { type: "text", text: student.name },
          { type: "text", text: student.class },
          { type: "text", text: amount.toString() },
          { type: "text", text: receiptNo }
        ]
      }
    ];

    return whatsappService.sendTemplate(schoolId, student, "fee_receipt", "en", components);
  },

  /**
   * Automated Homework Alert
   */
  sendHomeworkAlert: async (schoolId: string, className: string, section: string, subject: string, title: string) => {
    // Homework alerts are usually broadcasts to multiple students
    const students = await dataService.getStudentsByClass(schoolId, className, section);
    
    const promises = students.map(student => {
      const components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: student.name },
            { type: "text", text: subject },
            { type: "text", text: title }
          ]
        }
      ];
      return whatsappService.sendTemplate(schoolId, student, "homework_alert", "en", components)
        .catch(err => console.error(`Failed to send homework WhatsApp to ${student.name}:`, err));
    });

    return Promise.all(promises);
  },

  /**
   * Manual Text Message (Human Mode)
   */
  sendTextMessage: async (schoolId: string, to: string, text: string) => {
    try {
      const response = await axios.post("/api/whatsapp/send_text", {
        to: to.replace(/\D/g, ""),
        text
      });
      return response.data;
    } catch (error: any) {
      console.error("WhatsApp Text Send Error:", error.response?.data || error.message);
      throw error;
    }
  }
};
