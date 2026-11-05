import { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';

const LABEL_COLORS = [
  { name: 'Red', value: 'red', bg: 'bg-red-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500' },
  { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-400' },
  { name: 'Green', value: 'green', bg: 'bg-green-500' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500' },
  { name: 'None', value: '', bg: 'bg-gray-300 dark:bg-gray-600' },
];

const COVER_COLORS = [
  { value: 'bg-red-400', label: 'Red' },
  { value: 'bg-orange-400', label: 'Orange' },
  { value: 'bg-yellow-400', label: 'Yellow' },
  { value: 'bg-green-400', label: 'Green' },
  { value: 'bg-blue-400', label: 'Blue' },
  { value: 'bg-purple-400', label: 'Purple' },
  { value: 'bg-pink-400', label: 'Pink' },
  { value: 'bg-gray-400', label: 'Gray' },
  { value: '', label: 'None', swatch: 'border border-[var(--border-strong)]' },
];

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

function formatPillDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function TaskDetailsModal({ task: initialTask, onClose, onTaskDeleted, onTaskUpdated }) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [activeTab, setActiveTab] = useState('checklist');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description || '');
  const [startDateDraft, setStartDateDraft] = useState(task.startDate || '');
  const [dueDateDraft, setDueDateDraft] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch(`/api/comments/task/${task.id}`).then(r => r.ok ? r.json() : []),
      authFetch(`/api/attachments/task/${task.id}`).then(r => r.ok ? r.json() : []),
      authFetch(`/api/tasks/${task.id}/checklist`).then(r => r.ok ? r.json() : []),
    ]).then(([c, a, ch]) => {
      setComments(c);
      setAttachments(a);
      setChecklist(ch);
    }).finally(() => setLoading(false));
  }, [task.id]);

  const patchTask = async (fields) => {
    const res = await authFetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, boardId: task.board?.id }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask(updated);
      onTaskUpdated?.(updated);
    }
  };

  const saveTitle = () => { setEditingTitle(false); if (titleDraft.trim() && titleDraft !== task.title) patchTask({ title: titleDraft }); };
  const saveDesc = () => { setEditingDesc(false); patchTask({ description: descDraft }); };
  const saveStartDate = (val) => { setStartDateDraft(val); patchTask({ startDate: val || null }); };
  const saveDueDate = (val) => { setDueDateDraft(val); patchTask({ dueDate: val || null }); };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, taskId: task.id }),
      });
      if (res.ok) { const c = await res.json(); setComments(prev => [...prev, c]); setNewComment(''); }
    } finally { setSubmitting(false); }
  };

  const handleAddCheckItem = async (e) => {
    e.preventDefault();
    if (!newCheckItem.trim()) return;
    const res = await authFetch(`/api/tasks/${task.id}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newCheckItem }),
    });
    if (res.ok) { const item = await res.json(); setChecklist(prev => [...prev, item]); setNewCheckItem(''); }
  };

  const toggleCheckItem = async (itemId) => {
    const res = await authFetch(`/api/tasks/${task.id}/checklist/${itemId}/toggle`, { method: 'PUT' });
    if (res.ok) {
      const updated = await res.json();
      setChecklist(prev => prev.map(i => i.id === itemId ? updated : i));
    }
  };

  const deleteCheckItem = async (itemId) => {
    await authFetch(`/api/tasks/${task.id}/checklist/${itemId}`, { method: 'DELETE' });
    setChecklist(prev => prev.filter(i => i.id !== itemId));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', task.id);
    try {
      const res = await authFetch('/api/attachments/upload', { method: 'POST', body: formData });
      if (res.ok) { const att = await res.json(); setAttachments(prev => [...prev, att]); }
    } finally { setUploadingFile(false); e.target.value = ''; }
  };

  const handleDeleteAttachment = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    await authFetch(`/api/attachments/${id}`, { method: 'DELETE' });
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDownload = async (fileUrl, fileName) => {
    const res = await authFetch(`/api/attachments/download/${fileUrl}`);
    if (!res.ok) return alert('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName || fileUrl;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Delete this task?')) return;
    await authFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    onTaskDeleted(task.id);
    onClose();
  };

  const formatFileSize = (b) => {
    if (!b) return '';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const checkedCount = checklist.filter(i => i.checked).length;
  const checklistProgress = checklist.length ? Math.round((checkedCount / checklist.length) * 100) : 0;
  const overdue = isOverdue(task.dueDate);
  const labelColor = LABEL_COLORS.find(l => l.value === task.labelColor);

  const tabs = [
    { id: 'checklist', label: `Checklist${checklist.length ? ` (${checkedCount}/${checklist.length})` : ''}`, icon: 'fa-solid fa-list-check' },
    { id: 'comments', label: `Comments${comments.length ? ` (${comments.length})` : ''}`, icon: 'fa-regular fa-comment' },
    { id: 'attachments', label: `Files${attachments.length ? ` (${attachments.length})` : ''}`, icon: 'fa-solid fa-paperclip' },
  ];

  return (
    <div className="overlay !items-start overflow-y-auto">
      <div className="task-detail-modal modal-surface w-full max-w-5xl my-4 flex flex-col animate-scale-in">

        {/* Cover */}
        {task.coverColor && (
          <div className={`${task.coverColor} h-20 rounded-t-[18px]`} />
        )}

        {/* Header */}
        <div className="p-5 pb-3">
          {/* Label */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {labelColor?.value && (
              <span className={`${labelColor.bg} text-white pill !py-1 !px-3`}>
                {labelColor.name}
              </span>
            )}
            <span className={`pill !py-1 ${
              task.priority === 'URGENT' ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300' :
              task.priority === 'HIGH' ? 'bg-orange-500/12 text-orange-600 dark:text-orange-300' :
              task.priority === 'MEDIUM' ? 'bg-yellow-500/12 text-yellow-600 dark:text-yellow-300' :
              'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
            }`}>{task.priority}</span>
            <span className="pill !py-1 bg-[var(--surface-3)] text-[var(--text-muted)]">
              <i className="fa-solid fa-circle-dot !text-[9px]" />
              {task.status.replace('_', ' ')}
            </span>
            {task.startDate && (
              <span className="pill !py-1 bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <i className="fa-solid fa-play !text-[9px]" />
                Starts {formatPillDate(task.startDate)}
              </span>
            )}
            {task.dueDate && (
              <span className={`pill !py-1 ${
                overdue
                  ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
                  : 'bg-sky-500/12 text-sky-600 dark:text-sky-300'
              }`}>
                <i className="fa-regular fa-calendar !text-[9.5px]" />
                {formatPillDate(task.dueDate)}{overdue && ' · Overdue'}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => e.key === 'Enter' && saveTitle()}
                  className="field-input !py-1.5 font-display text-xl font-bold w-full"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="font-display text-xl font-bold text-[var(--text)] cursor-pointer hover:bg-[var(--surface-2)] rounded-lg px-2 py-1 -mx-2 transition-colors"
                  title="Click to edit title"
                >
                  {task.title}
                </h2>
              )}
            </div>
            <button onClick={onClose} className="modal-ghost-btn shrink-0" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
          </div>

          {/* Quick actions row */}
          <div className="flex flex-wrap gap-2 mt-3">
            {/* Start date */}
            <div className="relative">
              <input
                type="date"
                value={startDateDraft}
                onChange={e => saveStartDate(e.target.value)}
                className="card-meta-select !w-auto !text-xs cursor-pointer"
                title="Set start date"
              />
            </div>
            {/* Due date */}
            <div className="relative">
              <input
                type="datetime-local"
                value={dueDateDraft}
                onChange={e => saveDueDate(e.target.value)}
                className="card-meta-select !w-auto !text-xs cursor-pointer"
                min={startDateDraft ? `${startDateDraft}T00:00` : undefined}
                title="Set due date"
              />
            </div>

            {/* Label picker */}
            <div className="relative">
              <button
                onClick={() => { setShowLabelPicker(p => !p); setShowCoverPicker(false); }}
                className="card-meta-select !w-auto !text-xs"
              >
                <i className="fa-solid fa-tag !text-[10px] mr-1" /> Label
              </button>
              {showLabelPicker && (
                <div className="absolute top-9 left-0 z-10 modal-surface !rounded-xl p-3 flex flex-wrap gap-2 w-48 animate-scale-in">
                  {LABEL_COLORS.map(l => (
                    <button
                      key={l.value || 'none'}
                      onClick={() => { patchTask({ labelColor: l.value }); setShowLabelPicker(false); }}
                      className={`${l.bg} w-7 h-7 rounded-full border-2 transition hover:scale-110 ${task.labelColor === l.value ? 'border-[var(--accent)]' : 'border-transparent'}`}
                      title={l.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Cover picker */}
            <div className="relative">
              <button
                onClick={() => { setShowCoverPicker(p => !p); setShowLabelPicker(false); }}
                className="card-meta-select !w-auto !text-xs"
              >
                <i className="fa-solid fa-palette !text-[10px] mr-1" /> Cover
              </button>
              {showCoverPicker && (
                <div className="absolute top-9 left-0 z-10 modal-surface !rounded-xl p-3 flex flex-wrap gap-2 w-48 animate-scale-in">
                  {COVER_COLORS.map(c => (
                    <button
                      key={c.value || 'none'}
                      onClick={() => { patchTask({ coverColor: c.value }); setShowCoverPicker(false); }}
                      className={`${c.value || c.swatch} w-7 h-7 rounded border-2 transition hover:scale-110 ${task.coverColor === c.value ? 'border-[var(--accent)]' : 'border-transparent'}`}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleDeleteTask}
              className="card-meta-select !w-auto !text-xs !text-[var(--danger)] ml-auto hover:!border-[var(--danger)]"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <i className="fa-regular fa-trash-can !text-[10px] mr-1" /> Delete
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-5 pb-3">
          <p className="section-label !mb-1.5">Description</p>
          {editingDesc ? (
            <div>
              <textarea
                autoFocus
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                rows={3}
                className="field-input resize-none text-sm"
              />
              <div className="flex gap-2 mt-1.5">
                <button onClick={saveDesc} className="btn btn-primary !py-1.5 !px-3 !text-xs"><i className="fa-solid fa-check !text-[10px]" /> Save</button>
                <button onClick={() => setEditingDesc(false)} className="btn btn-ghost !py-1.5 !px-3 !text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingDesc(true)}
              className="text-sm text-[var(--text)] cursor-pointer hover:bg-[var(--surface-2)] rounded-lg px-2 py-2 -mx-2 min-h-[36px] transition-colors"
            >
              {task.description || <span className="text-[var(--text-faint)] italic flex items-center gap-1.5 select-none"><i className="fa-regular fa-pen-to-square text-xs" /> Add a description…</span>}
            </div>
          )}
        </div>

        <div className="task-details-rail mx-5 mb-4 rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">Details</h3>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-faint)]">Edit fields</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-[var(--text-muted)] font-medium">Status<select value={task.status} onChange={e => patchTask({ status: e.target.value })} className="detail-select field-select appearance-none pr-8"><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="REVIEW">Review</option><option value="DONE">Done</option></select></label>
            <label className="text-xs text-[var(--text-muted)] font-medium">Priority<select value={task.priority} onChange={e => patchTask({ priority: e.target.value })} className="detail-select field-select appearance-none pr-8"><option value="URGENT">Urgent</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label>
            <div className="text-xs text-[var(--text-muted)] font-medium">Assignee<div className="detail-value"><i className="fa-regular fa-user !text-[11px] text-[var(--text-faint)] mr-1.5" />{task.assignee?.fullName || task.assignee?.email || 'Unassigned'}</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-[var(--border)] flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`detail-tab ${activeTab === t.id ? 'active' : ''}`}
            >
              <i className={t.icon} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 overflow-y-auto max-h-80">
          {loading ? (
            <div className="text-center py-8 text-[var(--text-muted)] flex flex-col items-center gap-3">
              <i className="fa-solid fa-circle-notch fa-spin text-xl text-[var(--accent-text)]" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : activeTab === 'checklist' ? (
            <div>
              {checklist.length > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5 font-medium">
                    <span>Progress</span><span className="tabular-nums">{checklistProgress}%</span>
                  </div>
                  <div className="w-full bg-[var(--surface-3)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${checklistProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1 mb-3">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-3 group rounded-lg px-1.5 py-1 hover:bg-[var(--surface-2)] transition-colors">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleCheckItem(item.id)}
                      className="h-4 w-4 rounded accent-brand-500 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm ${item.checked ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text)]'}`}>
                      {item.content}
                    </span>
                    <button
                      onClick={() => deleteCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 modal-ghost-btn !w-6 !h-6 text-[var(--text-faint)] hover:!text-[var(--danger)] transition"
                      aria-label="Delete item"
                    >
                      <i className="fa-solid fa-xmark !text-[10px]" />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddCheckItem} className="flex gap-2">
                <input
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  placeholder="Add an item…"
                  className="field-input !py-2 text-sm flex-1"
                />
                <button type="submit" className="btn btn-primary !py-2 !px-4 !text-xs"><i className="fa-solid fa-plus !text-[10px]" /> Add</button>
              </form>
            </div>
          ) : activeTab === 'comments' ? (
            <div>
              <form onSubmit={handleAddComment} className="mb-4">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment…"
                  rows={2}
                  className="field-input resize-none text-sm"
                />
                <div className="flex justify-end mt-1.5">
                  <button type="submit" disabled={submitting || !newComment.trim()}
                    className="btn btn-primary !py-1.5 !px-4 !text-xs">
                    {submitting ? <><i className="fa-solid fa-circle-notch fa-spin !text-[10px]" /> Posting…</> : <><i className="fa-regular fa-paper-plane !text-[10px]" /> Post</>}
                  </button>
                </div>
              </form>
              <div className="space-y-2.5">
                {comments.map(c => (
                  <div key={c.id} className="bg-[var(--surface-2)] rounded-xl p-3.5 border border-[var(--border)]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                        <div className="avatar-bubble h-6 w-6 text-[11px] !border-0 !shadow-none"><span>{c.authorName ? c.authorName.charAt(0).toUpperCase() : 'U'}</span></div>
                        {c.authorName}
                      </span>
                      <span className="text-[11px] text-[var(--text-faint)]">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {editingComment === c.id ? (
                      <div>
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                          className="field-input !bg-[var(--surface)] text-sm resize-none" rows={2} />
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => setEditingComment(null)} className="btn btn-primary !py-1 !px-3 !text-[11px]">Save</button>
                          <button onClick={() => setEditingComment(null)} className="btn btn-ghost !py-1 !px-3 !text-[11px]">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed pl-8">{c.content}</p>
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center text-[var(--text-faint)] text-sm py-4"><i className="fa-regular fa-comment-dots text-2xl mb-2 block opacity-50" />No comments yet</div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="flex items-center justify-center w-full px-4 py-4 bg-[var(--surface-2)] text-[var(--text-muted)] rounded-xl border-2 border-dashed border-[var(--border-strong)] hover:border-brand-400 hover:text-[var(--accent-text)] cursor-pointer transition text-sm mb-3">
                <i className="fa-solid fa-cloud-arrow-up mr-2.5" />
                {uploadingFile ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" /> Uploading…</> : 'Click to upload a file'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="bg-[var(--surface-2)] rounded-xl p-3 flex justify-between items-center border border-[var(--border)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)] shrink-0">
                        <i className="fa-solid fa-file" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text)] truncate font-medium">{att.fileName}</p>
                        <p className="text-[11px] text-[var(--text-faint)]">{formatFileSize(att.fileSize)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleDownload(att.fileUrl, att.fileName)}
                        className="btn btn-primary !py-1.5 !px-2.5 !text-xs" title="Download" aria-label="Download">
                        <i className="fa-solid fa-download !text-[10px]" />
                      </button>
                      <button onClick={() => handleDeleteAttachment(att.id)}
                        className="btn btn-ghost !py-1.5 !px-2.5 !text-xs !text-[var(--danger)]" title="Delete" aria-label="Delete">
                        <i className="fa-solid fa-xmark !text-[10px]" />
                      </button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="text-center text-[var(--text-faint)] text-sm py-4"><i className="fa-regular fa-folder-open text-2xl mb-2 block opacity-50" />No files attached</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailsModal;
