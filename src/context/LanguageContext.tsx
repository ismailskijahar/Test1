import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi' | 'bn' | 'ur' | 'es' | 'fr' | 'ar' | 'te' | 'ta' | 'ml' | 'kn' | 'gu' | 'mr' | 'pa' | 'it' | 'de' | 'ru' | 'zh' | 'ja' | 'ko';

interface TranslationDict {
  [key: string]: Partial<Record<Language, string>>;
}

const translations: TranslationDict = {
  confirm: {
    en: 'Confirm',
    hi: 'पुष्टि करें',
    bn: 'নিশ্চিত করুন',
    ur: 'تصدیق کریں',
    es: 'Confirmar',
    fr: 'Confirmer',
    ar: 'تأكيد'
  },
  edit: {
    en: 'Edit',
    hi: 'संपादित करें',
    bn: 'সম্পাদনা করুন',
    ur: 'ترمیم',
    es: 'Editar',
    fr: 'Modifier',
    ar: 'تعديل'
  },
  delete: {
    en: 'Delete',
    hi: 'मिटाएं',
    bn: 'মুছে ফেলুন',
    ur: 'حذف کریں',
    es: 'Eliminar',
    fr: 'Supprimer',
    ar: 'حذف'
  },
  confirm_delete_student: {
    en: 'Are you sure you want to delete this student record? This action cannot be undone.',
    hi: 'क्या आप वाकई इस छात्र रिकॉर्ड को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।',
    bn: 'আপনি কি নিশ্চিত যে আপনি এই ছাত্রের রেকর্ড মুছে ফেলতে চান? এই অ্যাকশনটি ফিরিয়ে আনা যাবে না।'
  },
  confirm_delete_teacher: {
    en: 'Are you sure you want to delete this teacher record? This action cannot be undone.',
    hi: 'क्या आप वाकई इस शिक्षक रिकॉर्ड को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।',
    bn: 'আপনি কি নিশ্চিত যে আপনি এই শিক্ষকের রেকর্ড মুছে ফেলতে চান? এই অ্যাকশনটি ফিরিয়ে আনা যাবে না।'
  },
  update_student: {
    en: 'Update Student Record',
    hi: 'छात्र रिकॉर्ड अपडेट करें',
    bn: 'ছাত্রের রেকর্ড আপডেট করুন'
  },
  // Common UI
  dashboard: {
    en: 'Dashboard',
    hi: 'डैशबोर्ड',
    bn: 'ড্যাশবোর্ড',
    ur: 'ڈیش بورڈ',
    es: 'Tablero',
    fr: 'Tableau de bord',
    ar: 'لوحة القيادة'
  },
  students: {
    en: 'Students',
    hi: 'छात्र',
    bn: 'ছাত্র',
    ur: 'طلباء',
    es: 'Estudiantes',
    fr: 'Étudiants',
    ar: 'طلاب'
  },
  teachers: {
    en: 'Teachers',
    hi: 'शिक्षक',
    bn: 'শিক্ষক',
    ur: 'اساتذہ',
    es: 'Profesores',
    fr: 'Enseignants',
    ar: 'معلمون'
  },
  parents: {
    en: 'Parents',
    hi: 'अभिभावक',
    bn: 'অভিভাবক',
    ur: 'والدین',
    es: 'Padres',
    fr: 'Parents',
    ar: 'أولياء الأمور'
  },
  settings: {
    en: 'Settings',
    hi: 'सेटिंग्स',
    bn: 'সেটিংস',
    ur: 'ترتیبات',
    es: 'Ajustes',
    fr: 'Paramètres',
    ar: 'إعدادات'
  },
  search: {
    en: 'Search',
    hi: 'खोजें',
    bn: 'অনুসন্ধান',
    ur: 'تلاش کریں',
    es: 'Buscar',
    fr: 'Rechercher',
    ar: 'بحث'
  },
  logout: {
    en: 'Logout',
    hi: 'लॉगआउट',
    bn: 'লগআউট',
    ur: 'لاگ آؤٹ',
    es: 'Cerrar sesión',
    fr: 'Déconnexion',
    ar: 'تسجيل الخروج'
  },
  total_students: {
    en: 'Total Students',
    hi: 'कुल छात्र',
    bn: 'মোট ছাত্র',
    ur: 'کل طلباء',
    es: 'Total de estudiantes',
    fr: 'Total des étudiants',
    ar: 'إجمالي الطلاب'
  },
  active_classes: {
    en: 'Active Classes',
    hi: 'सक्रिय कक्षाएं',
    bn: 'সক্রিয় ক্লাস',
    ur: 'فعال کلاسیں',
    es: 'Clases activas',
    fr: 'Classes actives',
    ar: 'فصول نشطة'
  },
  attendance_rate: {
    en: 'Attendance Rate',
    hi: 'उपस्थिति दर',
    bn: 'উপস্থিতির হার',
    ur: 'حاضری کی شرح',
    es: 'Tasa de asistencia',
    fr: 'Taux de présence',
    ar: 'معدل الحضور'
  },
  new_enrolments: {
    en: 'New Enrolments',
    hi: 'नया नामांकन',
    bn: 'নতুন ভর্তি',
    ur: 'نئی رجسٹریشن',
    es: 'Nuevas inscripciones',
    fr: 'Nouvelles inscriptions',
    ar: 'تسجيلات جديدة'
  },
  welcome_back: {
    en: 'Welcome back',
    hi: 'वापसी पर स्वागत है',
    bn: 'স্বাগত',
    ur: 'خوش آمدید',
    es: 'Bienvenido de nuevo',
    fr: 'Bon retour',
    ar: 'مرحباً بعودتك'
  },
  admin_portal: {
    en: 'Admin Portal',
    hi: 'एडमिन पोर्टल',
    bn: 'অ্যাডমিন পোর্টাল',
    ur: 'ایڈمن پورٹل',
    es: 'Portal de administrador',
    fr: 'Portail administrateur',
    ar: 'بوابة المسؤول'
  },
  student_directory: {
    en: 'Student Directory',
    hi: 'छात्र निर्देशिका',
    bn: 'ছাত্র ডিরেক্টরি',
    ur: 'طلباء ڈائرکٹری',
    es: 'Directorio de estudiantes',
    fr: 'Répertoire des étudiants',
    ar: 'دليل الطلاب'
  },
  teacher_directory: {
    en: 'Teachers Faculty',
    hi: 'शिक्षक संकाय',
    bn: 'শিক্ষক ফ্যাকাল্টি',
    ur: 'اساتذہ فیکلٹی',
    es: 'Facultad de profesores',
    fr: 'Faculté des enseignants',
    ar: 'هيئة التدريس'
  },
  enroll_student: {
    en: 'Enroll New Student',
    hi: 'नया छात्र नामांकित करें',
    bn: 'নতুন ছাত্র ভর্তি করুন',
    ur: 'نئے طالب علم کا اندراج کریں',
    es: 'Inscribir nuevo estudiante',
    fr: 'Inscrire un nouvel étudiant',
    ar: 'تسجيل طالب جديد'
  },
  add_teacher: {
    en: 'Add New Teacher',
    hi: 'नया शिक्षक जोड़ें',
    bn: 'নতুন শিক্ষক যোগ করুন',
    ur: 'نیا استاد شامل کریں',
    es: 'Agregar nuevo profesor',
    fr: 'Ajouter un nouvel enseignant',
    ar: 'إضافة معلم جديد'
  },
  print_list: {
    en: 'Print Student List',
    hi: 'छात्र सूची प्रिंट करें',
    bn: 'ছাত্র তালিকা প্রিন্ট করুন',
    ur: 'طلباء کی فہرست پرنٹ کریں',
    es: 'Imprimir lista de estudiantes',
    fr: 'Imprimer la liste des étudiants',
    ar: 'طباعة قائمة الطلاب'
  },
  filters: {
    en: 'Filters',
    hi: 'फ़िल्टर',
    bn: 'ফিল্টার',
    ur: 'فلٹرز',
    es: 'Filtros',
    fr: 'Filtres',
    ar: 'مرشحات'
  },
  by_status: {
    en: 'By Status',
    hi: 'स्थिति के अनुसार',
    bn: 'স্ট্যাটাস অনুযায়ী',
    ur: 'حالت کے لحاظ سے',
    es: 'Por estado',
    fr: 'Par statut',
    ar: 'حسب الحالة'
  },
  by_class: {
    en: 'By Class',
    hi: 'कक्षा के अनुसार',
    bn: 'ক্লাস অনুযায়ী',
    ur: 'کلاس کے لحاظ سے',
    es: 'Por clase',
    fr: 'Par classe',
    ar: 'حسب الفصل'
  },
  all: {
    en: 'All',
    hi: 'सभी',
    bn: 'সব',
    ur: 'تمام',
    es: 'Todos',
    fr: 'Tout',
    ar: 'الكل'
  },
  active: {
    en: 'Active',
    hi: 'सक्रिय',
    bn: 'সক্রিয়',
    ur: 'فعال',
    es: 'Activo',
    fr: 'Actif',
    ar: 'نشط'
  },
  dropped: {
    en: 'Dropped',
    hi: 'छोड़ा हुआ',
    bn: 'ড্রপआउट',
    ur: 'چھوڑ دیا',
    es: 'Retirado',
    fr: 'Abandonné',
    ar: 'منقطع'
  },
  clear_filters: {
    en: 'Clear All Filters',
    hi: 'सभी फ़िल्टर साफ़ करें',
    bn: 'সব ফিল্টার মুছুন',
    ur: 'تمام فلٹرز ختم کریں',
    es: 'Limpiar todos los filtros',
    fr: 'Effacer tous les filtres',
    ar: 'مسح جميع المرشحات'
  },
  student_name: {
    en: 'Student Name',
    hi: 'छात्र का नाम',
    bn: 'ছাত্রের নাম',
    ur: 'طالب علم کا نام',
    es: 'Nombre del estudiante',
    fr: 'Nom de l\'étudiant',
    ar: 'اسم الطالب'
  },
  father_name: {
    en: 'Father\'s Name',
    hi: 'पिता का नाम',
    bn: 'পিতার নাম',
    ur: 'والد کا نام',
    es: 'Nombre del padre',
    fr: 'Nom du père',
    ar: 'اسم الأب'
  },
  mother_name: {
    en: 'Mother\'s Name',
    hi: 'माता का नाम',
    bn: 'মাতার নাম',
    ur: 'والدہ کا نام',
    es: 'Nombre de la madre',
    fr: 'Nom de la mère',
    ar: 'اسم الأم'
  },
  roll_no: {
    en: 'Roll No',
    hi: 'रोल नंबर',
    bn: 'রোল নম্বর',
    ur: 'رول نمبر',
    es: 'Núm. de lista',
    fr: 'N° de rôle',
    ar: 'رقم الجلوس'
  },
  phone: {
    en: 'Phone',
    hi: 'फ़ोन',
    bn: 'ফোন',
    ur: 'فون',
    es: 'Teléfono',
    fr: 'Téléphone',
    ar: 'الهاتف'
  },
  dob: {
    en: 'Date of Birth',
    hi: 'जन्म तिथि',
    bn: 'জন্ম তারিখ',
    ur: 'تاریخ پیدائش',
    es: 'Fecha de nacimiento',
    fr: 'Date de naissance',
    ar: 'تاريخ الميلاد'
  },
  address: {
    en: 'Address',
    hi: 'पता',
    bn: 'ঠিকানা',
    ur: 'پتہ',
    es: 'Dirección',
    fr: 'Adresse',
    ar: 'العنوان'
  },
  academic_info: {
    en: 'Academic Information',
    hi: 'शैक्षिक जानकारी',
    bn: 'একাডেমিক তথ্য',
    ur: 'تعلیمی معلومات',
    es: 'Información académica',
    fr: 'Informations académiques',
    ar: 'معلومات أكاديمية'
  },
  parent_info: {
    en: 'Parental Information',
    hi: 'अभिभावक की जानकारी',
    bn: 'অভিভাবকের তথ্য',
    ur: 'والدین کی معلومات',
    es: 'Información de los padres',
    fr: 'Informations parentales',
    ar: 'معلومات الوالدين'
  },
  fee_info: {
    en: 'Fee Configuration',
    hi: 'शुल्क विन्यास',
    bn: 'ফি কনফিগারেশন',
    ur: 'فیس की ترتیب',
    es: 'Configuración de cuotas',
    fr: 'Configuration des frais',
    ar: 'إعدادات الرسوم'
  },
  monthly_fee: {
    en: 'Monthly Fee',
    hi: 'मासिक शुल्क',
    bn: 'मासिक ফি',
    ur: 'ماہانہ فیس',
    es: 'Cuota mensual',
    fr: 'Frais mensuels',
    ar: 'الرسوم الشهرية'
  },
  complete_registration: {
    en: 'Complete Registration',
    hi: 'पंजीकरण पूरा करें',
    bn: 'নিবন্ধন সম্পন্ন করুন',
    ur: 'رجسٹریشن مکمل کریں',
    es: 'Completar registro',
    fr: 'Terminer l\'inscription',
    ar: 'إكمال التسجيل'
  },
  actions: {
    en: 'Actions',
    hi: 'कार्य',
    bn: 'অ্যাকশন',
    ur: 'کارروائیاں',
    es: 'Acciones',
    fr: 'Actions',
    ar: 'إجراءات'
  },
  loading: {
    en: 'Loading...',
    hi: 'लोड हो रहा है...',
    bn: 'লোড হচ্ছে...',
    ur: 'لوڈنگ ہو رہی ہے...',
    es: 'Cargando...',
    fr: 'Chargement...',
    ar: 'جاري التحميل...'
  },
  no_records: {
    en: 'No records found.',
    hi: 'कोई रिकॉर्ड नहीं मिला।',
    bn: 'কোন রেকর্ড পাওয়া যায়নি।',
    ur: 'کوئی ریکارڈ نہیں ملا।',
    es: 'No se encontraron registros.',
    fr: 'Aucun enregistrement trouvé.',
    ar: 'لم يتم العثور على سجلات.'
  },
  parent_community: {
    en: 'Parent Community',
    hi: 'अभिभावक समुदाय',
    bn: 'অভিভাবক কমিউনিটি',
    ur: 'والدین کی کمیونٹی',
    es: 'Comunidad de padres',
    fr: 'Communauté des parents',
    ar: 'مجتمع أولياء الأمور'
  },
  invite_parent: {
    en: 'Invite Parent',
    hi: 'अभिभावक को आमंत्रित करें',
    bn: 'অভিভাবককে আমন্ত্রণ জানান',
    ur: 'والدین کو مدعو کریں',
    es: 'Invitar padre',
    fr: 'Inviter un parent',
    ar: 'دعوة ولي أمر'
  },
  students_linked: {
    en: 'Students Linked',
    hi: 'जुड़े हुए छात्र',
    bn: 'সংযুক্ত ছাত্রছাত্রী',
    ur: 'منسلک طلباء',
    es: 'Estudiantes vinculados',
    fr: 'Étudiants liés',
    ar: 'الطلاب المرتبطين'
  },
  cancel: {
    en: 'Cancel',
    hi: 'रद्द करें',
    bn: 'বাতিল করুন',
    ur: 'منسوخ کریں',
    es: 'Cancelar',
    fr: 'Annuler',
    ar: 'إلغاء'
  },
  save: {
    en: 'Save',
    hi: 'सहेजें',
    bn: 'সংরक्षण करें',
    ur: 'محفوظ کریں',
    es: 'Guardar',
    fr: 'Enregistrer',
    ar: 'حفظ'
  },
  verified: {
    en: 'Verified',
    hi: 'सत्यापित',
    bn: 'ভেরিফাইড',
    ur: 'تصدیق شدہ',
    es: 'Verificado',
    fr: 'Vérifié',
    ar: 'تم التحقق'
  },
  communication_hub: {
    en: 'Communication Hub',
    hi: 'संचार केंद्र',
    bn: 'কমিউনিকেশন হাব'
  },
  new_announcement: {
    en: 'New Announcement',
    hi: 'नई घोषणा',
    bn: 'নতুন ঘোষণা'
  },
  post_announcement: {
    en: 'Post Announcement',
    hi: 'घोषणा पोस्ट करें',
    bn: 'ঘোষণা পোস্ট করুন'
  },
  announcement_title: {
    en: 'Announcement Title',
    hi: 'घोषणा का शीर्षक',
    bn: 'ঘোষণার শিরোনাম'
  },
  message_content: {
    en: 'Message Content',
    hi: 'संदेश सामग्री',
    bn: 'বার্তার বিষয়বস্তু'
  },
  target_audience: {
    en: 'Target Audience',
    hi: 'लक्षित दर्शक',
    bn: 'টার্গেট অডিয়েন্স'
  },
  expense: {
    en: 'Expense',
    hi: 'व्यय',
    bn: 'খরচ'
  },
  admission_fee: {
    en: 'Admission Fee',
    hi: 'प्रवेश शुल्क',
    bn: 'ভর্তি ফি',
    ur: 'داخلہ فیس',
    es: 'Cuota de admisión',
    fr: 'Frais d\'inscription',
    ar: 'رسوم التسجيل'
  },
  apply_leave: { 
    en: 'Apply Leave',
    hi: 'छुट्टी के लिए आवेदन करें',
    bn: 'ছুটির আবেদন করুন'
  },
  leave_history: { 
    en: 'Leave History',
    hi: 'छुट्टी का इतिहास',
    bn: 'ছুটির ইতিহাস'
  },
  attendance_report: { 
    en: 'Attendance Report',
    hi: 'उपस्थिति रिपोर्ट',
    bn: 'উপস্থিতি রিপোর্ট'
  },
  holiday_hw: { 
    en: 'Holiday HW',
    hi: 'छुट्टी का होमवर्क',
    bn: 'ছুটির হোমওয়ার্ক'
  },
  upcoming_events: { 
    en: 'Upcoming Events',
    hi: 'आगामी कार्यक्रम',
    bn: 'আসন্ন অনুষ্ঠান'
  },
  new_homework: { 
    en: 'New Homework',
    hi: 'नया होमवर्क',
    bn: 'নতুন হোমওয়ার্ক'
  },
  need_support: { 
    en: 'Need Support?',
    hi: 'सहायता चाहिए?',
    bn: 'সহায়তা প্রয়োজন?'
  },
  send_message: { 
    en: 'Send Message',
    hi: 'संदेश भेजें',
    bn: 'বার্তা পাঠান'
  },
  fees_due: { 
    en: 'Fees Due',
    hi: 'बकाया शुल्क',
    bn: 'বকেয়া ফি'
  },
  pay_now: { 
    en: 'Pay Now',
    hi: 'अभी भुगतान करें',
    bn: 'এখনই পেমেন্ট করুন'
  },
  mark_attendance: { 
    en: 'Mark Attendance',
    hi: 'उपस्थिति दर्ज करें',
    bn: 'উপস্থিতি চিহ্নিত করুন'
  },
  post_homework: { 
    en: 'Post Homework',
    hi: 'होमवर्क पोस्ट करें',
    bn: 'হোমওয়ার্ক পোস্ট করুন'
  },
  student_list: { 
    en: 'Student List',
    hi: 'छात्र सूची',
    bn: 'ছাত্র তালিকা'
  },
  leave_requests: { 
    en: 'Leave Requests',
    hi: 'छुट्टी के अनुरोध',
    bn: 'ছুটির অনুরোধ'
  },
  review_application: { 
    en: 'Review Application',
    hi: 'आवेदन की समीक्षा करें',
    bn: 'আবেদন পর্যালোচনা করুন'
  },
  confirm_attendance: { 
    en: 'Confirm Attendance',
    hi: 'उपस्थिति की पुष्टि करें',
    bn: 'উপস্থিতি নিশ্চিত করুন'
  },
  update_attendance: { 
    en: 'Update Attendance',
    hi: 'उपस्थिति अपडेट करें',
    bn: 'উপস্থিতি আপডেট করুন'
  },
  post_new: { 
    en: 'Post New',
    hi: 'नया पोस्ट करें',
    bn: 'নতুন পোস্ট করুন'
  },
  save_profile_changes: { 
    en: 'Save Profile Changes',
    hi: 'प्रोफ़ाइल परिवर्तन सहेजें',
    bn: 'প্রোফাইল পরিবর্তন সংরক্ষণ করুন'
  },
  app_appearance: { 
    en: 'App Appearance',
    hi: 'ऐप का स्वरूप',
    bn: 'অ্যাপের চেহারা'
  },
  assigned_class: { 
    en: 'Assigned Class',
    hi: 'असाइन की गई कक्षा',
    bn: 'নির্ধারিত ক্লাস'
  },
  incharge_class: { 
    en: 'Incharge Class',
    hi: 'प्रभारी कक्षा',
    bn: 'ইনচার্জ ক্লাস'
  },
  section: {
    en: 'Section',
    hi: 'अनुभाग',
    bn: 'সেকশন'
  },
  academic_year: {
    en: 'Academic Year',
    hi: 'शैक्षणिक वर्ष',
    bn: 'শিক্ষাবর্ষ'
  },
  enrollment_date: {
    en: 'Enrollment Date',
    hi: 'नामांकन तिथि',
    bn: 'ভর্তির তারিখ'
  },
  update_profile: {
    en: 'Update Profile',
    hi: 'प्रोफ़ाइल अपडेट करें',
    bn: 'প্রোফাইল আপডেট করুন'
  },
  save_faculty: {
    en: 'Save Faculty Member',
    hi: 'संकाय सदस्य को सहेजें',
    bn: 'ফ্যাকাল্টি সদস্য সংরক্ষণ করুন'
  },
  back: {
    en: 'Back',
    hi: 'पीछे',
    bn: 'পিছনে'
  },
  back_to_dashboard: {
    en: 'Back to Dashboard',
    hi: 'डैशबोर्ड पर वापस जाएं',
    bn: 'ড্যাশবোর্ডে ফিরে যান'
  },
  daily_attendance_registry: {
    en: 'Daily Attendance Registry',
    hi: 'दैनिक उपस्थिति रजिस्टर',
    bn: 'প্রতিদিনের উপস্থিতি রেজিস্ট্রি'
  },
  section_menu: {
    en: 'Section',
    hi: 'अनुभाग',
    bn: 'সেকশন'
  },
  manage_and_track_students: {
    en: 'Manage and track your school\'s student body.',
    hi: 'अपने स्कूल के छात्र निकाय का प्रबंधन और ट्रैक करें।',
    bn: 'আপনার স্কুলের ছাত্রছাত্রীদের পরিচালনা এবং ট্র্যাক করুন।'
  },
  search_placeholder: {
    en: 'Search by name, ID or roll number...',
    hi: 'नाम, आईडी या रोल नंबर द्वारा खोजें...',
    bn: 'নাম, আইডি বা রোল নম্বর দিয়ে অনুসন্ধান করুন...'
  },
  student_id: {
    en: 'Student\'s ID',
    hi: 'छात्र की आईडी',
    bn: 'ছাত্রের আইডি'
  },
  fee_structure_note: {
    en: 'This defines the personal fee structure for the student.',
    hi: 'यह छात्र के लिए व्यक्तिगत शुल्क संरचना को परिभाषित करता है।',
    bn: 'এটি ছাত্রের ব্যক্তিগত ফি কাঠামো নির্ধারণ করে।'
  },
  add_comprehensive_records: {
    en: 'Add comprehensive academic and personal records.',
    hi: 'व्यापक शैक्षणिक और व्यक्तिगत रिकॉर्ड जोड़ें।',
    bn: 'বিস্তারিত একাডেমিক এবং व्यक्तिगत রেকর্ড যোগ করুন।'
  },
  full_name: {
    en: 'Full Name',
    hi: 'पूरा नाम',
    bn: 'পুরো নাম'
  },
  manage_faculty: {
    en: 'Total faculty members listed.',
    hi: 'सूचीबद्ध कुल संकाय सदस्य।',
    bn: 'তালিকাভুক্ত মোট অনুষদ সদস্য।'
  },
  teacher_profile_note: {
    en: 'New Teacher Profile & Credentials',
    hi: 'नया शिक्षक प्रोफ़ाइल और क्रेडेंशियल',
    bn: 'নতুন শিক্ষক প্রোফাইল এবং শংসাপত্র'
  },
  teacher_update_note: {
    en: 'Modify Teacher Profile',
    hi: 'शिक्षक प्रोफ़ाइल संशोधित करें',
    bn: 'শিক্ষক প্রোফাইল সংশোধন করুন'
  },
  security_note_desc: {
    en: 'Teachers will use the Username and Password configured above to log in to the Teacher Mobile App. Please ensure they are noted down securely.',
    hi: 'शिक्षक ऊपर कॉन्फ़िगर किए गए उपयोगकर्ता नाम और पासवर्ड का उपयोग शिक्षक मोबाइल ऐप में लॉग इन करने के लिए करेंगे। कृपया सुनिश्चित करें कि वे सुरक्षित रूप से नोट किए गए हैं।',
    bn: 'শিক্ষকরা শিক্ষক মোবাইল অ্যাপে লগ ইন করতে উপরে কনফিগার করা ইউজারনেম এবং পাসওয়ার্ড ব্যবহার করবেন। অনুগ্রহ করে নিশ্চিত করুন যে সেগুলি নিরাপদে টুকে রাখা হয়েছে৷'
  },
  active_listings: {
    en: 'Active Listings',
    hi: 'सक्रिय लिस्टिंग',
    bn: 'সক্রিয় তালিকা'
  },
  contact_info: {
    en: 'Contact Info',
    hi: 'संपर्क जानकारी',
    bn: 'যোগাযোগের তথ্য'
  },
  primary_faculty: {
    en: 'Primary Faculty',
    hi: 'प्राथमिक संकाय',
    bn: 'प्राथमिक অনুষদ'
  },
  no_phone_recorded: {
    en: 'No phone recorded',
    hi: 'कोई फ़ोन रिकॉर्ड नहीं किया गया',
    bn: 'কোন ফোন রেকর্ড করা হয়নি'
  },
  class_teacher_label: {
    en: 'Class teacher',
    hi: 'कक्षा अध्यापक',
    bn: 'ক্লাস টিচার'
  },
  update_faculty_member: {
    en: 'Update Faculty Member',
    hi: 'संकाय सदस्य को अपडेट करें',
    bn: 'ফ্যাকাল্টি সদস্য আপডেট করুন'
  },
  add_faculty_member: {
    en: 'Add Faculty Member',
    hi: 'संकाय सदस्य जोड़ें',
    bn: 'ফ্যাকাল্টি সদস্য যোগ করুন'
  },
  email_address: {
    en: 'Email Address',
    hi: 'ईमेल पता',
    bn: 'ইমেল ঠিকানা'
  },
  username: {
    en: 'Username Login',
    hi: 'उपयोगकर्ता नाम लॉगिन',
    bn: 'ব্যবহারকারীর নাম লগইন'
  },
  password: {
    en: 'Initial Password',
    hi: 'प्रारंभिक पासवर्ड',
    bn: 'প্রাথমিক পাসওয়োর্ড'
  },
  class_teacher_designation: {
    en: 'Class Teacher Designation',
    hi: 'कक्षा शिक्षक पद',
    bn: 'ক্লাস টিচার পদবী'
  },
  class_assignments: {
    en: 'Class Assignments',
    hi: 'कक्षा असाइनমেন্ট',
    bn: 'ক্লাস অ্যাসাইনমেন্ট'
  },
  add_assignment: {
    en: 'Add Assignment',
    hi: 'असाइनमेंट जोड़ें',
    bn: 'অ্যাসাইনমেন্ট যোগ করুন'
  },
  subject: {
    en: 'Subject',
    hi: 'विषय',
    bn: 'বিষয়'
  },
  security_note: {
    en: 'Security Note',
    hi: 'सुरक्षा नोट',
    bn: 'নিরাপত্তা নোট'
  },
  search_faculty_placeholder: {
    en: 'Search faculty by name or email...',
    hi: 'नाम या ईमेल द्वारा संकाय खोजें...',
    bn: 'নাম বা ইমেল দ্বারা অনুষদ অনুসন্ধান করুন...'
  },
  success: {
    en: 'Success',
    hi: 'सफल',
    bn: 'সফল',
    ur: 'کامیاب',
    es: 'Éxito',
    fr: 'Succès',
    ar: 'نجاح'
  },
  registered_parents_count: {
    en: 'registered parents for this school.',
    hi: 'इस स्कूल के लिए पंजीकृत अभिभावक।',
    bn: 'এই স্কুলের জন্য নিবন্ধিত অভিভাবক।'
  },
  verified_profile: {
    en: 'Verified Profile',
    hi: 'सत्यापित प्रोफ़ाइल',
    bn: 'ভেরিফাইড প্রোফাইল'
  },
  no_phone: {
    en: 'No phone',
    hi: 'कोई फ़ोन नहीं',
    bn: 'কোন ফোন নেই'
  },
  students_count: {
    en: 'Students',
    hi: 'छात्र',
    bn: 'ছাত্র'
  },
  present: {
    en: 'Present',
    hi: 'उपस्थित',
    bn: 'উপস্থিত',
    ur: 'حاضر',
    es: 'Presente',
    fr: 'Présent',
    ar: 'حاضر'
  },
  absent: {
    en: 'Absent',
    hi: 'अनुपस्थित',
    bn: 'অনুপস্থিত',
    ur: 'غیر حاضر',
    es: 'Ausente',
    fr: 'Absent',
    ar: 'غائب'
  },
  elevate_school_hub: {
    en: 'Elevate Your School\'s Digital Hub.',
    hi: 'अपने स्कूल के डिजिटल हब को उन्नत करें।',
    bn: 'আপনার স্কুলের ডিজিটাল হাবকে উন্নত করুন।'
  },
  parent_portal_desc: {
    en: 'Access your child\'s academic progress, attendance, and fee status instantly.',
    hi: 'अपने बच्चे की शैक्षणिक प्रगति, उपस्थिति और शुल्क की स्थिति तुरंत प्राप्त करें।',
    bn: 'আপনার সন্তানের একাডেমিক অগ্রগতি, উপস্থিতি এবং ফি স্ট্যাটাস তাৎক্ষণিকভাবে অ্যাক্সেস করুন।'
  },
  admin_portal_desc: {
    en: 'Manage students, track progress, and communicate effortlessly with the dashboard.',
    hi: 'छात्रों का प्रबंधन करें, प्रगति को ट्रैक करें और डैशबोर्ड के साथ सहजता से संवाद करें।',
    bn: 'ছাত্রছাত্রীদের পরিচালনা করুন, অগ্রগতি ট্র্যাক করুন এবং ড্যাশবোর্ডের মাধ্যমে অনায়াসে যোগাযোগ করুন।'
  },
  join_parents: {
    en: 'Join 5,000+ Active Parents',
    hi: '5,000+ सक्रिय अभिभावकों से जुड़ें',
    bn: '৫,০০০+ সক্রিয় অভিভাবকদের সাথে যোগ দিন'
  },
  parent_access: {
    en: 'Parent Access',
    hi: 'अभिभावक पहुंच',
    bn: 'পেরেন্ট অ্যাক্সেস'
  },
  portal_sign_in: {
    en: 'Portal Sign In',
    hi: 'पोर्टल साइन इन',
    bn: 'পোর্টাল সাইন ইন'
  },
  select_portal: {
    en: 'Select your portal to continue.',
    hi: 'जारी रखने के लिए अपना पोर्टल चुनें।',
    bn: 'চালিয়ে যেতে আপনার পোর্টাল নির্বাচন করুন।'
  },
  admin: {
    en: 'Admin',
    hi: 'एडमिन',
    bn: 'অ্যাডমিন'
  },
  student_full_name: {
    en: 'Student Full Name',
    hi: 'छात्र का पूरा नाम',
    bn: 'ছাত্রের পুরো নাম'
  },
  student_id_label: {
    en: 'Student ID (Custom ID)',
    hi: 'छात्र आईडी (कस्टम आईडी)',
    bn: 'ছাত্র আইডি (কাস্টম আইডি)'
  },
  enter_portal: {
    en: 'Enter Portal',
    hi: 'पोर्टल में प्रवेश करें',
    bn: 'পোর্টালে প্রবেশ করুন'
  },
  username_id: {
    en: 'Username / ID',
    hi: 'उपयोगकर्ता नाम / आईडी',
    bn: 'ব্যবহারকারীর নাম / আইডি'
  },
  staff_auth_google: {
    en: 'Staff authentication via Google Workspace',
    hi: 'Google Workspace के माध्यम से कर्मचारी प्रमाणीकरण',
    bn: 'Google Workspace-এর মাধ্যমে স্টাফ অথেন্টিকেশন'
  },
  continue_admin_portal: {
    en: 'Continue to Admin Portal',
    hi: 'एडमिन पोर्टल पर जारी रखें',
    bn: 'অ্যাডমিন পোর্টালে যান'
  },
  secure_access_label: {
    en: 'Secure Access',
    hi: 'सुरक्षित पहुंच',
    bn: 'সুরক্ষিত অ্যাক্সেস'
  },
  attendance_register: {
    en: 'Attendance Register',
    hi: 'उपस्थिति पंजी',
    bn: 'উপস্থিতি রেজিস্টার'
  },
  monitor_ai_calls: {
    en: 'Monitor AI-powered attendance verification calls.',
    hi: 'AI-संचालित उपस्थिति सत्यापन कॉल की निगरानी करें।',
    bn: 'AI-চালিত উপস্থিতির সত্যতা যাচাইকরণ কল মনিটর করুন।'
  },
  answered: {
    en: 'Answered',
    hi: 'उत्तर दिया',
    bn: 'উত্তর দেওয়া হয়েছে'
  },
  missed: {
    en: 'Missed',
    hi: 'छूटा हुआ',
    bn: 'মিস করা হয়েছে'
  },
  failed: {
    en: 'Failed',
    hi: 'विफल',
    bn: 'ব্যর্থ হয়েছে'
  },
  pending: {
    en: 'Pending',
    hi: 'लंबित',
    bn: 'পেন্ডিং'
  },
  processing: {
    en: 'Processing',
    hi: 'प्रसंस्करण',
    bn: 'প্রসেসিং করা হচ্ছে'
  },
  completed: {
    en: 'Completed',
    hi: 'पूरा हुआ',
    bn: 'সম্পন্ন হয়েছে'
  },
  attempts: {
    en: 'attempts',
    hi: 'प्रयास',
    bn: 'বার চেষ্টা করা হয়েছে'
  },
  queue_empty: {
    en: 'Queue is currently empty. All calls processed.',
    hi: 'कतार वर्तमान में खाली है। सभी कॉल्स संसाधित।',
    bn: 'কিউ বর্তমানে খালি আছে। সব কল প্রসেস করা হয়েছে।'
  },
  student_label: {
    en: 'Student',
    hi: 'छात्र',
    bn: 'ছাত্র'
  },
  parent_contact_label: {
    en: 'Parent Contact',
    hi: 'अभिभावक संपर्क',
    bn: 'অভিভাবক যোগাযোগ'
  },
  timestamp_label: {
    en: 'Timestamp',
    hi: 'समय-अंकन',
    bn: 'টাইমস্ট্যাম্প'
  },
  queue_since_label: {
    en: 'Queue Since',
    hi: 'कतार तब से',
    bn: 'কিউ হতে'
  },
  status_label: {
    en: 'Status',
    hi: 'स्थिति',
    bn: 'স্ট্যাটাস'
  },
  mark_monitor_attendance: {
    en: 'Mark and monitor daily attendance records.',
    hi: 'दैनिक उपस्थिति रिकॉर्ड को चिह्नित और मॉनिटर करें।',
    bn: 'প্রতিদিনের উপস্থিতির রেকর্ড চিহ্নিত এবং মনিটর করুন।'
  },
  register_view: {
    en: 'Register View',
    hi: 'रजिस्टर देखें',
    bn: 'রেজিস্টার ভিউ'
  },
  save_register: {
    en: 'Save Register',
    hi: 'रजिस्टर सहेजें',
    bn: 'রেজিস্টার সেভ করুন'
  },
  broadcast_news: {
    en: 'Broadcast school news and critical updates to your community.',
    hi: 'अपने समुदाय को स्कूल समाचार और महत्वपूर्ण अपडेट प्रसारित करें।',
    bn: 'আপনার কমিউনিটিতে স্কুলের সংবাদ এবং গুরুত্বপূর্ণ আপডেট প্রচার করুন।'
  },
  broadcast_news_modal_desc: {
    en: 'Broadcast news to teachers and parents.',
    hi: 'शिक्षकों और अभिभावकों को समाचार प्रसारित करें।',
    bn: 'শিক্ষক এবং অভিভাবকদের কাছে সংবাদ প্রচার করুন।'
  },
  feature_insight: {
    en: 'Feature Insight',
    hi: 'सुविधा अंतर्दृष्टि',
    bn: 'ফিচার ইনসাইট'
  },
  multi_channel_delivery: {
    en: 'Multi-Channel Delivery',
    hi: 'मल्टी-चैनल वितरण',
    bn: 'মাল্টি-চ্যানেল ডেলিভারি'
  },
  multi_channel_desc: {
    en: 'Announcements are intelligently routed to the selected audience. Teachers receive alerts in their portal, while parents get real-time mobile push notifications.',
    hi: 'घोषणाएँ बुद्धिमानी से चयनित दर्शकों तक पहुँचायी जाती हैं। शिक्षकों को उनके पोर्टल में अलर्ट प्राप्त होते हैं, जबकि माता-पिता को रीयल-टाइम मोबाइल पुश नोटिफिकेशन मिलते हैं।',
    bn: 'ঘোষণাগুলি বুদ্ধিমত্তার সাথে নির্বাচিত দর্শকদের কাছে পৌঁছে দেওয়া হয়। শিক্ষকরা তাদের পোর্টালে অ্যালার্ট পান, এবং অভিভাবকরা রিয়েল-টাইম মোবাইল পুশ নোটিফিকেশন পান।'
  },
  notification_settings: {
    en: 'Notification Settings',
    hi: 'अधिसूचना सेटिंग्स',
    bn: 'নোটিফিকেশন সেটিংস'
  },
  event_calendar: {
    en: 'Event Calendar'
  },
  daily_attendance: {
    en: 'Daily Attendance'
  },
  monthly_report: {
    en: 'Monthly Report'
  },
  back_to_list: {
    en: 'Back to List'
  },
  view_info: {
    en: 'View Info'
  },
  presents: {
    en: 'Presents'
  },
  absents: {
    en: 'Absents'
  },
  unmarked: {
    en: 'Unmarked'
  },
  total_records: {
    en: 'Total Records'
  },
  close: {
    en: 'Close'
  },
  account: {
    en: 'Account',
    hi: 'खाता',
    bn: 'অ্যাকাউন্ট',
    ur: 'اکاؤنٹ',
    es: 'Cuenta',
    fr: 'Compte',
    ar: 'الحساب'
  },
  class_menu: {
    en: 'Class',
    hi: 'कक्षा',
    bn: 'ক্লাস',
    ur: 'کلاس',
    es: 'Clase',
    fr: 'Classe',
    ar: 'الفصل'
  },
  exam: {
    en: 'Exam',
    hi: 'परीक्षा',
    bn: 'পরীক্ষা',
    ur: 'امتحان',
    es: 'Examen',
    fr: 'Examen',
    ar: 'الامتحان'
  },
  ai_calls: {
    en: 'AI Calls',
    hi: 'AI कॉल',
    bn: 'AI কল',
    ur: 'AI کالز',
    es: 'Llamadas AI',
    fr: 'Appels AI',
    ar: 'مكالمات AI'
  },
  whatsapp: {
    en: 'WhatsApp',
    hi: 'WhatsApp',
    bn: 'WhatsApp',
    ur: 'واٹس ایپ',
    es: 'WhatsApp',
    fr: 'WhatsApp',
    ar: 'واتساب'
  },
  bilingual_notifications: {
    en: 'Bilingual automated notifications for parents.',
    hi: 'माता-पिता के लिए द्विभाषी स्वचालित सूचनाएं।',
    bn: 'অভিভাবকদের জন্য দ্বিভাষিক স্বয়ংক্রিয় বিজ্ঞপ্তি।'
  },
  alerts_sent_today: {
    en: 'Alerts Sent Today',
    hi: 'आज भेजी गई अलर्ट',
    bn: 'আজ পাঠানো অ্যালার্ট'
  },
  successfully_delivered: {
    en: 'Successfully Delivered',
    hi: 'सफलतापूर्वक वितरित',
    bn: 'সফলভাবে পৌঁছেছে'
  },
  failed_alerts: {
    en: 'Failed Alerts',
    hi: 'विफल अलर्ट',
    bn: 'ব্যর্থ অ্যালার্ট'
  },
  message_logs: {
    en: 'Message Logs',
    hi: 'संदेश लॉग',
    bn: 'মেসেজ লগ'
  },
  sent_at_label: {
    en: 'Sent At',
    hi: 'भेजने का समय',
    bn: 'পাঠানোর সময়'
  },
  preview_label: {
    en: 'Preview',
    hi: 'पूर्वावलोकन',
    bn: 'প্রিভিউ'
  },
  sent: {
    en: 'Sent',
    hi: 'भेजा गया',
    bn: 'পাঠানো হয়েছে'
  },
  delivered: {
    en: 'Delivered',
    hi: 'वितरित',
    bn: 'পৌঁছে দেওয়া হয়েছে'
  },
  notice: {
    en: 'Notice',
    hi: 'सूचना',
    bn: 'नोটিশ',
    ur: 'نوٹس',
    es: 'Aviso',
    fr: 'Avis',
    ar: 'إشعار'
  },
  present_today: {
    en: 'Present Today',
    hi: 'आज की उपस्थिति',
    bn: 'আজকের উপস্থিতি',
    ur: 'آج کی حاضری',
    es: 'Presente hoy',
    fr: 'Présent aujourd\'hui',
    ar: 'الحاضرون اليوم'
  },
  earnings: {
    en: 'Earnings',
    hi: 'कमाई',
    bn: 'উপার্জন',
    ur: 'آمدنی',
    es: 'Ganancias',
    fr: 'Gains',
    ar: 'الأرباح'
  },
  track_fee_desc: {
    en: 'Track payments, collection, and outstanding dues.',
    hi: 'भुगतान, संग्रह और बकाया देय राशि को ट्रैक करें।',
    bn: 'পেমেন্ট, কালেকশন এবং বকেয়া পাওনা ট্র্যাক করুন।'
  },
  set_fee_structure: {
    en: 'Set Fee Structure',
    hi: 'शुल्क संरचना तय करें',
    bn: 'ফি এর কাঠামো সেট করুন'
  },
  record_payment: {
    en: 'Record Payment',
    hi: 'भुगतान रिकॉर्ड करें',
    bn: 'পেমেন্ট রেকর্ড করুন'
  },
  total_collected: {
    en: 'Total Collected',
    hi: 'कुल संग्रह',
    bn: 'মোট संग्रह'
  },
  outstanding_dues: {
    en: 'Outstanding Dues',
    hi: 'बकाया देय राशि',
    bn: 'বকেয়া পাওনা'
  },
  recent_transactions: {
    en: 'Recent Transactions',
    hi: 'हाल के लेन-देन',
    bn: 'সাম্প্রতিক লেনদেন'
  },
  student_info: {
    en: 'Student Info',
    hi: 'छात्र जानकारी',
    bn: 'ছাত্রের তথ্য'
  },
  manage_account_desc: {
    en: 'Manage your account and preferences',
    hi: 'अपने खाते और प्राथमिकताओं का प्रबंधन करें',
    bn: 'আপনার অ্যাকাউন্ট এবং পছন্দগুলি পরিচালনা করুন'
  },
  active_session: {
    en: 'Active Session',
    hi: 'सक्रिय सत्र',
    bn: 'সক্রিয় সেশন'
  },
  google_auth_desc: {
    en: 'Logged in via Google Auth',
    hi: 'गूगल ऑथ के माध्यम से लॉग इन किया गया',
    bn: 'গুগল অথের মাধ্যমে লগ ইন করা হয়েছে'
  },
  day_theme: {
    en: 'Day theme',
    hi: 'दिन की थीम',
    bn: 'দিনের থিম'
  },
  night_theme: {
    en: 'Night theme',
    hi: 'रात की थीम',
    bn: 'রাতের থিম'
  },
  reset_password_contact: {
    en: 'Your account is secured with Enterprise-grade encryption. To reset your password, please contact the IT Administrator.',
    hi: 'आपका खाता एंटरप्राइज-ग्रेड एन्क्रिप्शन के साथ सुरक्षित है। अपना पासवर्ड रीसेट करने के लिए, कृपया आईटी एडमिनिस्ट्रेटर से संपर्क करें।',
    bn: 'আপনার অ্যাকাউন্ট এন্টারপ্রাইজ-গ্রেড এনক্রিপশনের মাধ্যমে সুরক্ষিত। আপনার পাসওয়ার্ড রিসেট করতে, অনুগ্রহ করে আইটি অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন।'
  },
  notice_board: {
    en: 'Notice Board',
    hi: 'सूचना पट्ट',
    bn: 'নোটিশ बोर्ड',
    ur: 'نوٹس بورڈ',
    es: 'Tablón de anuncios',
    fr: 'Tableau d\'affichage',
    ar: 'لوحة الإعلانات'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app-language') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.dir = language === 'ar' || language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
