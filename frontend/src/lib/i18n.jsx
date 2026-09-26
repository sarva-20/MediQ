// ── Minimal EN/TA i18n ── no new dependency, a dictionary + context.
import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "mediq_lang";

const dict = {
  en: {
    // ── Nav ──
    dashboard: "Dashboard",
    book_appointment: "Book Appointment",
    my_visits: "My Visits",
    queue_board: "Queue Board",
    walk_in: "Walk-in",
    appointments: "Appointments",
    my_queue: "My Queue",
    overview: "Overview",
    settings: "Settings",
    providers: "Providers",
    simulator: "Simulator",
    logout: "Logout",
    live: "Live",

    // ── Auth ──
    sign_in: "Sign In",
    sign_in_subtitle: "Use one-click demo profiles for instant role simulation, or sign in with credentials.",
    create_account: "Create Account",
    create_account_subtitle: "Register as a patient to schedule appointments, view departure-board tokens, and receive live wait alerts.",
    username_or_id: "Username / Patient ID",
    password: "Password",
    full_name: "Full Name",
    mobile_phone: "Mobile Phone Number",
    email_address: "Email Address",
    confirm_password: "Confirm Password",
    already_have_account: "Already have an account?",
    dont_have_account: "Don't have an account?",
    back_to_home: "Back to Home",
    one_click_demo: "One-Click Demo Access",
    or_enter_credentials: "or enter credentials",

    // ── Patient dashboard ──
    welcome_back: "Welcome back",
    upcoming_visit: "Upcoming Visit",
    active_queue_token: "Active Queue Token",
    visits_this_year: "Visits This Year",
    book_new_visit: "Book New Visit",
    recent_visits: "Recent Visits & Activity",
    view_full_history: "View full visit history",
    estimated_wait: "Estimated Wait",
    ready_now: "Ready now",
    none_booked: "None booked",

    // ── Booking flow ──
    step1_title: "Step 1: Choose Department",
    step1_subtitle: "Select the medical specialty for your consultation.",
    step2_title: "Select Clinical Service",
    step2_subtitle: "Choose the type of visit you require.",
    step2_provider_title: "Select Medical Practitioner",
    any_available_doctor: "Any available doctor",
    continue_to_slots: "Continue to Slot Selection",
    select_date: "Select Appointment Date",
    available_slots: "Available Slots",
    confirm_book: "Confirm & Book Appointment",
    appointment_confirmed: "Appointment Confirmed!",
    assigned_token: "Assigned Token",
    lunch_break: "Lunch Break",
    fully_booked: "Fully Booked",
    other_patient_window: "Other patient type's window",
    your_window: "Your window",
    back: "Back",

    // ── Visits / status ──
    cancel: "Cancel",
    departure_board: "Departure Board",
    no_visits_found: "No Visits Found",
    booked: "Booked",
    checked_in: "Checked In",
    in_service: "In Service",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
    delayed: "Delayed",

    // ── Reception ──
    reception_queue_title: "Reception Queue Board",
    reception_queue_subtitle: "Real-time departure-board queue dispatch, triage priority, and check-ins.",
    walkin_title: "Register Walk-in Patient",
    walkin_subtitle: "Instant token generation with automatic shortest-wait routing.",
    patient_full_name: "Patient Full Name",
    phone_number: "Phone Number",
    department: "Department",
    service_required: "Service Required",
    practitioner_assignment: "Medical Practitioner Assignment",
    generate_token: "Generate Walk-In Token",
    appointments_roster_title: "Clinic Appointment Roster",
    check_in: "Check In",
    now_serving: "Now Serving",
    waiting_queue: "Waiting Queue",

    // ── Provider ──
    provider_console_title: "Provider Operations Console",
    active_consultation: "Active Consultation Room",
    upcoming_queue: "Upcoming Queue",
    complete_consultation: "Complete Consultation",
    call_next_patient: "Call Next Patient",
    call_now: "Call Now",
    add_overrun_delay: "+ Add Overrun Delay",
    todays_flow: "Today's Flow Kanban",
    waiting: "Waiting",
    done_today: "Done Today",

    // ── Prescriptions ──
    prescriptions: "Prescriptions",
    add_prescription: "Add Prescription",
    no_prescriptions: "No prescriptions yet",
    medications: "Medications",
    notes: "Notes",
    save: "Save",

    // ── Admin ──
    overview_title: "Clinic Overview & KPI Metrics",
    settings_title: "Settings & Service Configuration",
    providers_title: "Clinical Practitioners & Staff",
    simulator_title: "Interactive Simulation Console",
    avg_wait_time: "Avg Wait Time",
    patients_waiting: "Patients Waiting",
    in_consultation: "In Consultation",
    completed_today: "Completed Today",

    // ── Patient type ──
    patient_type: "Patient Type",
    in_patient: "In-Patient",
    out_patient: "Out-Patient",
  },
  ta: {
    // ── Nav ──
    dashboard: "முகப்பு",
    book_appointment: "சந்திப்பு பதிவு",
    my_visits: "எனது வருகைகள்",
    queue_board: "வரிசை பலகை",
    walk_in: "நேரடி வருகை",
    appointments: "சந்திப்புகள்",
    my_queue: "எனது வரிசை",
    overview: "மேலோட்டம்",
    settings: "அமைப்புகள்",
    providers: "மருத்துவர்கள்",
    simulator: "சிமுலேட்டர்",
    logout: "வெளியேறு",
    live: "நேரடி",

    // ── Auth ──
    sign_in: "உள்நுழைய",
    sign_in_subtitle: "உடனடி பாத்திர சோதனைக்கு ஒரு-கிளிக் டெமோ சுயவிவரங்களைப் பயன்படுத்தவும், அல்லது உங்கள் அடையாள விவரங்களுடன் உள்நுழையவும்.",
    create_account: "கணக்கை உருவாக்கு",
    create_account_subtitle: "சந்திப்புகளை பதிவு செய்ய, நேரடி டோக்கன்களை காண, மற்றும் நேரடி காத்திருப்பு அறிவிப்புகளைப் பெற ஒரு நோயாளி கணக்கை உருவாக்கவும்.",
    username_or_id: "பயனர்பெயர் / நோயாளி எண்",
    password: "கடவுச்சொல்",
    full_name: "முழு பெயர்",
    mobile_phone: "மொபைல் தொலைபேசி எண்",
    email_address: "மின்னஞ்சல் முகவரி",
    confirm_password: "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    already_have_account: "ஏற்கனவே கணக்கு உள்ளதா?",
    dont_have_account: "கணக்கு இல்லையா?",
    back_to_home: "முகப்புக்குத் திரும்பு",
    one_click_demo: "ஒரு-கிளிக் டெமோ அணுகல்",
    or_enter_credentials: "அல்லது அடையாள விவரங்களை உள்ளிடவும்",

    // ── Patient dashboard ──
    welcome_back: "மீண்டும் வரவேற்கிறோம்",
    upcoming_visit: "வரவிருக்கும் வருகை",
    active_queue_token: "செயலில் உள்ள வரிசை டோக்கன்",
    visits_this_year: "இந்த ஆண்டு வருகைகள்",
    book_new_visit: "புதிய வருகையை பதிவு செய்",
    recent_visits: "சமீபத்திய வருகைகள் & செயல்பாடு",
    view_full_history: "முழு வருகை வரலாற்றைக் காண்க",
    estimated_wait: "மதிப்பிடப்பட்ட காத்திருப்பு",
    ready_now: "இப்போது தயார்",
    none_booked: "எதும் பதிவு செய்யப்படவில்லை",

    // ── Booking flow ──
    step1_title: "படி 1: துறையைத் தேர்ந்தெடுக்கவும்",
    step1_subtitle: "உங்கள் ஆலோசனைக்கான மருத்துவ சிறப்புத் துறையைத் தேர்ந்தெடுக்கவும்.",
    step2_title: "மருத்துவ சேவையைத் தேர்ந்தெடுக்கவும்",
    step2_subtitle: "உங்களுக்குத் தேவையான வருகை வகையைத் தேர்ந்தெடுக்கவும்.",
    step2_provider_title: "மருத்துவரைத் தேர்ந்தெடுக்கவும்",
    any_available_doctor: "கிடைக்கும் எந்த மருத்துவரும்",
    continue_to_slots: "நேர இடத்தைத் தேர்ந்தெடுக்க தொடரவும்",
    select_date: "சந்திப்பு தேதியைத் தேர்ந்தெடுக்கவும்",
    available_slots: "கிடைக்கும் நேர இடங்கள்",
    confirm_book: "உறுதிசெய்து பதிவு செய்யவும்",
    appointment_confirmed: "சந்திப்பு உறுதி செய்யப்பட்டது!",
    assigned_token: "வழங்கப்பட்ட டோக்கன்",
    lunch_break: "மதிய உணவு இடைவேளை",
    fully_booked: "முழுவதும் பதிவு செய்யப்பட்டது",
    other_patient_window: "மற்ற நோயாளி வகைக்கான நேரம்",
    your_window: "உங்கள் நேரம்",
    back: "பின்செல்",

    // ── Visits / status ──
    cancel: "ரத்து செய்",
    departure_board: "புறப்பாடு பலகை",
    no_visits_found: "வருகைகள் இல்லை",
    booked: "பதிவு செய்யப்பட்டது",
    checked_in: "செக் இன் ஆனது",
    in_service: "ஆலோசனையில்",
    completed: "முடிந்தது",
    cancelled: "ரத்து செய்யப்பட்டது",
    no_show: "வராதவர்",
    delayed: "தாமதம்",

    // ── Reception ──
    reception_queue_title: "வரவேற்பு வரிசை பலகை",
    reception_queue_subtitle: "நேரடி வரிசை நிர்வாகம், முன்னுரிமை மற்றும் செக்-இன்கள்.",
    walkin_title: "நேரடி வருகை நோயாளியைப் பதிவு செய்யவும்",
    walkin_subtitle: "தானியங்கி குறுகிய-காத்திருப்பு வழிசெலுத்தலுடன் உடனடி டோக்கன்.",
    patient_full_name: "நோயாளியின் முழு பெயர்",
    phone_number: "தொலைபேசி எண்",
    department: "துறை",
    service_required: "தேவையான சேவை",
    practitioner_assignment: "மருத்துவர் ஒதுக்கீடு",
    generate_token: "நேரடி வருகை டோக்கனை உருவாக்கு",
    appointments_roster_title: "மருத்துவமனை சந்திப்பு பட்டியல்",
    check_in: "செக் இன்",
    now_serving: "இப்போது சேவை",
    waiting_queue: "காத்திருப்பு வரிசை",

    // ── Provider ──
    provider_console_title: "மருத்துவர் செயல்பாட்டு பலகை",
    active_consultation: "செயலில் உள்ள ஆலோசனை அறை",
    upcoming_queue: "வரவிருக்கும் வரிசை",
    complete_consultation: "ஆலோசனையை முடி",
    call_next_patient: "அடுத்த நோயாளியை அழை",
    call_now: "இப்போது அழை",
    add_overrun_delay: "+ தாமத நேரம் சேர்",
    todays_flow: "இன்றைய பணி ஓட்டம்",
    waiting: "காத்திருக்கிறது",
    done_today: "இன்று முடிந்தது",

    // ── Prescriptions ──
    prescriptions: "மருந்து பரிந்துரைகள்",
    add_prescription: "மருந்து பரிந்துரை சேர்",
    no_prescriptions: "இதுவரை மருந்து பரிந்துரைகள் இல்லை",
    medications: "மருந்துகள்",
    notes: "குறிப்புகள்",
    save: "சேமி",

    // ── Admin ──
    overview_title: "மருத்துவமனை மேலோட்டம் & KPI அளவீடுகள்",
    settings_title: "அமைப்புகள் & சேவை உள்ளமைவு",
    providers_title: "மருத்துவர்கள் & ஊழியர்கள்",
    simulator_title: "ஊடாடும் சிமுலேஷன் பலகை",
    avg_wait_time: "சராசரி காத்திருப்பு நேரம்",
    patients_waiting: "காத்திருக்கும் நோயாளிகள்",
    in_consultation: "ஆலோசனையில்",
    completed_today: "இன்று முடிந்தவை",

    // ── Patient type ──
    patient_type: "நோயாளி வகை",
    in_patient: "உள்நோயாளி",
    out_patient: "வெளிநோயாளி",
  },
};

const LangContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const setLang = (l) => setLangState(dict[l] ? l : "en");
  const t = (key) => dict[lang]?.[key] ?? dict.en[key] ?? key;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
