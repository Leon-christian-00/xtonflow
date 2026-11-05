import { useState, useEffect, useMemo, useCallback } from 'react';
import TaskCreateModal from '../components/TaskCreateModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import WebSocketService from '../services/WebSocketService';
import { authFetch } from '../utils/authFetch';
import Tooltip from '../components/Tooltip';

const LABEL_BG = {
  red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-400',
  green: 'bg-green-500', blue: 'bg-blue-500', purple: 'bg-purple-500', pink: 'bg-pink-500',
};

const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'bg-slate-400 dark:bg-slate-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'REVIEW', title: 'Review', color: 'bg-yellow-500' },
  { id: 'DONE', title: 'Done', color: 'bg-green-500' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthGrid(month) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => (
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
  ));
}

function taskOccursOnDate(task, date) {
  const start = task.startDate?.slice(0, 10);
  const due = task.dueDate?.slice(0, 10);
  const first = start || due;
  const last = start && due ? (due >= start ? due : start) : (due || start);
  const key = dateKey(date);
  return Boolean(first && last && key >= first && key <= last);
}

function formatTaskDate(value) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

function DueBadge({ dueDate }) {
  if (!dueDate) return null;
  const overdue = isOverdue(dueDate);
  const date = new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <span className={`pill !text-[10.5px] ${
      overdue
        ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
        : 'bg-sky-500/12 text-sky-600 dark:text-sky-300'
    }`}>
      <i className={`fa-regular ${overdue ? 'fa-calendar-xmark' : 'fa-calendar'} !text-[9.5px]`} />{date}
    </span>
  );
}

function ChecklistBadge({ total, checked }) {
  if (!total) return null;
  const done = total === checked;
  return (
    <span className={`pill !text-[10.5px] ${
      done
        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
        : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
    }`}>
      <i className="fa-solid fa-list-check !text-[9.5px]" />{checked}/{total}
    </span>
  );
}

