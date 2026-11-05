import { useEffect, useState } from 'react';
import { authFetch } from '../utils/authFetch';

function TaskCreateModal({ boardId, onClose, onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Create New Task</h2>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 dark:text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task description"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-300 mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-300 mb-2">Assignee</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Unassigned</option>
              {users.map(user => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">Label color</label>
              <select value={labelColor} onChange={e => setLabelColor(e.target.value)} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option><option value="red">Red</option><option value="orange">Orange</option><option value="yellow">Yellow</option><option value="green">Green</option><option value="blue">Blue</option><option value="purple">Purple</option><option value="pink">Pink</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">Cover color</label>
              <select value={coverColor} onChange={e => setCoverColor(e.target.value)} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option><option value="bg-red-400">Red</option><option value="bg-orange-400">Orange</option><option value="bg-yellow-400">Yellow</option><option value="bg-green-400">Green</option><option value="bg-blue-400">Blue</option><option value="bg-purple-400">Purple</option><option value="bg-pink-400">Pink</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskCreateModal;