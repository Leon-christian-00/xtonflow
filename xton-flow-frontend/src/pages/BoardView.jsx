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
  { id: 'TODO', title: 'To Do', color: 'border-gray-400 dark:border-gray-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-500' },
  { id: 'REVIEW', title: 'Review', color: 'border-yellow-500' },
  { id: 'DONE', title: 'Done', color: 'border-green-500' },
];

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

function DueBadge({ dueDate }) {
  if (!dueDate) return null;
  const overdue = isOverdue(dueDate);
  const date = new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
      overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    }`}>
      🗓 {date}
    </span>
  );
}

function ChecklistBadge({ total, checked }) {
  if (!total) return null;
  const done = total === checked;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
      done ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }`}>
      ✓ {checked}/{total}
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

  const filtered = useMemo(() => tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchPriority = !filterPriority || t.priority === filterPriority;
    return matchSearch && matchPriority;
  }), [tasks, search, filterPriority]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'DONE').length,
    progress: tasks.length ? Math.round((tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100) : 0,
  }), [tasks]);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
      <div className="text-gray-400">Loading tasks…</div>
    </div>
  );

  return (
    <div className="board-workspace h-full flex flex-col bg-gray-100 dark:bg-gray-900">

      {/* Top bar */}
      <div className="board-header px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="min-w-0 flex-1"><p className="text-xs text-purple-200/70">Team-managed space</p><h1 className="text-lg font-bold text-white truncate">{boardName}</h1></div>
          <Tooltip label="Invite people to this space"><button className="board-header-icon" aria-label="Share board" onClick={onShare}>♧</button></Tooltip>
          <Tooltip label="More space actions"><button className="board-header-icon" aria-label="Board actions" onClick={() => window.alert('More space actions are coming soon.')}>•••</button></Tooltip>
          <Tooltip label="Create a new work item"><button
            onClick={() => setShowCreateModal(true)}
            className="board-add-button"
          >
            <span className="text-base leading-none">+</span> Add Task
          </button></Tooltip>
        </div>

        {/* Stats bar */}
        <div className="board-tabs mb-3">
          <Tooltip label="View work by workflow status"><button className={view === 'board' ? 'active' : ''} type="button" onClick={() => setView('board')}>▦ Board</button></Tooltip><Tooltip label="View all work items in a list"><button className={view === 'list' ? 'active' : ''} type="button" onClick={() => setView('list')}>☷ List</button></Tooltip><Tooltip label="Timeline requires start and end dates"><button type="button" onClick={() => window.alert('Timeline view will be available when task start dates are supported.')}>◷ Timeline</button></Tooltip><Tooltip label="View work by due date"><button className={view === 'calendar' ? 'active' : ''} type="button" onClick={() => setView('calendar')}>▣ Calendar</button></Tooltip>
        </div>

        <div className="flex items-center gap-4 mb-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">{stats.total} tasks</span>
          <span className="text-xs text-green-600 dark:text-green-400">{stats.done} done</span>
          {stats.overdue > 0 && <span className="text-xs text-red-600 dark:text-red-400">⚠ {stats.overdue} overdue</span>}
          <div className="flex-1 min-w-[80px] max-w-[160px]">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${stats.progress}%` }} />
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{stats.progress}%</span>
        </div>

        {/* Search + filter */}
        <div className="board-toolbar flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search board"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-sm px-2 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        {view === 'list' && <div className="board-list-view"><div className="board-list-head"><span>Work item</span><span>Status</span><span>Priority</span><span>Due date</span></div>{filtered.map(task => <button key={task.id} type="button" className="board-list-row" onClick={() => setSelectedTask(task)}><strong>{task.title}</strong><span>{task.status.replace('_', ' ')}</span><span>{task.priority}</span><span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span></button>)}</div>}
        {view === 'calendar' && <div className="board-calendar-view"><h3>Due dates</h3>{filtered.filter(task => task.dueDate).map(task => <button key={task.id} type="button" className="calendar-item" onClick={() => setSelectedTask(task)}><span>{new Date(task.dueDate).toLocaleDateString()}</span><strong>{task.title}</strong></button>)}{filtered.every(task => !task.dueDate) && <p>No due dates have been added yet.</p>}</div>}
        {view !== 'board' ? null : (
        <div className="flex flex-col gap-4 md:flex-row md:gap-5 md:h-full">
          {COLUMNS.map(col => {
            const colTasks = filtered
              .filter(t => t.status === col.id)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={col.id} className="w-full md:flex-shrink-0 md:w-72">
                <div className={`board-column rounded-xl border-t-4 ${col.color} shadow-sm`}>
                  <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">{col.title}</h3>
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="p-3 space-y-2 min-h-[60px]">
                    {colTasks.map(task => {
                      const cl = checklistCounts[task.id];
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="board-card rounded-lg cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                        >
                          {/* Cover */}
                          {task.coverColor && <div className={`${task.coverColor} h-8`} />}

                                <div className="p-3">
                            {/* Label */}
                            {task.labelColor && LABEL_BG[task.labelColor] && (
                              <div className={`${LABEL_BG[task.labelColor]} h-1.5 rounded-full mb-2 w-12`} />
                            )}

                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 leading-snug">{task.title}</p>

                            {task.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                            )}

                            {/* Badges row */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                task.priority === 'URGENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              }`}>{task.priority}</span>
                              <DueBadge dueDate={task.dueDate} />
                              {cl?.total > 0 && <ChecklistBadge total={cl.total} checked={cl.checked} />}
                            </div>

                            {/* Checklist mini progress */}
                            {cl?.total > 0 && (
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${cl.checked === cl.total ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.round((cl.checked / cl.total) * 100)}%` }}
                                />
                              </div>
                            )}

                            {/* Status select */}
                            <div className="mt-2" onClick={e => e.stopPropagation()}>
                              <Tooltip label="Change work item status"><select
                                value={task.status}
                                onChange={e => handleStatusChange(task.id, e.target.value)}
                                className="w-full text-xs px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 focus:outline-none"
                              >
                                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                              </select></Tooltip>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
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