function BoardView({ boardId, boardName, onShare }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [checklistCounts, setChecklistCounts] = useState({});
  const [view, setView] = useState('board');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dragId, setDragId] = useState(null);
  // Where the dragged card would land: { colId, beforeTaskId | null }. beforeTaskId === null means "append at the end of the column".
  const [dropTarget, setDropTarget] = useState(null);

  const handleWsUpdate = useCallback((event) => {
    switch (event.eventType) {
      case 'CREATED':
        setTasks(p => p.some(task => task.id === event.task.id) ? p : [...p, event.task]);
        break;
      case 'UPDATED':
      case 'STATUS_CHANGED':
        setTasks(p => p.map(t => t.id === event.task.id ? event.task : t));
        break;
      case 'DELETED':
        setTasks(p => p.filter(t => t.id !== event.task.id));
        break;
      default:
        break;
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/tasks/board/${boardId}`);
      const data = await res.json();
      setTasks(data);
      // Fetch checklist counts for all tasks
      const counts = {};
      await Promise.all(data.map(async t => {
        const r = await authFetch(`/api/tasks/${t.id}/checklist`);
        if (r.ok) {
          const items = await r.json();
          counts[t.id] = { total: items.length, checked: items.filter(i => i.checked).length };
        }
      }));
      setChecklistCounts(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchTasks(), 0);
    WebSocketService.connect(boardId, handleWsUpdate);
    return () => {
      clearTimeout(timer);
      WebSocketService.disconnect(boardId);
    };
  }, [boardId, fetchTasks, handleWsUpdate]);

  const handleTaskDeleted = (id) => setTasks(p => p.filter(t => t.id !== id));
  const handleTaskUpdated = (updated) => {
    setTasks(p => p.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(updated);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const res = await authFetch(`/api/tasks/${taskId}/status?newStatus=${newStatus}`, { method: 'PUT' });
    if (res.ok) {
      const updated = await res.json();
      setTasks(p => p.map(t => t.id === taskId ? updated : t));
    }
  };

  // --- Drag & drop (native HTML5, no library) ---
  const handleDragStart = (task) => (e) => {
    setDragId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropTarget(null);
  };

  // Hovering a card: drop above its middle inserts before it, below its middle inserts
  // before the next visible card (or appends when it is the last one).
  const handleCardDragOver = (col, task, colTasks) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const above = e.clientY < rect.top + rect.height / 2;
    if (above) {
      setDropTarget({ colId: col.id, beforeTaskId: task.id });
    } else {
      const i = colTasks.findIndex(t => t.id === task.id);
      const next = i >= 0 && i < colTasks.length - 1 ? colTasks[i + 1].id : null;
      setDropTarget({ colId: col.id, beforeTaskId: next });
    }
  };

  // Hovering the column body (padding / empty area): append at the end.
  const handleColumnDragOver = (colId) => (e) => {
    e.preventDefault();
    if (!dragId) return;
    setDropTarget({ colId, beforeTaskId: null });
  };

  const handleDrop = (colId) => async () => {
    const dragged = tasks.find(t => t.id === dragId);
    const target = dropTarget || { colId, beforeTaskId: null };
    setDragId(null);
    setDropTarget(null);
    if (!dragged) return;

    const columnTasks = tasks.filter(t => t.status === colId && t.id !== dragged.id)
      .sort((a, b) => a.position - b.position);
    let index;
    if (!target.beforeTaskId) {
      index = columnTasks.length;
    } else {
      const bi = columnTasks.findIndex(t => t.id === target.beforeTaskId);
      index = bi === -1 ? columnTasks.length : bi;
    }
    const newOrder = [
      ...columnTasks.slice(0, index),
      { ...dragged, status: colId },
      ...columnTasks.slice(index),
    ];

    // Optimistic update: show the new arrangement immediately.
    setTasks(prev => prev.map(t => {
      const ni = newOrder.findIndex(n => n.id === t.id);
      return ni !== -1 ? { ...t, status: colId, position: ni } : t;
    }));

    // Persist: status change first (when the column differs), then positions in that column.
    try {
      if (dragged.status !== colId) {
        const res = await authFetch(`/api/tasks/${dragged.id}/status?newStatus=${colId}`, { method: 'PUT' });
        if (!res.ok) throw new Error('Status update failed');
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...updated, position: index } : t));
      }
      const reorderRes = await authFetch('/api/tasks/reorder', {
        method: 'PUT',
        body: JSON.stringify(newOrder.map((t, i) => ({ id: t.id, position: i }))),
      });
      if (!reorderRes.ok) throw new Error('Reorder failed');
    } catch (err) {
      console.error(err);
      fetchTasks(); // revert to the last server state on failure
    }
  };

  const filtered = useMemo(() => tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchPriority = !filterPriority || t.priority === filterPriority;
    return matchSearch && matchPriority;
  }), [tasks, search, filterPriority]);
  const calendarDays = useMemo(() => getMonthGrid(calendarMonth), [calendarMonth]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'DONE').length,
    progress: tasks.length ? Math.round((tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100) : 0,
  }), [tasks]);

  if (loading) return (
    <div className="flex items-center justify-center h-full board-workspace-bg">
      <div className="flex flex-col items-center gap-3 board-loading-state">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[var(--accent-text)]" />
        <span className="text-sm">Loading tasks…</span>
      </div>
    </div>
  );

  return (
    <div className="board-workspace-bg h-full flex flex-col">

      {/* Top bar */}
      <div className="board-header px-4 md:px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <p className="board-header-kicker">Team-managed space</p>
            <h1 className="font-display text-xl font-bold text-white truncate mt-0.5">{boardName}</h1>
          </div>
          <Tooltip label="Invite people to this space"><button className="board-header-icon" aria-label="Share board" onClick={onShare}><i className="fa-solid fa-user-plus" /></button></Tooltip>
          <Tooltip label="More space actions"><button className="board-header-icon" aria-label="Board actions" onClick={() => window.alert('More space actions are coming soon.')}><i className="fa-solid fa-ellipsis" /></button></Tooltip>
          <Tooltip label="Create a new work item"><button
            onClick={() => setShowCreateModal(true)}
            className="board-add-button"
          >
            <i className="fa-solid fa-plus text-xs" /> Add Task
          </button></Tooltip>
        </div>

        {/* View tabs */}
        <div className="board-tabs mb-3">
          <Tooltip label="View work by workflow status"><button className={view === 'board' ? 'active' : ''} type="button" onClick={() => setView('board')}><i className="fa-solid fa-table-cells-large" /> Board</button></Tooltip>
          <Tooltip label="View all work items in a list"><button className={view === 'list' ? 'active' : ''} type="button" onClick={() => setView('list')}><i className="fa-solid fa-list" /> List</button></Tooltip>
          <Tooltip label="Timeline view is coming soon"><button type="button" onClick={() => window.alert('Timeline view is coming soon. Use Calendar to plan tasks by date.')}><i className="fa-solid fa-timeline" /> Timeline</button></Tooltip>
          <Tooltip label="View tasks on their scheduled dates"><button className={view === 'calendar' ? 'active' : ''} type="button" onClick={() => setView('calendar')}><i className="fa-regular fa-calendar" /> Calendar</button></Tooltip>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <span className="board-stat-chip"><i className="fa-solid fa-list-check !text-[10px]" /> {stats.total} tasks</span>
          <span className="board-stat-chip !text-emerald-300"><i className="fa-solid fa-circle-check !text-[10px]" /> {stats.done} done</span>
          {stats.overdue > 0 && <span className="board-stat-chip !text-rose-300"><i className="fa-solid fa-triangle-exclamation !text-[10px]" /> {stats.overdue} overdue</span>}
          <div className="flex-1 min-w-[90px] max-w-[180px]">
            <div className="board-progress-track">
              <div className="board-progress-bar" style={{ width: `${stats.progress}%` }} />
            </div>
          </div>
          <span className="board-stat-chip !text-brand-200">{stats.progress}%</span>
        </div>

        {/* Search + filter */}
        <div className="board-toolbar flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(216,200,244,.5)] text-xs"><i className="fa-solid fa-magnifying-glass" /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search board"
              className="board-search-input"
            />
          </div>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="board-select"
          >
            <option value="">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-y-auto md:overflow-x-auto p-4 md:p-6">
        {view === 'list' && (
          <div className="board-list-view">
            <div className="board-list-head grid grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr] gap-4 items-center px-4 pb-2 text-[11px] font-bold uppercase tracking-wider">
              <span>Work item</span><span>Status</span><span>Priority</span><span>Dates</span>
            </div>
            {filtered.map(task => (
              <button key={task.id} type="button" className="board-list-row grid grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr] gap-4 items-center p-4 mb-2 animate-fade-in" onClick={() => setSelectedTask(task)}>
                <strong className="font-semibold text-[13px] text-[var(--text)]">{task.title}</strong>
                <span className="text-[13px]">{task.status.replace('_', ' ')}</span>
                <span className="text-[13px]">{task.priority}</span>
                <span className="text-[13px]">{task.startDate || task.dueDate
                  ? `${task.startDate ? formatTaskDate(task.startDate) : '—'} → ${task.dueDate ? formatTaskDate(task.dueDate) : '—'}`
                  : 'Unscheduled'}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="board-empty-state text-center py-14 text-sm"><i className="fa-regular fa-folder-open text-3xl mb-3 block" />No matching work items</div>
            )}
          </div>
        )}
        {view === 'calendar' && (
          <div className="board-calendar-view">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display text-lg font-bold">
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Previous month"
                  onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                ><i className="fa-solid fa-chevron-left" /></button>
                <button
                  type="button"
                  className="calendar-today-button"
                  onClick={() => {
                    const today = new Date();
                    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  }}
                >Today</button>
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Next month"
                  onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                ><i className="fa-solid fa-chevron-right" /></button>
              </div>
            </div>
            <div className="calendar-scroll">
              <div className="calendar-grid">
                {WEEKDAYS.map(day => <div key={day} className="calendar-weekday">{day}</div>)}
                {calendarDays.map(day => {
                  const key = dateKey(day);
                  const dayTasks = filtered.filter(task => taskOccursOnDate(task, day));
                  const isToday = key === dateKey(new Date());
                  return (
                    <section
                      key={key}
                      className={`calendar-day ${day.getMonth() !== calendarMonth.getMonth() ? 'outside-month' : ''} ${isToday ? 'is-today' : ''}`}
                      aria-label={`${day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}, ${dayTasks.length} tasks`}
                    >
                      <span className="calendar-day-number">{day.getDate()}</span>
                      <div className="calendar-day-tasks">
                        {dayTasks.map(task => (
                          <button
                            key={task.id}
                            type="button"
                            className={`calendar-task status-${task.status.toLowerCase().replace('_', '-')}`}
                            onClick={() => setSelectedTask(task)}
                            title={`${task.title} · ${task.status.replace('_', ' ')}`}
                          >
                            <span className="calendar-task-dot" />
                            <span className="calendar-task-title">{task.title}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
            {filtered.some(task => !task.startDate && !task.dueDate) && (
              <div className="calendar-unscheduled">
                <h4 className="font-semibold text-sm mb-2">Unscheduled</h4>
                <div className="flex flex-wrap gap-2">
                  {filtered.filter(task => !task.startDate && !task.dueDate).map(task => (
                    <button key={task.id} type="button" className="calendar-unscheduled-task" onClick={() => setSelectedTask(task)}>
                      <i className="fa-solid fa-circle-dot" /> {task.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {view !== 'board' ? null : (
        <div className="flex flex-col gap-4 md:flex-row md:gap-5 md:h-full">
          {COLUMNS.map(col => {
            const colTasks = filtered
              .filter(t => t.status === col.id)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={col.id} className="w-full md:flex-shrink-0 md:w-72 animate-slide-up">
                <div className={`board-column ${dragId && dropTarget?.colId === col.id ? 'drag-over' : ''}`}>
                  <div className={`block h-1 w-full ${col.color}`} />
                  <div className="flex justify-between items-center px-4 py-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${col.color}`} />{col.title}
                    </h3>
                    <span className="col-count text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                      {colTasks.length}
                    </span>
                  </div>

                  <div
                    className="p-3 pt-0 space-y-2.5 min-h-[60px]"
                    onDragOver={handleColumnDragOver(col.id)}
                    onDrop={handleDrop(col.id)}
                  >
                    {dragId && dropTarget?.colId === col.id && dropTarget.beforeTaskId === null && <div className="drop-indicator" />}
                    {colTasks.map(task => {
                      const cl = checklistCounts[task.id];
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={handleDragStart(task)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleCardDragOver(col, task, colTasks)}
                          onClick={() => setSelectedTask(task)}
                          className={`board-card overflow-hidden ${dragId === task.id ? 'dragging' : ''}`}
                        >
                          {/* Drop indicator */}
                          {dragId && dropTarget?.colId === col.id && dropTarget.beforeTaskId === task.id && <div className="drop-indicator" />}
                          {/* Cover */}
                          {task.coverColor && <div className={`${task.coverColor} h-6`} />}

                          <div className="p-3">
                            {/* Label */}
                            {task.labelColor && LABEL_BG[task.labelColor] && (
                              <div className={`${LABEL_BG[task.labelColor]} h-1.5 rounded-full mb-2.5 w-12`} />
                            )}

                            <p className="text-[13px] font-medium text-[var(--text)] mb-2 leading-snug">{task.title}</p>

                            {task.description && (
                              <p className="text-xs text-[var(--text-muted)] mb-2.5 line-clamp-2 leading-relaxed">{task.description}</p>
                            )}

                            {/* Badges row */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className={`pill !text-[10.5px] ${
                                task.priority === 'URGENT' ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300' :
                                task.priority === 'HIGH' ? 'bg-orange-500/12 text-orange-600 dark:text-orange-300' :
                                task.priority === 'MEDIUM' ? 'bg-yellow-500/12 text-yellow-600 dark:text-yellow-300' :
                                'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
                              }`}>{task.priority}</span>
                              <DueBadge dueDate={task.dueDate} />
                              {cl?.total > 0 && <ChecklistBadge total={cl.total} checked={cl.checked} />}
                            </div>

                            {/* Checklist mini progress */}
                            {cl?.total > 0 && (
                              <div className="w-full bg-[var(--surface-3)] rounded-full h-1 mb-2.5">
                                <div
                                  className={`h-1 rounded-full transition-all ${cl.checked === cl.total ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.round((cl.checked / cl.total) * 100)}%` }}
                                />
                              </div>
                            )}

                            {/* Status select */}
                            <div onClick={e => e.stopPropagation()}>
                              <Tooltip label="Change work item status"><select
                                value={task.status}
                                onChange={e => handleStatusChange(task.id, e.target.value)}
                                className="card-meta-select"
                              >
                                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                              </select></Tooltip>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="board-empty-state text-center py-6 text-xs">
                        <i className="fa-regular fa-square mb-1.5 block opacity-40" />
                        {search || filterPriority ? 'No matching tasks' : 'No tasks'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {showCreateModal && (
        <TaskCreateModal boardId={boardId} onClose={() => setShowCreateModal(false)} onTaskCreated={(newTask) => { setTasks(prev => prev.some(task => task.id === newTask.id) ? prev : [...prev, newTask]); setChecklistCounts(prev => ({ ...prev, [newTask.id]: { total: 0, checked: 0 } })); }} />
      )}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskDeleted={handleTaskDeleted}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
}

export default BoardView;
