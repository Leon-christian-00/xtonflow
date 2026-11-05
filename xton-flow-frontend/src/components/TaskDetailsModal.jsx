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
  { value: '', label: 'None' },
];

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

function formatDate(dt) {
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
    { id: 'checklist', label: `Checklist${checklist.length ? ` (${checkedCount}/${checklist.length})` : ''}` },
    { id: 'comments', label: `Comments${comments.length ? ` (${comments.length})` : ''}` },
    { id: 'attachments', label: `Files${attachments.length ? ` (${attachments.length})` : ''}` },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="task-detail-modal bg-white dark:bg-gray-800 rounded-xl w-full max-w-5xl my-4 shadow-2xl flex flex-col">

        {/* Cover */}
        {task.coverColor && (
          <div className={`${task.coverColor} h-24 rounded-t-xl`} />
        )}

        {/* Header */}
        <div className="p-5 pb-3">
          {/* Label */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {labelColor?.value && (
              <span className={`${labelColor.bg} text-white text-xs px-3 py-0.5 rounded-full font-medium`}>
                {labelColor.name}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              task.priority === 'URGENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
              task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
              task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
              'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
            }`}>{task.priority}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {task.status.replace('_', ' ')}
            </span>
            {task.dueDate && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                overdue
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              }`}>
                🗓 {formatDate(task.dueDate)}{overdue && ' · Overdue'}
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
                  className="w-full text-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 -mx-2"
                >
                  {task.title}
                </h2>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl leading-none shrink-0">×</button>
          </div>

          {/* Quick actions row */}
          <div className="flex flex-wrap gap-2 mt-3">
            {/* Due date */}
            <div className="relative">
              <input
                type="datetime-local"
                value={dueDateDraft}
                onChange={e => saveDueDate(e.target.value)}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                title="Set due date"
              />
            </div>

            {/* Label picker */}
            <div className="relative">
              <button
                onClick={() => { setShowLabelPicker(p => !p); setShowCoverPicker(false); }}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
              >
                🏷 Label
              </button>
              {showLabelPicker && (
                <div className="absolute top-8 left-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 flex flex-wrap gap-2 w-48">
                  {LABEL_COLORS.map(l => (
                    <button
                      key={l.value}
                      onClick={() => { patchTask({ labelColor: l.value }); setShowLabelPicker(false); }}
                      className={`${l.bg} w-8 h-8 rounded-full border-2 ${task.labelColor === l.value ? 'border-blue-500' : 'border-transparent'}`}
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
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
              >
                🎨 Cover
              </button>
              {showCoverPicker && (
                <div className="absolute top-8 left-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 flex flex-wrap gap-2 w-48">
                  {COVER_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { patchTask({ coverColor: c.value }); setShowCoverPicker(false); }}
                      className={`${c.value || 'bg-gray-200 dark:bg-gray-600'} w-8 h-8 rounded border-2 ${task.coverColor === c.value ? 'border-blue-500' : 'border-transparent'}`}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleDeleteTask}
              className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 ml-auto"
            >
              🗑 Delete
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Description</p>
          {editingDesc ? (
            <div>
              <textarea
                autoFocus
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
              <div className="flex gap-2 mt-1">
                <button onClick={saveDesc} className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                <button onClick={() => setEditingDesc(false)} className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded">Cancel</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingDesc(true)}
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-2 -mx-2 min-h-[36px]"
            >
              {task.description || <span className="text-gray-400 italic">Add a description…</span>}
            </div>
          )}
        </div>

        <div className="task-details-rail mx-5 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Details</h3><span className="text-xs text-gray-400">Edit fields</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">Status<select value={task.status} onChange={e => patchTask({ status: e.target.value })} className="detail-select"><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="REVIEW">Review</option><option value="DONE">Done</option></select></label>
            <label className="text-xs text-gray-500 dark:text-gray-400">Priority<select value={task.priority} onChange={e => patchTask({ priority: e.target.value })} className="detail-select"><option value="URGENT">Urgent</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label>
            <div className="text-xs text-gray-500 dark:text-gray-400">Assignee<div className="detail-value">{task.assignee?.fullName || task.assignee?.email || 'Unassigned'}</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-gray-200 dark:border-gray-700 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`text-sm px-3 py-2 border-b-2 transition ${
                activeTab === t.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 overflow-y-auto max-h-80">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading…</div>
          ) : activeTab === 'checklist' ? (
            <div>
              {checklist.length > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress</span><span>{checklistProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${checklistProgress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2 mb-3">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleCheckItem(item.id)}
                      className="h-4 w-4 rounded accent-blue-500 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {item.content}
                    </span>
                    <button
                      onClick={() => deleteCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition"
                    >✕</button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddCheckItem} className="flex gap-2">
                <input
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  placeholder="Add an item…"
                  className="flex-1 text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
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
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
                <div className="flex justify-end mt-1">
                  <button type="submit" disabled={submitting || !newComment.trim()}
                    className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </form>
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{c.authorName}</span>
                      <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {editingComment === c.id ? (
                      <div>
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                          className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" rows={2} />
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => setEditingComment(null)} className="text-xs text-green-600 hover:underline">Save</button>
                          <button onClick={() => setEditingComment(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
                    )}
                  </div>
                ))}
                {comments.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No comments yet</p>}
              </div>
            </div>
          ) : (
            <div>
              <label className="flex items-center justify-center w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 cursor-pointer transition text-sm mb-3">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploadingFile ? 'Uploading…' : 'Click to upload a file'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-blue-500 text-lg">📎</span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{att.fileName}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleDownload(att.fileUrl, att.fileName)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">↓</button>
                      <button onClick={() => handleDeleteAttachment(att.id)}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">✕</button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No files attached</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailsModal;
