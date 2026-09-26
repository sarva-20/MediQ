import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Stethoscope, 
  Eye, 
  Baby, 
  ScanLine, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight,
  User,
  Building,
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  departments, 
  getDepartmentProviders, 
  getSlotAvailability, 
  bookAppointment,
  store,
  simDate
} from '../../mocks/store';
import { useSimClock, addToast } from '../../hooks/useQueueStore';
import { formatTime, formatDate, DEMO_PATIENT, DEMO_PATIENT_PHONE } from '../../lib/utils';
import { TokenDisplay, SkeletonRows, EmptyState } from '../../components/shared';

const ICON_MAP = {
  stethoscope: Stethoscope,
  eye: Eye,
  baby: Baby,
  scanline: ScanLine,
};

export default function BookAppointment() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { now: currentTime } = useSimClock();
  
  // Selections
  const [department, setDepartment] = useState(null);
  const [service, setService] = useState(null);
  const [providerId, setProviderId] = useState(null); // 'any' or specific id
  const [dateStr, setDateStr] = useState('');
  const [slot, setSlot] = useState(null);
  
  // Final booked visit
  const [bookedVisit, setBookedVisit] = useState(null);

  // Initialize date selection to today's sim date
  useEffect(() => {
    if (!dateStr) {
      const d = simDate();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setDateStr(`${year}-${month}-${day}`);
    }
  }, [dateStr]);

  const handleNextStep = (nextStep) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(nextStep);
    }, 250);
  };

  const handleDepartmentSelect = (dept) => {
    setDepartment(dept);
    setService(null);
    setProviderId(null);
    setSlot(null);
    handleNextStep(2);
  };

  const handleBook = async () => {
    if (!department || !service || !providerId || !dateStr || !slot) return;
    
    setLoading(true);
    try {
      const visit = await bookAppointment({
        patient: DEMO_PATIENT,
        phone: DEMO_PATIENT_PHONE,
        departmentId: department.id,
        serviceId: service.id,
        providerId: providerId,
        scheduledTime: slot.time
      });
      setBookedVisit(visit);
      setStep('done');
      addToast('Appointment booked successfully!');
    } catch (err) {
      addToast('Failed to book appointment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ink">Step 1: Choose Department</h2>
        <p className="text-sm text-ink-muted mt-1">Select the medical specialty for your consultation.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {departments.map((dept) => {
          const Icon = ICON_MAP[dept.icon?.toLowerCase()] || Building;
          const providers = getDepartmentProviders(dept.id);
          
          return (
            <button
              key={dept.id}
              onClick={() => handleDepartmentSelect(dept)}
              className="card p-6 flex flex-col items-start gap-4 text-left hover:border-brand-500 hover:bg-brand-100/30 transition-all w-full cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                <Icon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-ink text-lg group-hover:text-brand-700 transition-colors">
                    {dept.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-brand-100 text-brand-700 font-semibold font-mono">
                    {dept.code}
                  </span>
                </div>
                <p className="text-sm text-ink-muted mt-1">
                  {providers.length} doctor{providers.length > 1 ? 's' : ''} available • {dept.services.length} services
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (!department) return null;
    const providers = getDepartmentProviders(department.id);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <button 
              onClick={() => setStep(1)} 
              className="hover:text-brand-700 flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft size={16} /> Departments
            </button>
            <ChevronRight size={14} />
            <span className="font-semibold text-brand-700">{department.name}</span>
          </div>
          <span className="text-xs text-ink-muted">Step 2 of 3</span>
        </div>

        {/* Services */}
        <div>
          <h3 className="text-base font-bold text-ink mb-1">Select Clinical Service</h3>
          <p className="text-xs text-ink-muted mb-3">Choose the type of visit you require.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {department.services.map((svc) => {
              const isSelected = service?.id === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => setService(svc)}
                  className={`card p-4 text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-brand-500 bg-brand-100/50 ring-1 ring-brand-500' 
                      : 'hover:border-brand-500'
                  }`}
                >
                  <div className="font-semibold text-ink text-sm">{svc.name}</div>
                  <div className="text-xs text-ink-muted flex items-center gap-1 mt-2">
                    <Clock size={13} />
                    <span className="tabular-nums font-medium">{svc.duration} mins</span>
                    <span className="text-hairline mx-1">|</span>
                    <span>+{svc.prepTime}m prep</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Providers */}
        {service && (
          <div className="fade-update pt-2">
            <h3 className="text-base font-bold text-ink mb-1">Select Medical Practitioner</h3>
            <p className="text-xs text-ink-muted mb-3">Choose a specific doctor or let MediQ route to shortest queue.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Any available option */}
              <button
                onClick={() => setProviderId('any')}
                className={`card p-4 flex items-center gap-3.5 transition-all text-left cursor-pointer ${
                  providerId === 'any' 
                    ? 'border-brand-500 bg-brand-100/60 ring-1 ring-brand-500' 
                    : 'hover:border-brand-500'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-accent-amber text-white flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="font-bold text-ink text-sm">Any available doctor</div>
                  <div className="text-xs text-accent-amber font-semibold">Automatic: Shortest wait time</div>
                </div>
              </button>

              {/* Specific providers */}
              {providers.map((p) => {
                const isSelected = providerId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProviderId(p.id)}
                    className={`card p-4 flex items-center gap-3.5 transition-all text-left cursor-pointer ${
                      isSelected 
                        ? 'border-brand-500 bg-brand-100/60 ring-1 ring-brand-500' 
                        : 'hover:border-brand-500'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-canvas border border-hairline flex items-center justify-center text-brand-700 font-semibold text-xs shrink-0">
                      <User size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink text-sm truncate">{p.name}</div>
                      <div className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5">
                        <span>{p.kind}</span>
                        <span>•</span>
                        <span>{p.room}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-hairline">
          <button
            onClick={() => setStep(1)}
            className="px-4 py-2 border border-hairline text-ink rounded font-medium hover:bg-canvas text-sm cursor-pointer"
          >
            Back
          </button>
          <button
            disabled={!service || !providerId}
            onClick={() => handleNextStep(3)}
            className="px-6 py-2 bg-accent-amber text-white rounded font-semibold hover:bg-accent-amber/90 disabled:opacity-40 transition-colors text-sm cursor-pointer"
          >
            Continue to Slot Selection
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    if (!department || !service || !providerId) return null;
    
    // Generate next 7 days based on sim date
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = simDate();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dStr = `${year}-${month}-${day}`;
      
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dateNum = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return { dateStr: dStr, dayName, dateNum, timestamp: d.getTime() };
    });

    const activeProvider = providerId === 'any' ? getDepartmentProviders(department.id)[0] : store.providers.find(p => p.id === providerId);
    const selectedDayObj = days.find(d => d.dateStr === dateStr) || days[0];
    const availableSlots = activeProvider ? getSlotAvailability(activeProvider.id, selectedDayObj.timestamp) : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <button 
              onClick={() => setStep(2)} 
              className="hover:text-brand-700 flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft size={16} /> Doctor & Service
            </button>
            <ChevronRight size={14} />
            <span className="font-semibold text-brand-700">Choose Slot</span>
          </div>
          <span className="text-xs text-ink-muted">Step 3 of 3</span>
        </div>

        {/* Date Selector Row */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
            Select Appointment Date
          </h3>
          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {days.map((d) => {
              const isSelected = dateStr === d.dateStr;
              return (
                <button
                  key={d.dateStr}
                  onClick={() => { setDateStr(d.dateStr); setSlot(null); }}
                  className={`flex flex-col items-center px-4 py-2.5 rounded-lg border transition-all cursor-pointer min-w-[85px] ${
                    isSelected
                      ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                      : 'bg-surface border-hairline text-ink hover:border-brand-500'
                  }`}
                >
                  <span className={`text-xs font-semibold ${isSelected ? 'text-brand-100' : 'text-ink-muted'}`}>
                    {d.dayName}
                  </span>
                  <span className="text-sm font-bold mt-0.5 tabular-nums">
                    {d.dateNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Available Slots ({selectedDayObj.dayName}, {selectedDayObj.dateNum})
            </h3>
            <span className="text-xs text-ink-muted">
              Capacity: {activeProvider?.slotLength} min consultations
            </span>
          </div>

          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {availableSlots.map((s) => {
                const isSelected = slot?.time === s.time;
                const isFull = s.full;
                
                return (
                  <button
                    key={s.time}
                    disabled={isFull}
                    onClick={() => setSlot(s)}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      isFull 
                        ? 'opacity-40 cursor-not-allowed bg-canvas border-hairline text-ink-muted' 
                        : isSelected
                          ? 'border-brand-500 bg-brand-100 ring-2 ring-brand-500 text-brand-700 font-bold'
                          : 'border-hairline hover:border-brand-500 bg-surface text-ink'
                    }`}
                  >
                    <div className="text-sm font-semibold tabular-nums">{formatTime(s.time)}</div>
                    <div className={`text-[11px] mt-1 tabular-nums ${isFull ? 'text-status-noshow font-medium' : 'text-ink-muted'}`}>
                      {isFull ? 'Fully Booked' : `${s.available} left`}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState 
              icon={Clock} 
              title="No Slots Scheduled" 
              description="No available consultation slots for this date. Please select another date." 
            />
          )}
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center pt-6 border-t border-hairline">
          <button
            onClick={() => setStep(2)}
            className="px-4 py-2 border border-hairline text-ink rounded font-medium hover:bg-canvas text-sm cursor-pointer"
          >
            Back
          </button>
          <button
            disabled={!slot}
            onClick={handleBook}
            className="px-6 py-2.5 bg-accent-amber text-white rounded font-semibold hover:bg-accent-amber/90 disabled:opacity-40 transition-colors text-sm cursor-pointer"
          >
            Confirm & Book Appointment
          </button>
        </div>
      </div>
    );
  };

  const renderDone = () => {
    if (!bookedVisit) return null;
    const provider = store.providers.find(p => p.id === bookedVisit.providerId);

    return (
      <div className="card max-w-xl mx-auto text-center p-8 sm:p-10 shadow-card fade-update">
        <div className="w-14 h-14 rounded-full bg-status-inservice/15 text-status-inservice flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-ink tracking-tight">Appointment Confirmed!</h2>
        <p className="text-sm text-ink-muted mt-1 mb-6">
          Your clinic consultation has been scheduled in the MediQ queue engine.
        </p>
        
        {/* Token Callout */}
        <div className="bg-canvas border border-hairline rounded-xl p-6 mb-6">
          <span className="text-xs uppercase tracking-widest text-ink-muted font-bold block mb-1">
            Assigned Token
          </span>
          <TokenDisplay token={bookedVisit.token} size="lg" />
          
          <div className="grid grid-cols-2 gap-3 text-left mt-6 pt-6 border-t border-hairline">
            <div>
              <span className="text-xs text-ink-muted block">Scheduled Date & Time</span>
              <span className="text-sm font-semibold text-ink tabular-nums">
                {formatDate(bookedVisit.scheduledTime)} at {formatTime(bookedVisit.scheduledTime)}
              </span>
            </div>
            <div>
              <span className="text-xs text-ink-muted block">Practitioner</span>
              <span className="text-sm font-semibold text-ink">
                {provider?.name} ({provider?.room})
              </span>
            </div>
            <div>
              <span className="text-xs text-ink-muted block">Clinical Service</span>
              <span className="text-sm font-semibold text-ink">
                {bookedVisit.serviceName}
              </span>
            </div>
            <div>
              <span className="text-xs text-ink-muted block">Patient Name</span>
              <span className="text-sm font-semibold text-ink">
                {bookedVisit.patient}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/patient/visits"
            className="flex-1 py-2.5 px-4 bg-accent-amber text-white font-medium rounded-lg hover:bg-accent-amber/90 transition-colors text-sm text-center"
          >
            Go to My Visits
          </Link>
          <Link
            to={`/status/${bookedVisit.token}`}
            target="_blank"
            className="py-2.5 px-4 card border border-hairline text-accent-amber font-semibold hover:underline transition-colors text-sm text-center inline-flex items-center justify-center gap-1"
          >
            Open Live Token Screen
          </Link>
        </div>
      </div>
    );
  };

  const renderSummaryRail = () => {
    const activeProvider = providerId === 'any' 
      ? { name: 'Any available doctor', kind: 'Shortest queue allocation', room: 'Auto-assigned' } 
      : store.providers.find(p => p.id === providerId);

    return (
      <div className="card p-5 bg-surface border border-hairline rounded-xl space-y-4 shadow-sm text-left h-fit">
        <div className="flex items-center justify-between pb-3 border-b border-hairline">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Booking Summary</span>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
            Step {step} of 3
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* Department */}
          <div>
            <span className="text-ink-muted block text-[11px]">Specialty Department</span>
            <span className="font-bold text-ink text-sm mt-0.5 block">{department ? `${department.name} (${department.code})` : '—'}</span>
          </div>

          {/* Service */}
          <div className="pt-2 border-t border-hairline">
            <span className="text-ink-muted block text-[11px]">Clinical Service</span>
            <span className="font-semibold text-ink mt-0.5 block">{service ? `${service.name} (${service.duration} mins)` : 'Select a service'}</span>
          </div>

          {/* Doctor */}
          <div className="pt-2 border-t border-hairline">
            <span className="text-ink-muted block text-[11px]">Assigned Doctor</span>
            <span className="font-semibold text-ink mt-0.5 block">{activeProvider ? activeProvider.name : 'Select a practitioner'}</span>
            {activeProvider?.room && <span className="text-ink-muted text-[11px]">{activeProvider.room}</span>}
          </div>

          {/* Selected Date & Time */}
          <div className="pt-2 border-t border-hairline">
            <span className="text-ink-muted block text-[11px]">Chosen Slot</span>
            {slot ? (
              <div className="mt-0.5">
                <span className="font-bold text-brand-700 text-sm tabular-nums block">{formatTime(slot.time)}</span>
                <span className="text-ink-muted">{formatDate(slot.time)}</span>
              </div>
            ) : (
              <span className="text-ink-muted italic mt-0.5 block">Select an available slot</span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-hairline bg-canvas/60 -mx-5 -mb-5 p-4 rounded-b-xl text-[11px] text-ink-muted leading-relaxed">
          <span className="font-semibold text-ink block mb-0.5">Departure Queue Guarantee:</span>
          Your wait time is dynamically recalculated based on live doctor progress.
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Book Clinic Appointment</h1>
          <p className="text-sm text-ink-muted mt-0.5">3-step calm booking flow with instant capacity checks.</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 sm:p-8">
          <SkeletonRows rows={6} />
        </div>
      ) : (
        <>
          {step === 1 && (
            <div className="card p-6 sm:p-8">
              {renderStep1()}
            </div>
          )}

          {(step === 2 || step === 3) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 card p-6 sm:p-8">
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </div>
              <div className="lg:col-span-4 lg:sticky lg:top-24">
                {renderSummaryRail()}
              </div>
            </div>
          )}

          {step === 'done' && renderDone()}
        </>
      )}
    </div>
  );
}
