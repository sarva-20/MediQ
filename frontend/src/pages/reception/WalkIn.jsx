import React, { useState } from "react";
import { Link } from "react-router-dom";
import { departments, store, createWalkIn } from "../../mocks/store";
import { addToast } from "../../hooks/useQueueStore";
import { WaitBadge, TokenDisplay } from "../../components/shared";
import { QRCodeSVG } from "qrcode.react";
import { User, Phone, MapPin, Activity, Stethoscope, Printer, RefreshCw, ExternalLink } from "lucide-react";

export default function WalkIn() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deptId, setDeptId] = useState(departments[0]?.id || "");
  const [serviceId, setServiceId] = useState(departments[0]?.services[0]?.id || "");
  const [providerId, setProviderId] = useState("auto");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedDept = departments.find(d => d.id === deptId);
  const deptProviders = store.providers.filter(p => p.department === deptId && p.active);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    
    setLoading(true);
    try {
      const visit = await createWalkIn({
        patient: name.trim(),
        phone: phone.trim(),
        departmentId: deptId,
        serviceId: serviceId,
        providerId: providerId === "auto" ? "auto" : providerId
      });
      
      const assignedProvider = store.providers.find(p => p.id === visit.providerId);
      setResult({ 
        ...visit, 
        providerName: assignedProvider?.name, 
        providerRoom: assignedProvider?.room 
      });
      addToast(`Walk-in registered! Assigned Token: ${visit.token}`);
    } catch (err) {
      addToast("Failed to register walk-in patient", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setResult(null);
  };

  const handlePrint = () => {
    window.print();
  };

  if (result) {
    const statusUrl = `${window.location.origin}/status/${result.token}`;
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="card p-8 text-center space-y-6 shadow-card fade-update">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-status-inservice/15 text-status-inservice mx-auto">
            <Activity className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-ink">Walk-in Token Issued</h2>
            <p className="text-xs text-ink-muted mt-1">Patient placed into live clinical queue.</p>
          </div>
          
          <div className="py-4 px-6 bg-canvas border border-hairline rounded-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Queue Token</p>
            <TokenDisplay token={result.token} size="lg" />
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-left bg-surface p-4 border border-hairline rounded-lg text-xs">
            <div>
              <p className="text-ink-muted font-medium">Patient</p>
              <p className="font-bold text-ink text-sm mt-0.5">{result.patient}</p>
            </div>
            <div>
              <p className="text-ink-muted font-medium">Service</p>
              <p className="font-bold text-ink text-sm mt-0.5">{result.serviceName}</p>
            </div>
            <div className="pt-2 border-t border-hairline">
              <p className="text-ink-muted font-medium">Assigned Doctor</p>
              <p className="font-semibold text-ink mt-0.5">{result.providerName || 'Shortest Queue Doctor'}</p>
            </div>
            <div className="pt-2 border-t border-hairline">
              <p className="text-ink-muted font-medium">Room</p>
              <p className="font-semibold text-ink mt-0.5">{result.providerRoom || 'Triage Room'}</p>
            </div>
          </div>
          
          <div className="flex justify-center text-left">
            <WaitBadge minutes={result.estimatedWait} reason={result.waitReason} />
          </div>
          
          {/* QR Code */}
          <div className="bg-canvas border border-hairline p-4 rounded-xl flex flex-col items-center">
            <p className="text-xs text-ink font-semibold mb-1">Scan for Live Departure Board</p>
            <p className="text-[11px] text-ink-muted mb-3">Live ETA, ahead count & now-serving alerts</p>
            <div className="bg-white p-3 rounded-lg border border-hairline shadow-sm">
              <QRCodeSVG value={statusUrl} size={140} level="M" />
            </div>
            <Link 
              to={`/status/${result.token}`}
              target="_blank"
              className="mt-3 text-xs text-brand-700 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Open status board in new tab <ExternalLink size={12} />
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button 
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 card border border-hairline text-ink text-xs font-semibold hover:bg-canvas transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} /> Print Token Slip
            </button>
            <button 
              onClick={handleReset}
              className="flex-1 py-2.5 px-4 bg-brand-700 text-white rounded-lg text-xs font-semibold hover:bg-brand-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} /> New Walk-In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink tracking-tight">Register Walk-in Patient</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Instant token generation with automatic shortest-wait routing.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-ink flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-ink-muted" /> Patient Full Name <span className="text-status-noshow">*</span>
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink focus:outline-none focus:border-brand-500"
              required
              placeholder="e.g. Anand Murthy"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-ink flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-ink-muted" /> Phone Number <span className="text-status-noshow">*</span>
            </label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink focus:outline-none focus:border-brand-500"
              required
              placeholder="e.g. 9876543210"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-hairline">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-ink flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-ink-muted" /> Department
              </label>
              <select 
                value={deptId}
                onChange={e => {
                  setDeptId(e.target.value);
                  const newDept = departments.find(d => d.id === e.target.value);
                  setServiceId(newDept?.services[0]?.id || "");
                  setProviderId("auto");
                }}
                className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink outline-none focus:border-brand-500"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-ink flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-ink-muted" /> Service Required
              </label>
              <select 
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink outline-none focus:border-brand-500"
              >
                {selectedDept?.services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-ink flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-ink-muted" /> Medical Practitioner Assignment
            </label>
            <select 
              value={providerId}
              onChange={e => setProviderId(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink outline-none focus:border-brand-500"
            >
              <option value="auto">Auto: Route to Shortest Wait Time</option>
              {deptProviders.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.room}</option>
              ))}
            </select>
          </div>
          
          <div className="pt-3">
            <button 
              type="submit" 
              disabled={!name.trim() || !phone.trim() || loading}
              className="w-full py-3 bg-brand-700 text-white rounded-lg text-sm font-semibold hover:bg-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {loading ? "Generating Token..." : "Generate Walk-In Token"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
