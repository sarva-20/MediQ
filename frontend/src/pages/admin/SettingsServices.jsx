import React, { useState } from 'react';
import { useStoreRefresh, addToast } from '../../hooks/useQueueStore';
import { store, updateSettings, updateService, departments } from '../../mocks/store';
import { Save, Edit2, Check, X, Sliders } from 'lucide-react';

export default function SettingsServices() {
  useStoreRefresh();
  
  const [settingsForm, setSettingsForm] = useState(() => ({ ...store.settings }));
  const [editingRowKey, setEditingRowKey] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await updateSettings(settingsForm);
    addToast('Global clinic settings updated');
  };

  const handleStartEdit = (deptId, service) => {
    setEditingRowKey(`${deptId}-${service.id}`);
    setEditFormData({ ...service });
  };

  const handleSaveService = async (deptId, serviceId) => {
    await updateService(deptId, serviceId, editFormData);
    setEditingRowKey(null);
    addToast(`Updated service: ${editFormData.name}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Settings & Service Configuration</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Tune clinic queue thresholds, no-show rules, and clinical consultation durations.
        </p>
      </div>
      
      {/* Settings Form Card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-hairline">
          <Sliders size={18} className="text-brand-700" />
          <h2 className="text-base font-bold text-ink">Queue Engine Parameters</h2>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                No-Show Grace (Minutes)
              </label>
              <input 
                type="number" 
                min="0"
                max="60"
                value={settingsForm.noShowGraceMinutes} 
                onChange={e => setSettingsForm({ ...settingsForm, noShowGraceMinutes: parseInt(e.target.value, 10) || 0 })} 
                className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink tabular-nums focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-ink-muted mt-1 block">Buffer before auto-marking absent</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                Default Overbooking Limit
              </label>
              <input 
                type="number" 
                min="0"
                max="5"
                value={settingsForm.defaultOverbookLimit} 
                onChange={e => setSettingsForm({ ...settingsForm, defaultOverbookLimit: parseInt(e.target.value, 10) || 0 })} 
                className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink tabular-nums focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-ink-muted mt-1 block">Extra patients per slot</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                Queue Learning Rate
              </label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"
                max="1.0"
                value={settingsForm.learningRate} 
                onChange={e => setSettingsForm({ ...settingsForm, learningRate: parseFloat(e.target.value) || 0.1 })} 
                className="w-full bg-surface border border-hairline rounded-md p-2.5 text-sm text-ink tabular-nums focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-ink-muted mt-1 block">Adaptive ETA weighting speed</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                Walk-In Auto-Routing
              </label>
              <div className="pt-2">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settingsForm.walkInAutoRouting} 
                    onChange={e => setSettingsForm({ ...settingsForm, walkInAutoRouting: e.target.checked })} 
                    className="w-4 h-4 rounded text-brand-700 focus:ring-brand-500"
                  />
                  <span className="text-sm font-semibold text-ink">
                    {settingsForm.walkInAutoRouting ? "Enabled (Shortest Wait)" : "Disabled"}
                  </span>
                </label>
              </div>
              <span className="text-[11px] text-ink-muted mt-1 block">Auto-balance load across active doctors</span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-hairline">
            <button 
              type="submit" 
              className="flex items-center gap-1.5 bg-brand-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-brand-500 transition-colors cursor-pointer shadow-sm"
            >
              <Save size={14} /> Save Global Parameters
            </button>
          </div>
        </form>
      </div>

      {/* Services Table Card */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-hairline bg-surface flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Department Clinical Services Catalog</h2>
            <p className="text-xs text-ink-muted">Configure default appointment slot lengths and preparation turnaround</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-canvas text-xs uppercase font-bold text-ink-muted">
                <th className="py-3 px-4">Specialty</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Consultation Duration</th>
                <th className="py-3 px-4">Prep Buffer Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {departments.map((dept) =>
                dept.services.map((service) => {
                  const rowKey = `${dept.id}-${service.id}`;
                  const isEditing = editingRowKey === rowKey;

                  if (isEditing) {
                    return (
                      <tr key={rowKey} className="bg-brand-100/30">
                        <td className="py-3 px-4 font-semibold text-xs text-ink">{dept.name}</td>
                        <td className="py-3 px-4">
                          <input 
                            type="text" 
                            value={editFormData.name} 
                            onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} 
                            className="w-full bg-surface border border-hairline rounded p-1.5 text-xs text-ink"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              min="5" 
                              max="120"
                              value={editFormData.duration} 
                              onChange={e => setEditFormData({ ...editFormData, duration: parseInt(e.target.value, 10) || 15 })} 
                              className="w-20 bg-surface border border-hairline rounded p-1.5 text-xs tabular-nums text-ink"
                            />
                            <span className="text-xs text-ink-muted">min</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              min="0" 
                              max="30"
                              value={editFormData.prepTime} 
                              onChange={e => setEditFormData({ ...editFormData, prepTime: parseInt(e.target.value, 10) || 0 })} 
                              className="w-20 bg-surface border border-hairline rounded p-1.5 text-xs tabular-nums text-ink"
                            />
                            <span className="text-xs text-ink-muted">min</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={editFormData.active} 
                              onChange={e => setEditFormData({ ...editFormData, active: e.target.checked })} 
                              className="rounded text-brand-700"
                            />
                            <span className="text-xs text-ink">{editFormData.active ? "Active" : "Inactive"}</span>
                          </label>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => handleSaveService(dept.id, service.id)} 
                              className="p-1.5 bg-brand-700 text-white rounded hover:bg-brand-500 cursor-pointer"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingRowKey(null)} 
                              className="p-1.5 card border border-hairline text-ink-muted hover:text-ink cursor-pointer"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={rowKey} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-xs text-ink">{dept.name}</td>
                      <td className="py-3 px-4 font-medium text-ink">{service.name}</td>
                      <td className="py-3 px-4 tabular-nums text-ink">{service.duration} mins</td>
                      <td className="py-3 px-4 tabular-nums text-ink-muted">+{service.prepTime} mins</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          service.active ? "bg-status-inservice/15 text-status-inservice" : "bg-canvas text-ink-muted"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${service.active ? "bg-status-inservice" : "bg-ink-muted"}`} />
                          {service.active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={() => handleStartEdit(dept.id, service)} 
                          className="p-1.5 text-ink-muted hover:text-brand-700 hover:bg-canvas rounded border border-hairline cursor-pointer"
                          title="Edit Service Duration"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
