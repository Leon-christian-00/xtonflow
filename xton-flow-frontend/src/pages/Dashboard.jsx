import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BoardView from './BoardView';
import WebSocketService from '../services/WebSocketService';
import { authFetch, clearAuthState } from '../utils/authFetch';
import { getStoredUser, persistStoredUser } from '../utils/authStorage';
import { useTheme } from '../utils/ThemeContext';

function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [newBoardVisibility, setNewBoardVisibility] = useState('TEAM');
  const [createBoardStep, setCreateBoardStep] = useState(1);
  const [boardTemplate, setBoardTemplate] = useState('blank');
  const [boardManagement, setBoardManagement] = useState('team');
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteAfterCreateRole, setInviteAfterCreateRole] = useState('MEMBER');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openSpaceMenuId, setOpenSpaceMenuId] = useState(null);
  const [spaceMenuPosition, setSpaceMenuPosition] = useState({ top: 0, left: 0 });
  const [activeNav, setActiveNav] = useState('for-you');
  const [starredBoards, setStarredBoards] = useState(() => JSON.parse(localStorage.getItem('xtonflow-starred-boards') || '[]'));
  const [shareBoardId, setShareBoardId] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('MEMBER');
  const [shareStatus, setShareStatus] = useState('');
  const [sharingBoard, setSharingBoard] = useState(false);
  const [orgUsers, setOrgUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', birthday: '', gender: 'OTHER' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [orgMembers, setOrgMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteStatus, setInviteStatus] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const { theme, toggle: toggleTheme } = useTheme();

  const [storedUser, setStoredUser] = useState(getStoredUser);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchBoards = useCallback(async () => {
    try {
      const activeOrg = storedUser?.activeOrgId;
      if (!activeOrg) return;
      const response = await authFetch('/api/boards/me');
      if (!response.ok) throw new Error('Failed to fetch boards');
      const data = await response.json();
      const filteredBoards = activeOrg ? data.filter(board => board.organisation?.id === activeOrg || board.organisationId === activeOrg) : data;
      setBoards(filteredBoards);
      setSelectedBoard(cur => cur ?? filteredBoards[0] ?? null);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    }
  }, [storedUser]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await authFetch('/api/notifications');
      if (response.ok) setNotifications(await response.json());
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await authFetch('/api/notifications/count/unread');
      if (response.ok) setUnreadCount(await response.json());
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    if (!storedUser) return;
    try {
      const response = await authFetch('/api/users/me');
      if (!response.ok) {
        console.error('Failed to fetch current user profile');
        return;
      }
      const data = await response.json();
      setCurrentUser(data);
      setProfileForm(prev => ({ ...prev, fullName: data.fullName || '', birthday: data.birthday || '', gender: data.gender || 'OTHER' }));
    } catch (error) {
      console.error('Failed to fetch current user profile:', error);
    }
  }, [storedUser]);

  const markAsRead = async (notificationId) => {
    try {
      await authFetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: 'READ' } : n));
      setUnreadCount(prev => prev > 0 ? prev - 1 : 0);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authFetch('/api/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationAction = async (notificationId, action) => {
    try {
      const response = await authFetch(`/api/notifications/${notificationId}/${action}`, { method: 'PUT' });
      if (!response.ok) {
        throw new Error(`Failed to ${action} notification`);
      }
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: 'READ' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (action === 'accept') {
        await fetchBoards();
      }
    } catch (error) {
      console.error(`Failed to ${action} notification:`, error);
    }
  };

  const handleNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!storedUser) { navigate('/login'); return; }

    let mounted = true;
    const loadDashboardData = async () => {
      await fetchBoards();
      await fetchCurrentUser();
      await fetchNotifications();
      await fetchUnreadCount();
      if (!mounted) return;
    };

    void loadDashboardData();
    WebSocketService.connectNotifications(handleNotification);
    return () => {
      mounted = false;
      WebSocketService.disconnectNotifications();
    };
  }, [navigate, storedUser, fetchBoards, fetchCurrentUser, fetchNotifications, fetchUnreadCount, handleNotification]);

  const [showAllUsers, setShowAllUsers] = useState(false);

  const loadUsers = useCallback(async (query = '', limit = 20) => {
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      params.set('limit', String(limit));
      const resp = await authFetch(`/api/users?${params.toString()}`);
      if (!resp.ok) return;
      const data = await resp.json();
      setOrgUsers(data);
    } catch (e) {
      console.error('Failed to load org users', e);
    }
  }, []);

  useEffect(() => {
    if (!showShareModal) return;

    let active = true;
    const loadShareUsers = async () => {
      await loadUsers();
      if (!active) return;
    };

    void loadShareUsers();
    return () => { active = false; };
  }, [showShareModal, loadUsers]);

  const filteredUsers = useMemo(() => {
    if (!shareEmail) return [];
    const q = shareEmail.toLowerCase();
    return orgUsers.filter(u => (u.email || '').toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q)).slice(0, 8);
  }, [shareEmail, orgUsers]);

  const handleSearchUsers = async (value) => {
    setShareEmail(value);
    if (!value) return;
    await loadUsers(value, 20);
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    try {
      const response = await authFetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName, description: newBoardDescription, visibility: newBoardVisibility })
      });
      if (!response.ok) throw new Error('Failed to create board');
      const newBoard = await response.json();
      setBoards([...boards, newBoard]);
      setSelectedBoard(newBoard);
      setShowNotificationsPanel(false);

      const emails = inviteEmails.split(/[\s,;]+/).map(email => email.trim()).filter(Boolean);
      for (const email of emails) {
        const userResponse = await authFetch(`/api/users/by-email?email=${encodeURIComponent(email)}`);
        if (!userResponse.ok) continue;
        const invitedUser = await userResponse.json();
        await authFetch(`/api/boards/${newBoard.id}/members/request?userId=${invitedUser.id}&role=${inviteAfterCreateRole}`, { method: 'POST' });
      }

      setNewBoardName('');
      setNewBoardDescription('');
      setNewBoardVisibility('TEAM');
      setCreateBoardStep(1);
      setBoardTemplate('blank');
      setBoardManagement('team');
      setInviteEmails('');
      setInviteAfterCreateRole('MEMBER');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const handleShareBoard = async (e) => {
    e.preventDefault();
    if (!shareBoardId) return;
    setSharingBoard(true);
    setShareStatus('');
    try {
      const userResponse = await authFetch(`/api/users/by-email?email=${encodeURIComponent(shareEmail)}`);
      if (!userResponse.ok) throw new Error('User not found');
      const targetUser = await userResponse.json();
      const inviteResponse = await authFetch(
        `/api/boards/${shareBoardId}/members/request?userId=${targetUser.id}&role=${shareRole}`,
        { method: 'POST' }
      );
      if (!inviteResponse.ok) {
        const errorBody = await inviteResponse.json().catch(() => null);
        throw new Error(errorBody?.error || 'Failed to share board');
      }
      setShareStatus(`Invite sent to ${targetUser.fullName || targetUser.email}`);
      setShareEmail('');
      setShareRole('MEMBER');
    } catch (error) {
      setShareStatus(error.message || 'Failed to share board');
    } finally {
      setSharingBoard(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    clearAuthState();
    navigate('/login');
  };

  const handleDeleteBoard = async () => {
    if (!selectedBoard) return;
    try {
      const response = await authFetch(`/api/boards/${selectedBoard.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete board');
      setBoards(prev => prev.filter(board => board.id !== selectedBoard.id));
      setSelectedBoard(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const response = await authFetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const updatedProfile = await response.json();
      setCurrentUser(updatedProfile);
      const user = getStoredUser();
      if (user) {
        user.fullName = updatedProfile.fullName;
        persistStoredUser(user);
        setStoredUser(user);
      }
      setShowProfileModal(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/users/me/avatar', { method: 'POST', credentials: 'include', body: formData });
      if (!response.ok) throw new Error('Failed to upload avatar');
      const data = await response.json();
      const user = getStoredUser();
      if (user) {
        user.avatarPath = data.avatarPath;
        persistStoredUser(user);
        setStoredUser(user);
      }
      await fetchCurrentUser();
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  };

  const loadOrgMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const response = await authFetch('/api/org/members');
      if (!response.ok) throw new Error('Failed to load members');
      setOrgMembers(await response.json());
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const handleRoleChange = async (memberId, systemRole) => {
    try {
      const response = await authFetch(`/api/org/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemRole })
      });
      if (!response.ok) throw new Error('Failed to update role');
      setOrgMembers(prev => prev.map(member => member.memberId === memberId ? { ...member, systemRole } : member));
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setInviteSending(true);
    setInviteStatus('');
    try {
      const response = await authFetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, customRole: inviteRole })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Failed to send invite');
      setInviteStatus(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('MEMBER');
    } catch (error) {
      setInviteStatus(error.message || 'Failed to send invite');
    } finally {
      setInviteSending(false);
    }
  };

  const handleOrgSwitch = async (orgId) => {
    try {
      const response = await authFetch('/api/auth/switch-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId })
      });
      if (!response.ok) throw new Error('Failed to switch workspace');
      const updatedUser = await response.json();
      persistStoredUser(updatedUser);
      setStoredUser(updatedUser);
      setBoards([]);
      setSelectedBoard(null);
      await fetchBoards();
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const handleBoardSelect = (board) => {
    setSelectedBoard(board);
    setShowNotificationsPanel(false);
    setSidebarOpen(false);
  };

  const toggleStarredBoard = (boardId) => {
    setStarredBoards(current => {
      const next = current.includes(boardId) ? current.filter(id => id !== boardId) : [...current, boardId];
      localStorage.setItem('xtonflow-starred-boards', JSON.stringify(next));
      return next;
    });
  };

  const visibleBoards = activeNav === 'starred' ? boards.filter(board => starredBoards.includes(board.id))
    : activeNav === 'recent' ? boards.filter(board => board.id === selectedBoard?.id)
      : boards;

  const handleNotificationsOpen = () => {
    setShowNotificationsPanel(true);
    setSidebarOpen(false);
  };

  if (!storedUser) return null;

  const displayUser = currentUser || storedUser;
  const activeOrg = storedUser?.organisations?.find(org => org.orgId === storedUser?.activeOrgId) || storedUser?.organisations?.[0] || null;

  const SidebarContent = () => (
    <>
      <div className="workspace-brand flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {displayUser?.avatarPath ? (
            <img
              src={`/api/users/avatar/${displayUser.userId}`}
              alt={displayUser.fullName || displayUser.email}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-semibold">
              {displayUser?.fullName ? displayUser.fullName.charAt(0).toUpperCase() : displayUser?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">XtonFlow</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate max-w-[160px]">{activeOrg?.orgName || 'Workspace'}</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-700 dark:hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {storedUser?.organisations?.length > 1 && (
          <div className="mb-3">
            <label className="section-label">Workspace</label>
            <select
              value={storedUser?.activeOrgId || ''}
              onChange={(e) => handleOrgSwitch(e.target.value)}
              className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {storedUser.organisations.map(org => (
                <option key={org.orgId} value={org.orgId}>{org.orgName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="workspace-nav mb-4">
          <button className={`workspace-nav-item ${activeNav === 'for-you' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('for-you')}><span>⌂</span> For you</button>
          <button className={`workspace-nav-item ${activeNav === 'recent' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('recent')}><span>◷</span> Recent</button>
          <button className={`workspace-nav-item ${activeNav === 'starred' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('starred')}><span>★</span> Starred</button>
          <button className={`workspace-nav-item ${activeNav === 'spaces' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('spaces')}><span>▦</span> Spaces</button>
        </div>

        <div className="flex justify-between items-center mb-3 px-2">
          <h2 className="section-label mb-0">Boards</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowCreateModal(true); setSidebarOpen(false); }} className="text-purple-600 hover:text-purple-500 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {visibleBoards.map(board => (
            <div key={board.id} className="space-row-wrap">
              <button onClick={() => handleBoardSelect(board)} className={`workspace-nav-item w-full text-left ${selectedBoard?.id === board.id && !showNotificationsPanel ? 'active' : ''}`}>
                <span className="truncate flex-1">{board.name}</span><span onClick={(event) => { event.stopPropagation(); toggleStarredBoard(board.id); }} className={`board-star ${starredBoards.includes(board.id) ? 'is-starred' : ''}`} title={starredBoards.includes(board.id) ? 'Remove from starred' : 'Add to starred'}>★</span>
              </button>
              <button type="button" className="space-row-menu-trigger" onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setSpaceMenuPosition({ top: Math.min(rect.bottom + 6, window.innerHeight - 480), left: Math.min(rect.right + 8, window.innerWidth - 296) });
                setOpenSpaceMenuId(current => current === board.id ? null : board.id);
              }} aria-label={`Actions for ${board.name}`}>•••</button>
              {openSpaceMenuId === board.id && <div className="space-row-menu" style={{ top: spaceMenuPosition.top, left: spaceMenuPosition.left }}>
                <button type="button" onClick={() => toggleStarredBoard(board.id)}>☆ {starredBoards.includes(board.id) ? 'Remove from starred' : 'Add to starred'}</button>
                <button type="button" onClick={() => { setShareBoardId(board.id); setShowShareModal(true); setOpenSpaceMenuId(null); }}>♧ Add people</button>
                <div className="space-row-menu-divider" />
                <button type="button" className="danger" onClick={() => { setShowDeleteConfirm(true); setOpenSpaceMenuId(null); }}>▢ Delete space</button>
                <div className="space-row-menu-footer"><strong>Workspace space</strong><span>Team-managed</span></div>
              </div>}
            </div>
          ))}
          {visibleBoards.length === 0 && <p className="px-2 py-4 text-xs text-gray-500">No spaces here yet.</p>}
        </div>

      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={() => { setShowProfileModal(true); setSidebarOpen(false); }}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
        >
          Profile
        </button>
        <button
          onClick={() => { setShowMembersModal(true); setSidebarOpen(false); loadOrgMembers(); }}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
        >
          Members & Roles
        </button>
        <button
          onClick={() => { setShowInviteModal(true); setSidebarOpen(false); }}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
        >
          Invite to Workspace
        </button>
        <button
          onClick={handleNotificationsOpen}
          className={`w-full flex justify-between items-center px-3 py-2 rounded transition text-sm ${
            showNotificationsPanel
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
        >
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">

        {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on md+ */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {SidebarContent()}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-gray-900 dark:text-white font-semibold text-sm truncate flex-1">
            {showNotificationsPanel ? 'Notifications' : selectedBoard?.name ?? 'XtonFlow'}
          </span>
          <button onClick={handleNotificationsOpen} className="relative text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 border border-gray-200 dark:border-gray-700">
              {displayUser?.avatarPath ? (
                <img src={`/api/users/avatar/${displayUser.userId}`} alt={displayUser.fullName || displayUser.email} className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center h-full text-sm font-semibold text-purple-700">
                  {displayUser?.fullName ? displayUser.fullName.charAt(0).toUpperCase() : displayUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-hidden">
          <div className="hidden md:flex items-center justify-between gap-4 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="text-gray-400">Spaces</span><span>/</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate">{selectedBoard?.name || 'Workspace'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="dashboard-search">
                <span>⌕</span>
                <input aria-label="Search workspace" placeholder="Search workspace" />
              </label>
              <button onClick={() => setShowCreateModal(true)} className="dashboard-create">＋ Create</button>
              <button onClick={handleNotificationsOpen} className="toolbar-icon" aria-label="Open notifications">♧{unreadCount > 0 && <b>{unreadCount}</b>}</button>
              <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100">
                {displayUser?.avatarPath ? (
                  <img src={`/api/users/avatar/${displayUser.userId}`} alt={displayUser.fullName || displayUser.email} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-purple-700 bg-purple-100">
                    {displayUser?.fullName ? displayUser.fullName.charAt(0).toUpperCase() : displayUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
          </div>
          {showNotificationsPanel ? (
            <div className="h-full overflow-y-auto p-4 md:p-6">
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
                  <button onClick={markAllAsRead} className="text-purple-600 dark:text-purple-400 text-sm hover:underline">
                    Mark all as read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No notifications yet</div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(n => (
                      <div key={n.id} className={`rounded-lg p-4 flex justify-between items-start gap-4 ${
                        n.status === 'UNREAD'
                          ? 'bg-purple-50 dark:bg-gray-700 border border-purple-200 dark:border-purple-500/30'
                          : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-transparent'
                      }`}>
                        <div className="min-w-0">
                          <p className="text-gray-900 dark:text-white text-sm font-medium">{n.message}</p>
                          {n.senderName && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">From: {n.senderName}</p>}
                          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {n.type === 'REQUEST' && n.status === 'UNREAD' ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleNotificationAction(n.id, 'accept')}
                                className="shrink-0 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNotificationAction(n.id, 'decline')}
                                className="shrink-0 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                              >
                                Decline
                              </button>
                            </div>
                          ) : n.status === 'UNREAD' ? (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="shrink-0 text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-1 rounded hover:from-purple-700 hover:to-blue-700"
                            >
                              Mark read
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : selectedBoard ? (
            <BoardView boardId={selectedBoard.id} boardName={selectedBoard.name} onShare={() => setShowShareModal(true)} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400 text-sm">Select a board to view tasks</div>
            </div>
          )}
        </main>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Full name</label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Birthday</label>
                <input
                  type="date"
                  value={profileForm.birthday || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Profile picture</label>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="w-full text-sm text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowProfileModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded">Cancel</button>
                <button type="submit" disabled={profileSaving} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded disabled:opacity-60">{profileSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Members</h2>
              <button onClick={() => setShowMembersModal(false)} className="text-gray-500">✕</button>
            </div>
            {membersLoading ? <p className="text-sm text-gray-500">Loading members...</p> : (
              <div className="space-y-3">
                {orgMembers.map(member => (
                  <div key={member.memberId} className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700 p-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{member.fullName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                    <select
                      value={member.systemRole}
                      onChange={(e) => handleRoleChange(member.memberId, e.target.value)}
                      className="rounded border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invite to Workspace</h2>
            {inviteStatus && <div className="mb-4 rounded bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">{inviteStatus}</div>}
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded">Cancel</button>
                <button type="submit" disabled={inviteSending} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded disabled:opacity-60">{inviteSending ? 'Sending...' : 'Send Invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete board?</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">This will permanently remove the board and its task data from the workspace.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded">Cancel</button>
              <button type="button" onClick={handleDeleteBoard} className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete Board</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="create-space-modal bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-label mb-2">Create a new space</p>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Name your space</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set up a focused board for work your team can move forward.</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-xl" aria-label="Close">×</button>
              </div>
              <div className="flex items-center gap-2 mt-5 text-xs text-gray-500 dark:text-gray-400">
                <span className={`step-dot ${createBoardStep === 1 ? 'current' : ''}`}>1</span><span>Details</span>
                <span className="h-px w-10 bg-gray-300 dark:bg-gray-600" />
                <span className={`step-dot ${createBoardStep === 2 ? 'current' : ''}`}>2</span><span>Configure</span>
                <span className="h-px w-10 bg-gray-300 dark:bg-gray-600" />
                <span className={`step-dot ${createBoardStep === 3 ? 'current' : ''}`}>3</span><span>Team</span>
              </div>
            </div>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div className="px-6 py-6 min-h-[250px]">
                {createBoardStep === 1 ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">Name <span className="text-red-500">*</span></label>
                      <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Try a team name, project goal, milestone..." required autoFocus />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">Description</label>
                      <textarea value={newBoardDescription} onChange={(e) => setNewBoardDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows="3" placeholder="What will this team work on?" />
                    </div>
                  </div>
                ) : createBoardStep === 2 ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">How will your space be managed?</label>
                      <select value={boardManagement} onChange={(e) => setBoardManagement(e.target.value)} className="w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="team">Team-managed</option>
                        <option value="company">Company-managed</option>
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        {['blank', 'delivery'].map(template => (
                          <button key={template} type="button" onClick={() => setBoardTemplate(template)} className={`text-left rounded border p-4 transition ${boardTemplate === template ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}>
                            <span className="text-lg">{template === 'blank' ? '▦' : '◈'}</span>
                            <span className="block mt-2 text-sm font-semibold text-gray-900 dark:text-white">{template === 'blank' ? 'Blank space' : 'Delivery flow'}</span>
                            <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">{template === 'blank' ? 'Start with a clean board' : 'Plan, review, and complete work'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">Access <span className="text-red-500">*</span></label>
                      <select value={newBoardVisibility} onChange={(e) => setNewBoardVisibility(e.target.value)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="TEAM">Open to workspace members</option>
                        <option value="PRIVATE">Private to invited members</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bring your team along</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Invite existing XtonFlow members now. You can always add more later.</p>
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">Names or emails</label>
                      <textarea value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows="3" placeholder="alex@example.com, sam@example.com" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Separate multiple people with commas, spaces, or semicolons.</p>
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">Role</label>
                      <select value={inviteAfterCreateRole} onChange={(e) => setInviteAfterCreateRole(e.target.value)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">Step {createBoardStep} of 3</span>
                <div className="flex gap-3">
                  {createBoardStep > 1 && <button type="button" onClick={() => setCreateBoardStep(createBoardStep - 1)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Back</button>}
                  {createBoardStep < 3 ? <button type="button" disabled={createBoardStep === 1 && !newBoardName.trim()} onClick={() => setCreateBoardStep(createBoardStep + 1)} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 text-sm font-semibold">Next</button> : <><button type="submit" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">I'll do this later</button><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold">Create space</button></>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Share Board</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Invite someone to collaborate on {selectedBoard?.name}.</p>

            {shareStatus && (
              <div className="mb-4 rounded bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">{shareStatus}</div>
            )}
            <form onSubmit={handleShareBoard} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Board</label>
                <select
                  value={shareBoardId}
                  onChange={(e) => setShareBoardId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Collaborator Email or Name</label>
                <input
                  type="text"
                  value={shareEmail}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Type name or email to search"
                  required
                />

                {/* Autocomplete suggestions */}
                {filteredUsers.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 rounded shadow max-h-40 overflow-auto">
                    {filteredUsers.map(u => (
                      <button key={u.id} type="button" onClick={() => { setShareEmail(u.email); setShareStatus(`Selected ${u.fullName} <${u.email}>`); }} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{u.fullName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Search suggestions appear as you type.</span>
                <button type="button" onClick={() => { setShowAllUsers(prev => !prev); setShareStatus(''); }} className="text-sm text-purple-600 hover:text-purple-500 transition">
                  {showAllUsers ? 'Hide user list' : 'Show full org list'}
                </button>
              </div>

              {showAllUsers && orgUsers.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 space-y-2">
                  {orgUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setShareEmail(u.email); setShareStatus(`Selected ${u.fullName} <${u.email}>`); }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{u.fullName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">Role</label>
                <select value={shareRole} onChange={(e) => setShareRole(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" disabled={sharingBoard}
                  onClick={() => { setShowShareModal(false); setShareEmail(''); setShareRole('MEMBER'); setShareStatus(''); }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={sharingBoard}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 transition disabled:bg-gray-400 text-sm">
                  {sharingBoard ? 'Sharing...' : 'Share Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
