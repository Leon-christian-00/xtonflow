import { useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch';

function TaskCreateModal({ boardId, onClose, onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labelColor, setLabelColor] = useState('');
  const [coverColor, setCoverColor] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    authFetch('/api/users?limit=50').then(response => response.ok ? response.json() : []).then(setUsers).catch(() => setUsers([]));
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
          startDate: startDate || null,
          dueDate: dueDate ? `${dueDate}T00:00:00` : null,
          labelColor,
          coverColor,
          assigneeId: assigneeId || null,
          boardId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();
      onTaskCreated(newTask);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const LABEL_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'red', label: 'Red', tint: 'bg-red-500' },
    { value: 'orange', label: 'Orange', tint: 'bg-orange-500' },
    { value: 'yellow', label: 'Yellow', tint: 'bg-yellow-400' },
    { value: 'green', label: 'Green', tint: 'bg-green-500' },
    { value: 'blue', label: 'Blue', tint: 'bg-blue-500' },
    { value: 'purple', label: 'Purple', tint: 'bg-purple-500' },
    { value: 'pink', label: 'Pink', tint: 'bg-pink-500' },
  ];

  const COVER_OPTIONS = [
    { value: '', label: 'None', tint: 'border border-[var(--border-strong)]' },
    { value: 'bg-red-400', label: 'Red', tint: 'bg-red-400' },
    { value: 'bg-orange-400', label: 'Orange', tint: 'bg-orange-400' },
    { value: 'bg-yellow-400', label: 'Yellow', tint: 'bg-yellow-400' },
    { value: 'bg-green-400', label: 'Green', tint: 'bg-green-400' },
    { value: 'bg-blue-400', label: 'Blue', tint: 'bg-blue-400' },
    { value: 'bg-purple-400', label: 'Purple', tint: 'bg-purple-400' },
    { value: 'bg-pink-400', label: 'Pink', tint: 'bg-pink-400' },
  ];

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-surface p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text)]">Create New Task</h2>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">Add a work item to this board</p>
          </div>
          <button type="button" onClick={onClose} className="modal-ghost-btn" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 dark:text-rose-300 p-3.5 rounded-xl mb-4 text-sm animate-fade-in">
            <i className="fa-solid fa-triangle-exclamation mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field-input"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field-input resize-none"
              placeholder="Enter task description"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={dueDate || undefined}
                className="field-input [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="field-label">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={startDate || undefined}
                className="field-input [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="field-input field-select"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="field-label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="field-input field-select"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Assignee</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="field-input field-select">
              <option value="">Unassigned</option>
              {users.map(user => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Label color</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {LABEL_OPTIONS.map(o => (
                  <button
                    key={o.value || 'none'}
                    type="button"
                    title={o.label}
                    aria-label={o.label}
                    onClick={() => setLabelColor(o.value)}
                    className={`swatch h-6 w-6 ${o.tint || ''} ${labelColor === o.value ? 'selected' : ''}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Cover color</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COVER_OPTIONS.map(o => (
                  <button
                    key={o.value || 'none'}
                    type="button"
                    title={o.label}
                    aria-label={o.label}
                    onClick={() => setCoverColor(o.value)}
                    className={`swatch h-6 w-6 ${o.tint || ''} ${coverColor === o.value ? 'selected' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Creating…</> : <><i className="fa-solid fa-plus" /> Create Task</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskCreateModal;
