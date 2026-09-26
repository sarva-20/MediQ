// ─── MediQ Chatbot Assistant Mock Logic ───
// Rule-based mock assistant reading live from the same mock store.
// Designed for jury review: "Mock rule engine now, pluggable LLM/RAG later".

import { 
  getPatientVisits, 
  store, 
  departments 
} from './store';
import { formatTime, formatDate, formatWaitMinutes } from '../lib/utils';

export function getInitialGreeting(patientName = 'Arjun') {
  const firstName = patientName.split(' ')[0] || patientName;
  const visits = getPatientVisits(patientName);
  
  // Check for active visit (in-service, checked-in, or booked)
  const activeVisit = visits.find(
    v => v.status === 'in-service' || v.status === 'checked-in' || v.status === 'booked'
  );

  if (activeVisit) {
    const provider = store.providers.find(p => p.id === activeVisit.providerId);
    const doctorName = provider ? provider.name : 'your doctor';
    const waitStr = activeVisit.status === 'in-service' 
      ? 'currently being seen' 
      : `about ${activeVisit.estimatedWait || 5} minutes out`;

    return {
      text: `Hey ${firstName} — you're token ${activeVisit.token}, ${waitStr} with ${doctorName}. Anything I can help you with today?`,
      activeVisitToken: activeVisit.token,
      quickReplies: ['Check my wait time', 'Next appointment', 'Clinic hours', 'Find a doctor']
    };
  }

  return {
    text: `Hello ${firstName}! I'm your MediQ Clinic Assistant. I can check your live queue status, find available doctors, or look up clinic hours. How can I help?`,
    quickReplies: ['My wait time', 'Next appointment', 'Book consultation', 'Clinic hours']
  };
}

export function generateBotResponse(userInput, patientName = 'Arjun') {
  const text = (userInput || '').trim().toLowerCase();
  const firstName = patientName.split(' ')[0] || patientName;
  const visits = getPatientVisits(patientName);

  // 1. Wait time / "how long" / "queue" / "status" / "eta"
  if (
    text.includes('wait') || 
    text.includes('how long') || 
    text.includes('token') || 
    text.includes('queue') || 
    text.includes('eta') ||
    text.includes('turn')
  ) {
    const activeVisit = visits.find(
      v => v.status === 'in-service' || v.status === 'checked-in' || v.status === 'booked'
    );

    if (activeVisit) {
      const provider = store.providers.find(p => p.id === activeVisit.providerId);
      const doc = provider?.name || 'Dr. Priya Sharma';
      const room = provider?.room || 'Room 101';
      
      if (activeVisit.status === 'in-service') {
        return {
          text: `You are currently in service with ${doc} in ${room}! Please proceed directly inside if you aren't already there.`,
          actionLink: `/status/${activeVisit.token}`,
          actionLabel: 'Open Live Departure Board'
        };
      }

      const wait = formatWaitMinutes(activeVisit.estimatedWait);
      const ahead = Math.max(0, (activeVisit.position || 1) - 1);
      const reason = activeVisit.waitReason || 'Queue proceeding according to clinical schedule.';

      return {
        text: `Your token is ${activeVisit.token} for ${activeVisit.serviceName} with ${doc} (${room}). Estimated wait is ${wait} (${ahead} patient${ahead === 1 ? '' : 's'} ahead). ${reason}`,
        actionLink: `/status/${activeVisit.token}`,
        actionLabel: 'View Live Departure Board'
      };
    } else {
      return {
        text: `You don't have an active queue token in the clinic right now. Would you like to schedule an appointment or register as a walk-in?`,
        actionLink: '/patient/book',
        actionLabel: 'Book Appointment'
      };
    }
  }

  // 2. Next appointment / "when" / "upcoming" / "scheduled"
  if (
    text.includes('next') || 
    text.includes('when') || 
    text.includes('appointment') || 
    text.includes('schedule') ||
    text.includes('upcoming')
  ) {
    const upcoming = visits
      .filter(v => v.status === 'booked' || v.status === 'checked-in')
      .sort((a, b) => a.scheduledTime - b.scheduledTime)[0];

    if (upcoming) {
      const provider = store.providers.find(p => p.id === upcoming.providerId);
      const doc = provider?.name || 'Assigned Doctor';
      const room = provider?.room || 'Clinical Wing';

      return {
        text: `Your next appointment is with ${doc} (${room}) on ${formatDate(upcoming.scheduledTime)} at ${formatTime(upcoming.scheduledTime)} for ${upcoming.serviceName}. Your token number is ${upcoming.token}.`,
        actionLink: `/status/${upcoming.token}`,
        actionLabel: 'Track Token Status'
      };
    } else {
      return {
        text: `You have no upcoming appointments on file. You can pick a 15-minute slot in General Medicine, Ophthalmology, Paediatrics, or Radiology.`,
        actionLink: '/patient/book',
        actionLabel: 'Book New Appointment'
      };
    }
  }

  // 3. Cancel / "reschedule" / "change"
  if (
    text.includes('cancel') || 
    text.includes('reschedule') || 
    text.includes('postpone') || 
    text.includes('change date')
  ) {
    return {
      text: `To cancel or reschedule, please head to the "My Visits" page where you can cancel any booked visit with one click, or book a fresh slot anytime.`,
      actionLink: '/patient/visits',
      actionLabel: 'Manage My Visits'
    };
  }

  // 4. Doctor / "department" / "specialist" / "physician" / "who"
  if (
    text.includes('doctor') || 
    text.includes('department') || 
    text.includes('specialist') || 
    text.includes('physician') || 
    text.includes('providers')
  ) {
    const activeDocs = store.providers.filter(p => p.active);
    const deptList = departments.map(d => `${d.name} (${d.code})`).join(', ');

    return {
      text: `We have ${activeDocs.length} active practitioners available today across ${departments.length} departments: ${deptList}. Would you like to select a specialist?`,
      actionLink: '/patient/book',
      actionLabel: 'Select Doctor & Slot'
    };
  }

  // 5. Hours / "location" / "address" / "timing" / "where" / "open"
  if (
    text.includes('hour') || 
    text.includes('time') || 
    text.includes('location') || 
    text.includes('address') || 
    text.includes('where') || 
    text.includes('open')
  ) {
    return {
      text: `MediQ Clinical Centre is open Monday to Saturday from 8:00 AM to 8:00 PM IST. Emergency walk-in triage operates 24/7 at Reception Wing A, Ground Floor.`
    };
  }

  // 6. Gratitude / Hello
  if (
    text === 'hi' || 
    text === 'hello' || 
    text === 'hey' || 
    text === 'help'
  ) {
    return {
      text: `Hi ${firstName}! You can ask me "How long is my wait?", "When is my next appointment?", "Find a doctor", or "Clinic hours". What can I look up for you?`
    };
  }

  if (
    text.includes('thank') || 
    text.includes('thanks') || 
    text.includes('great') || 
    text.includes('awesome')
  ) {
    return {
      text: `You're very welcome, ${firstName}! Let me know if you need anything else during your visit. Have a calm and pleasant day!`
    };
  }

  // 7. Fallback
  return {
    text: `I'm not completely sure about that yet, but you can always check My Visits for details or speak with our friendly front desk team at reception.`,
    actionLink: '/patient/visits',
    actionLabel: 'Go to My Visits'
  };
}
