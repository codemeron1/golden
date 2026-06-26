import { useState } from 'react';
import { Hash, Edit2, Trash2, Check, X } from 'lucide-react';
import {
  formatDuration,
  formatTime,
  toLocalISOString
} from '../../../utils/timeUtils';

// Sub-component for each Time Entry item
export default function TaskHistorySidebarTimeEntryItem({ entry, index, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    started_at: entry.started_at ? toLocalISOString(entry.started_at) : '',
    ended_at: entry.ended_at ? toLocalISOString(entry.ended_at) : '',
    description: entry.description || ''
  });

  const handleEditSave = async () => {
    try {
      // Re-format to full ISO strings
      const updates = {
        started_at: new Date(editForm.started_at).toISOString(),
        ended_at: editForm.ended_at ? new Date(editForm.ended_at).toISOString() : null,
        description: editForm.description
      };
      const success = await window.electronAPI.db.updateSpecificTaskTimeEntry(entry.id, updates);
      if (success) {
        setIsEditing(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      try {
        const success = await window.electronAPI.db.deleteSpecificTaskTimeEntry(entry.id);
        if (success) {
          onRefresh();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const isRunning = entry.status === 'running';

  if (isEditing) {
    return (
      <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
          <span>Editing Entry #{index}</span>
          <div className="flex gap-2">
            <button onClick={handleEditSave} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div>
            <label className="block text-gray-500 mb-0.5">Start Time</label>
            <input
              type="datetime-local"
              step="1"
              value={editForm.started_at}
              onChange={e => setEditForm(prev => ({ ...prev, started_at: e.target.value }))}
              className="w-full border rounded px-2 py-1 text-xs"
            />
          </div>
          {!isRunning && (
            <div>
              <label className="block text-gray-500 mb-0.5">End Time</label>
              <input
                type="datetime-local"
                step="1"
                value={editForm.ended_at}
                onChange={e => setEditForm(prev => ({ ...prev, ended_at: e.target.value }))}
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
          )}
          <div>
            <label className="block text-gray-500 mb-0.5">Description</label>
            <input
              type="text"
              value={editForm.description}
              onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What did you work on?"
              className="w-full border rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      </li>
    );
  }

  const dur = entry.duration
    ? entry.duration
    : (entry.started_at && entry.ended_at
      ? calculateDuration(entry.started_at, entry.ended_at)
      : null);

  return (
    <li className={`group rounded-lg border px-3 py-2.5 relative transition-all duration-200
      ${isRunning ? 'border-blue-200 bg-blue-50/60' : 'border-gray-100 bg-gray-50'}`
    }>
      {/* Edit & Delete Action Buttons (Visible on hover) */}
      <div className="absolute top-2.5 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setEditForm({
              started_at: entry.started_at ? toLocalISOString(entry.started_at) : '',
              ended_at: entry.ended_at ? toLocalISOString(entry.ended_at) : '',
              description: entry.description || ''
            });
            setIsEditing(true);
          }}
          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Edit entry"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete entry"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-1 pr-12">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <Hash className="h-3 w-3" />{index + 1}
        </span>
        {isRunning ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-blue-500">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Running
          </span>
        ) : dur != null ? (
          <span className="text-[10px] font-mono font-semibold text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
            {formatDuration(dur)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1 text-[11px] text-gray-500">
        <span>{formatTime(entry.started_at)}</span>
        <span>—</span>
        <span>{entry.ended_at ? formatTime(entry.ended_at) : '…'}</span>
      </div>
      {entry.description && (
        <p className="text-[11px] text-gray-500 mt-1 italic truncate">{entry.description}</p>
      )}
    </li>
  );
}
