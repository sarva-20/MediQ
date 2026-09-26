import React, { useState } from 'react';
import { useStoreRefresh, addToast } from '../../hooks/useQueueStore';
import { 
  store, 
  updateProvider, 
  deactivateProvider, 
  addProvider, 
  departments 
} from '../../mocks/store';
import { Plus, Edit2, Power, UserCog, Check, X } from 'lucide-react';
import { Modal } from '../../components/shared';

export default function Providers() {
  useStoreRefresh();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  
  const handleOpenAdd = () => {
    setEditingProvider(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProvider(p);
    setModalOpen(true);
  };

  const handleToggleActive = async (id) => {
    const updated = await deactivateProvider(id);
    addToast(`${updated.name} ${updated.active ? 'activated' : 'deactivated'}`);
  };

  const getDeptName = (deptId) => {
    return departments.find(d => d.id === deptId)?.name || deptId;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Clinical Practitioners & Staff</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Manage provider roster, consultation shift windows, and slot capacity limits.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd} 
          className="flex items-center gap-1.5 bg-brand-700 text-white px-4 py-2.5 rounded-lg hover:bg-brand-500 font-semibold text-xs transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={15} /> Add Medical Practitioner
        </button>
      </div>
      
      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-canvas text-xs uppercase font-bold text-ink-muted">
                <th className="py-3 px-4">Practitioner Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Role / Kind</th>
                <th className="py-3 px-4">Shift Schedule</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Slot Duration</th>
                <th className="py-3 px-4">Slot Cap</th>
                <th className="py-3 px-4">Overbook Lim</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {store.providers.map(p => (
                <tr 
                  key={p.id} 
                  className={`hover:bg-canvas/50 transition-colors ${!p.active ? 'opacity-50 bg-canvas/30' : ''}`}
                >
                  <td className="py-3.5 px-4 font-bold text-ink">
                    {p.name}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-ink-muted">
                    {getDeptName(p.department)}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-ink">
                    {p.kind}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-xs font-mono text-ink">
                    {p.shift}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-ink">
                    {p.room}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-xs text-ink font-semibold">
                    {p.slotLength} min
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-xs text-ink">
                    {p.slotCapacity} pts
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-xs text-ink">
                    +{p.overbookLimit}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      p.active ? "bg-status-inservice/15 text-status-inservice" : "bg-status-noshow/15 text-status-noshow"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? "bg-status-inservice" : "bg-status-noshow"}`} />
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => handleOpenEdit(p)} 
                        className="p-1.5 text-ink-muted hover:text-brand-700 hover:bg-canvas rounded border border-hairline transition-colors cursor-pointer"
                        title="Edit Provider"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleToggleActive(p.id)} 
                        className={`p-1.5 rounded border transition-colors cursor-pointer ${
                          p.active 
                            ? "text-status-noshow border-hairline hover:bg-status-noshow/10" 
                            : "text-status-inservice border-status-inservice/30 hover:bg-status-inservice/10"
                        }`}
                        title={p.active ? "Deactivate Provider" : "Activate Provider"}
                      >
                        <Power size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal */}
      {modalOpen && (
        <ProviderModal 
          provider={editingProvider} 
          onClose={() => setModalOpen(false)} 
        />
      )}
    </div>
  );
}

function ProviderModal({ provider, onClose }) {
  const [formData, setFormData] = useState(() => provider ? { ...provider } : {
    name: 'Dr. ',
    department: 'gm',
    kind: 'Consultant',
    shift: '09:00–17:00',
    room: 'Room ',
    slotLength: 15,
    slotCapacity: 3,
    overbookLimit: 1,
    active: true
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.room.trim()) return;

    if (provider) {
      await updateProvider(provider.id, formData);
      addToast(`Updated ${formData.name}`);
    } else {
      await addProvider(formData);
      addToast(`Added new practitioner: ${formData.name}`);
    }
    onClose();
  };

  return (
    <Modal 
      open={true} 
      onClose={onClose} 
      title={provider ? `Edit: ${provider.name}` : "Add New Medical Practitioner"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
            Doctor / Practitioner Name <span className="text-status-noshow">*</span>
          </label>
          <input 
            type="text" 
            className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink focus:outline-none focus:border-brand-500" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
            required
            placeholder="e.g. Dr. Rajesh Verma"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Department Specialty
            </label>
            <select 
              className="w-full bg-surface border border-hairline rounded-md p-2 text-sm text-ink outline-none focus:border-brand-500" 
              value={formData.department} 
              onChange={e => setFormData({ ...formData, department: e.target.value })}
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Role / Seniority
            </label>
            <select 
              className="w-full bg-surface border border-hairline rounded-md p-2 text-sm text-ink outline-none focus:border-brand-500" 
              value={formData.kind} 
              onChange={e => setFormData({ ...formData, kind: e.target.value })}
            >
              <option value="Senior Consultant">Senior Consultant</option>
              <option value="Consultant">Consultant</option>
              <option value="Junior Consultant">Junior Consultant</option>
              <option value="Senior Radiologist">Senior Radiologist</option>
              <option value="Radiologist">Radiologist</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Shift Hours (Start–End)
            </label>
            <input 
              type="text" 
              className="w-full bg-surface border border-hairline rounded-md p-2 text-sm text-ink font-mono focus:outline-none focus:border-brand-500" 
              value={formData.shift} 
              onChange={e => setFormData({ ...formData, shift: e.target.value })} 
              required
              placeholder="09:00–17:00"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Consultation Room
            </label>
            <input 
              type="text" 
              className="w-full bg-surface border border-hairline rounded-md p-2 text-sm text-ink focus:outline-none focus:border-brand-500" 
              value={formData.room} 
              onChange={e => setFormData({ ...formData, room: e.target.value })} 
              required
              placeholder="e.g. Room 104"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Slot Length
            </label>
            <input 
              type="number" 
              min="5" 
              max="60"
              className="w-full bg-surface border border-hairline rounded-md p-2 text-sm text-ink tabular-nums focus:outline-none focus:border-brand-500" 
              value={formData.slotLength} 
              onChange={e => setFormData({ ...formData, slotLength: parseInt(e.target.value, 10) || 15 })} 
            />
            <span className="text-[10px] text-ink-muted mt-0.5 block">Minutes</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Slot Capacity
            </label>
            <input 
              type="number" 
              min="1" 
              max="10"
              className="w-full bg-surface border border-hairline rounded-md p-2 text-sm text-ink tabular-nums focus:outline-none focus:border-brand-500" 
              value={formData.slotCapacity} 
              onChange={e => setFormData({ ...formData, slotCapacity: parseInt(e.target.value, 10) || 1 })} 
            />
            <span className="text-[10px] text-ink-muted mt-0.5 block">Patients / slot</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
              Overbook Lim
            </label>
            <input 
              type="number" 
              min="0" 
              max="5"
              className="w-full bg-surface border border-hairline rounded-md p-2 text-sm text-ink tabular-nums focus:outline-none focus:border-brand-500" 
              value={formData.overbookLimit} 
              onChange={e => setFormData({ ...formData, overbookLimit: parseInt(e.target.value, 10) || 0 })} 
            />
            <span className="text-[10px] text-ink-muted mt-0.5 block">Extra buffer</span>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-hairline">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-hairline rounded-md text-xs font-semibold text-ink hover:bg-canvas cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-5 py-2 bg-brand-700 text-white rounded-md text-xs font-semibold hover:bg-brand-500 transition-colors cursor-pointer shadow-sm"
          >
            {provider ? "Save Practitioner Changes" : "Create Practitioner"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
