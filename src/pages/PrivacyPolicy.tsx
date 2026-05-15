import React from 'react';
import { motion } from 'motion/react';
import { Shield, Mail, Lock, FileText, ChevronLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = "AerovaX | Privacy Policy";
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-indigo/10 p-2 rounded-lg text-brand-indigo">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">AerovaX Privacy Policy</span>
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
              Privacy Policy – AerovaX
            </h1>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <p className="text-lg text-slate-600 leading-relaxed">
                  AerovaX is a school management and communication platform used by Labbaik English School. We are committed to protecting the privacy and security of information entrusted to us.
                </p>
              </section>

              <section className="bg-slate-50 rounded-2xl p-6 lg:p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-brand-indigo" />
                  <h2 className="text-xl font-bold text-slate-800 m-0">Information We Collect</h2>
                </div>
                <p className="text-slate-600 mb-4">We collect limited information such as:</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0 m-0">
                  {['Student details', 'Parent contact information', 'Attendance records', 'Homework updates', 'School communication messages'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-indigo" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-5 w-5 text-brand-indigo" />
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">WhatsApp Communication</h2>
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">
                  WhatsApp communication may be processed using Meta WhatsApp Cloud API to deliver essential updates directly to parents, including:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    'Attendance alerts',
                    'Fee reminders',
                    'Homework notifications',
                    'School announcements',
                    'AI-assisted parent support'
                  ].map((service, i) => (
                    <div key={i} className="p-4 bg-brand-indigo/5 border border-brand-indigo/10 rounded-xl">
                      <p className="font-semibold text-brand-indigo text-sm m-0">{service}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="h-px bg-slate-100 my-8" />

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Data Usage & Protection</h2>
                <div className="space-y-3">
                  <div className="flex gap-4 items-start">
                    <div className="mt-1 bg-emerald-100 p-1 rounded-full text-emerald-600 shrink-0">
                      <Shield className="h-3 w-3" />
                    </div>
                    <p className="text-slate-600 m-0">
                      <span className="font-bold text-slate-800">No Third-Party Sales:</span> We do not sell personal information to third parties.
                    </p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="mt-1 bg-emerald-100 p-1 rounded-full text-emerald-600 shrink-0">
                      <Shield className="h-3 w-3" />
                    </div>
                    <p className="text-slate-600 m-0">
                      <span className="font-bold text-slate-800">Secure Storage:</span> Data is securely stored using Firebase/Firestore and protected with advanced authentication and role-based access controls.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-12 p-8 bg-slate-900 rounded-2xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-5 w-5 text-brand-cyan" />
                  <h2 className="text-xl font-bold text-white tracking-tight m-0">Contact Support</h2>
                </div>
                <p className="text-slate-300 mb-6">
                  If you have questions regarding privacy or data usage, contact the school administration.
                </p>
                <div className="space-y-1 pt-4 border-t border-white/10">
                  <p className="font-bold text-lg text-white m-0">Labbaik English School</p>
                  <p className="text-slate-400 text-sm m-0 italic mb-2 font-mono">labbaikenglishschool8@gmail.com</p>
                  <p className="text-brand-cyan font-medium m-0 underline underline-offset-4">AerovaX School Management System</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>

        <footer className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6 text-slate-400 text-sm">
          <Link to="/terms-of-service" className="hover:text-brand-indigo transition-colors font-medium">Terms of Service</Link>
          <Link to="/data-deletion" className="hover:text-brand-indigo transition-colors font-medium">Data Deletion</Link>
          <p className="hidden md:block text-slate-200">|</p>
          <p>© {new Date().getFullYear()} AerovaX. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
