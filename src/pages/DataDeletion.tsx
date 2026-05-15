import React from 'react';
import { motion } from 'motion/react';
import { Trash2, Mail, Info, FileText, ChevronLeft, UserX } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function DataDeletion() {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = "AerovaX | Data Deletion Instructions";
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-lg text-red-500">
              <Trash2 className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">User Data Deletion</span>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-brand-indigo transition-colors text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
        >
          <div className="p-8 lg:p-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-8 tracking-tight">
              User Data Deletion Instructions
            </h1>

            <div className="prose prose-slate max-w-none space-y-8">
              <section className="flex gap-4 items-start bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600 shrink-0">
                  <Info className="h-5 w-5" />
                </div>
                <p className="text-blue-900 m-0 leading-relaxed font-medium">
                  Parents and users can request the deletion of their personal data from the AerovaX platform at any time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-indigo" />
                  How to Request Deletion
                </h2>
                <p className="text-slate-600 mb-6">
                  To request your data deletion, please contact the Labbaik English School administration via email. To ensure a smooth verification process, please include the following details in your request:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Parent/User Name', icon: '👤' },
                    { label: 'Student Name', icon: '🎓' },
                    { label: 'Registered Phone Number', icon: '📱' },
                    { label: 'Reason for Deletion', icon: '📝' }
                  ].map((field, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 italic">
                      <span className="text-lg">{field.icon}</span>
                      <span className="text-slate-700 font-medium">{field.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserX className="h-5 w-5 text-brand-indigo" />
                  Processing Time
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Upon receiving your request, our administrative team will verify your identity and the associated records. Data will be reviewed and deleted within <span className="font-bold text-slate-900">30 business days</span> of verification. 
                </p>
                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  Note: Certain records may be retained as required by educational regulatory authorities or for critical auditing purposes for a period defined by school policy.
                </p>
              </section>

              <section className="mt-12 p-8 bg-slate-900 rounded-2xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-5 w-5 text-brand-cyan" />
                  <h2 className="text-xl font-bold text-white tracking-tight m-0">Send Request</h2>
                </div>
                <p className="text-slate-300 mb-6">
                  Please send your formal deletion request to the school's official email address:
                </p>
                <div className="space-y-1 pt-4 border-t border-white/10">
                  <p className="font-bold text-lg text-white m-0 italic">labbaikenglishschool8@gmail.com</p>
                  <p className="text-brand-cyan font-medium m-0 uppercase tracking-wider text-xs">Labbaik English School Administration</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>

        <footer className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6 text-slate-400 text-sm">
          <Link to="/privacy-policy" className="hover:text-brand-indigo transition-colors font-medium">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-brand-indigo transition-colors font-medium">Terms of Service</Link>
          <p className="hidden md:block text-slate-200">|</p>
          <p>© {new Date().getFullYear()} AerovaX School Management. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
