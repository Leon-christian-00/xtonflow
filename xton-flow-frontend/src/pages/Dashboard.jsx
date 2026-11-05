import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BoardView from './BoardView';
import WebSocketService from '../services/WebSocketService';
import { authFetch, clearAuthState } from '../utils/authFetch';
import { getStoredUser, persistStoredUser } from '../utils/authStorage';

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
          <div className="workspace-logo-mark relative">
            {displayUser?.avatarPath ? (
              <img src={`/api/users/avatar/${displayUser.userId}`} alt="" className="absolute inset-0 h-full w-full object-cover rounded-[12px]" />
            ) : (
              <img src="/favicon.svg" alt="" className="h-5 w-5 object-contain" onError={(e) => { e.currentTarget.outerHTML = '<i class="fa-solid fa-bolt"></i>'; }} />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-base font-bold text-[var(--text)] leading-tight">XtonFlow</h1>
            <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate max-w-[150px]">{activeOrg?.orgName || 'Workspace'}</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden modal-ghost-btn" aria-label="Close menu">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {storedUser?.organisations?.length > 1 && (
          <div className="mb-4">
            <label className="section-label">Workspace</label>
            <select
              value={storedUser?.activeOrgId || ''}
              onChange={(e) => handleOrgSwitch(e.target.value)}
              className="field-input field-select !py-2 !text-[13px]"
            >
              {storedUser.organisations.map(org => (
                <option key={org.orgId} value={org.orgId}>{org.orgName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="workspace-nav mb-5">
          <button className={`workspace-nav-item ${activeNav === 'for-you' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('for-you')}><i className="fa-solid fa-house" /> For you</button>
          <button className={`workspace-nav-item ${activeNav === 'recent' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('recent')}><i className="fa-solid fa-clock-rotate-left" /> Recent</button>
          <button className={`workspace-nav-item ${activeNav === 'starred' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('starred')}><i className="fa-solid fa-star" /> Starred</button>
          <button className={`workspace-nav-item ${activeNav === 'spaces' ? 'active' : ''}`} type="button" onClick={() => setActiveNav('spaces')}><i className="fa-solid fa-table-cells-large" /> Spaces</button>
        </div>

        <div className="flex justify-between items-center mb-2.5 px-2">
          <h2 className="section-label mb-0">Boards</h2>
          <button onClick={() => { setShowCreateModal(true); setSidebarOpen(false); }} className="modal-ghost-btn !text-[var(--accent-text)] hover:!bg-[var(--accent-soft)]" aria-label="Create a new space">
            <i className="fa-solid fa-plus text-xs" />
          </button>
        </div>

        <div className="space-y-0.5">
          {visibleBoards.map(board => (
            <div key={board.id} className="space-row-wrap">
              <button onClick={() => handleBoardSelect(board)} className={`workspace-nav-item ${selectedBoard?.id === board.id && !showNotificationsPanel ? 'active' : ''}`}>
                <i className="fa-regular fa-rectangle-list shrink-0" />
                <span className="truncate flex-1">{board.name}</span>
                <span onClick={(event) => { event.stopPropagation(); toggleStarredBoard(board.id); }} className={`board-star ${starredBoards.includes(board.id) ? 'is-starred' : ''}`} title={starredBoards.includes(board.id) ? 'Remove from starred' : 'Add to starred'}>
                  <i className={starredBoards.includes(board.id) ? 'fa-solid fa-star text-[11px]' : 'fa-regular fa-star text-[11px]'} />
                </span>
              </button>
              <button type="button" className="space-row-menu-trigger" onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setSpaceMenuPosition({ top: Math.min(rect.bottom + 6, window.innerHeight - 480), left: Math.min(rect.right + 8, window.innerWidth - 296) });
                setOpenSpaceMenuId(current => current === board.id ? null : board.id);
              }} aria-label={`Actions for ${board.name}`}>
                <i className="fa-solid fa-ellipsis text-xs" />
              </button>
              {openSpaceMenuId === board.id && <div className="space-row-menu" style={{ top: spaceMenuPosition.top, left: spaceMenuPosition.left }}>
                <button type="button" onClick={() => toggleStarredBoard(board.id)}>
                  <i className={starredBoards.includes(board.id) ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
                  {starredBoards.includes(board.id) ? 'Remove from starred' : 'Add to starred'}
                </button>
                <button type="button" onClick={() => { setShareBoardId(board.id); setShowShareModal(true); setOpenSpaceMenuId(null); }}>
                  <i className="fa-solid fa-user-plus" /> Add people
                </button>
                <div className="space-row-menu-divider" />
                <button type="button" className="danger" onClick={() => { setShowDeleteConfirm(true); setOpenSpaceMenuId(null); }}>
                  <i className="fa-regular fa-trash-can" /> Delete space
                </button>
                <div className="space-row-menu-footer"><strong className="font-semibold">Workspace space</strong><span>Team-managed</span></div>
              </div>}
            </div>
          ))}
          {visibleBoards.length === 0 && (
            <p className="px-2 py-4 text-xs text-[var(--text-faint)] flex items-center gap-2">
              <i className="fa-regular fa-folder-open" /> No spaces here yet.
            </p>
          )}
        </div>

      </div>

      <div className="p-3 border-t border-[var(--border)] space-y-0.5">
        <button onClick={() => { setShowProfileModal(true); setSidebarOpen(false); }} className="sidebar-action-btn">
          <i className="fa-regular fa-user" /> Profile
        </button>
        <button onClick={() => { setShowMembersModal(true); setSidebarOpen(false); loadOrgMembers(); }} className="sidebar-action-btn">
          <i className="fa-solid fa-users-gear" /> Members & Roles
        </button>
        <button onClick={() => { setShowInviteModal(true); setSidebarOpen(false); }} className="sidebar-action-btn">
          <i className="fa-solid fa-paper-plane" /> Invite to Workspace
        </button>
        <button onClick={handleNotificationsOpen} className={`sidebar-action-btn ${showNotificationsPanel ? 'is-active' : ''}`}>
          <i className="fa-regular fa-bell" />
          <span className="flex-1">Notifications</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        <button onClick={handleLogout} className="sidebar-action-btn danger !text-[var(--danger)]">
          <i className="fa-solid fa-arrow-right-from-bracket" /> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">

        {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on md+ */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-64 sidebar-shell flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {SidebarContent()}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <button onClick={() => setSidebarOpen(true)} className="modal-ghost-btn">
            <i className="fa-solid fa-bars" />
          </button>
          <span className="text-[var(--text)] font-semibold text-sm truncate flex-1">
            {showNotificationsPanel ? 'Notifications' : selectedBoard?.name ?? 'XtonFlow'}
          </span>
          <button onClick={handleNotificationsOpen} className="toolbar-icon !w-9 !h-9">
            <i className="fa-regular fa-bell" />
            {unreadCount > 0 && <b>{unreadCount}</b>}
          </button>
          <div className="avatar-bubble h-8 w-8 text-sm">
            {displayUser?.avatarPath ? (
              <img src={`/api/users/avatar/${displayUser.userId}`} alt={displayUser.fullName || displayUser.email} className="w-full h-full object-cover" />
            ) : (
              <span>{displayUser?.fullName ? displayUser.fullName.charAt(0).toUpperCase() : displayUser?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-hidden">
          <div className="hidden md:flex items-center justify-between gap-4 px-6 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
            <div className="flex items-center gap-3 min-w-0">
              {showNotificationsPanel && (
                <button onClick={() => setShowNotificationsPanel(false)} className="modal-ghost-btn" aria-label="Back to workspace">
                  <i className="fa-solid fa-arrow-left text-xs" />
                </button>
              )}
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
                <span className="text-[var(--text-faint)]">Spaces</span><span className="text-[var(--text-faint)]">/</span>
                <span className="font-semibold text-[var(--text)] truncate">{showNotificationsPanel ? 'Notifications' : selectedBoard?.name || 'Workspace'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="dashboard-search">
                <i className="fa-solid fa-magnifying-glass" />
                <input aria-label="Search workspace" placeholder="Search workspace" />
              </label>
              <button onClick={() => setShowCreateModal(true)} className="dashboard-create"><i className="fa-solid fa-plus text-xs" /> Create</button>
              <button onClick={handleNotificationsOpen} className="toolbar-icon" aria-label="Open notifications">
                <i className="fa-regular fa-bell" />
                {unreadCount > 0 && <b>{unreadCount}</b>}
              </button>
              <div className="avatar-bubble h-9 w-9 text-sm">
                {displayUser?.avatarPath ? (
                  <img src={`/api/users/avatar/${displayUser.userId}`} alt={displayUser.fullName || displayUser.email} className="w-full h-full object-cover" />
                ) : (
                  <span>{displayUser?.fullName ? displayUser.fullName.charAt(0).toUpperCase() : displayUser?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
            </div>
          </div>
          {showNotificationsPanel ? (
            <div className="h-full overflow-y-auto p-4 md:p-6 board-workspace-bg">
              <div className="max-w-2xl mx-auto animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display text-xl font-bold text-[var(--text)]">Notifications</h2>
                  <button onClick={markAllAsRead} className="btn btn-text !text-[var(--accent-text)] hover:!bg-[var(--accent-soft)] !text-xs !font-semibold">
                    <i className="fa-solid fa-check-double" /> Mark all as read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="surface-card text-center py-16 text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-3">
                      <i className="fa-regular fa-bell-slash text-3xl text-[var(--text-faint)]" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.map(n => (
                      <div key={n.id} className={`rounded-xl p-4 flex justify-between items-start gap-4 animate-fade-in ${
                        n.status === 'UNREAD'
                          ? 'bg-[var(--accent-soft)] border border-[rgba(130,114,255,.28)]'
                          : 'surface-card'
                      }`}>
                        <div className="min-w-0">
                          <div className="flex items-start gap-2.5">
                            <i className={`fa-solid ${n.type === 'REQUEST' ? 'fa-user-plus' : 'fa-bell'} mt-1 text-xs ${n.status === 'UNREAD' ? 'text-[var(--accent-text)]' : 'text-[var(--text-faint)]'}`} />
                            <p className="text-[var(--text)] text-sm font-medium leading-snug">{n.message}</p>
                          </div>
                          {n.senderName && <p className="text-[var(--text-muted)] text-xs mt-1.5 pl-[22px]">From: {n.senderName}</p>}
                          <p className="text-[var(--text-faint)] text-[11px] mt-1 pl-[22px]">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {n.type === 'REQUEST' && n.status === 'UNREAD' ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleNotificationAction(n.id, 'accept')}
                                className="btn btn-primary !py-1.5 !px-3 !text-xs !rounded-lg"
                              >
                                <i className="fa-solid fa-check" /> Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNotificationAction(n.id, 'decline')}
                                className="btn btn-ghost !py-1.5 !px-3 !text-xs !rounded-lg !text-[var(--danger)]"
                              >
                                <i className="fa-solid fa-xmark" /> Decline
                              </button>
                            </div>
                          ) : n.status === 'UNREAD' ? (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="btn btn-primary !py-1.5 !px-3 !text-xs !rounded-lg"
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
            <div className="flex items-center justify-center h-full board-workspace-bg">
              <div className="text-center text-[var(--text-muted)]">
                <i className="fa-regular fa-folder-open text-4xl text-[var(--text-faint)] mb-3 block" />
                <p className="text-sm">Select a board to view tasks</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showProfileModal && (
        <div className="overlay">
          <div className="modal-surface p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--text)]">Edit Profile</h2>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">Update your personal details</p>
              </div>
              <button type="button" onClick={() => setShowProfileModal(false)} className="modal-ghost-btn" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="field-label">Full name</label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="field-input"
                  required
                />
              </div>
              <div>
                <label className="field-label">Birthday</label>
                <input
                  type="date"
                  value={profileForm.birthday || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="field-input field-select"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="field-label">Profile picture</label>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="field-input !bg-transparent file:mr-3 file:btn-primary file:!py-1.5 file:!px-3 file:!text-xs file:!rounded-lg file:border-0 file:cursor-pointer" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowProfileModal(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={profileSaving} className="btn btn-primary flex-1">
                  {profileSaving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving…</> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="overlay">
          <div className="modal-surface p-6 w-full max-w-lg max-h-[80vh] overflow-auto animate-scale-in">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--text)]">Workspace Members</h2>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">Manage roles for people in this workspace</p>
              </div>
              <button type="button" onClick={() => setShowMembersModal(false)} className="modal-ghost-btn" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
            </div>
            {membersLoading ? <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><i className="fa-solid fa-circle-notch fa-spin" /> Loading members…</p> : (
              <div className="space-y-2.5">
                {orgMembers.map(member => (
                  <div key={member.memberId} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="avatar-bubble h-9 w-9 text-sm">
                        <span>{member.fullName ? member.fullName.charAt(0).toUpperCase() : 'U'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text)] text-sm truncate">{member.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{member.email}</p>
                      </div>
                    </div>
                    <select
                      value={member.systemRole}
                      onChange={(e) => handleRoleChange(member.memberId, e.target.value)}
                      className="field-input field-select !w-auto !py-1.5 !text-[13px]"
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
        <div className="overlay">
          <div className="modal-surface p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--text)]">Invite to Workspace</h2>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">Send an email invitation to join this workspace</p>
              </div>
              <button type="button" onClick={() => setShowInviteModal(false)} className="modal-ghost-btn" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
            </div>
            {inviteStatus && (
              <div className="mb-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3.5 py-2.5 text-sm text-[var(--text)] flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-[var(--accent-text)]" /> {inviteStatus}
              </div>
            )}
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="field-label">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="field-input"
                  required
                />
              </div>
              <div>
                <label className="field-label">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="field-input field-select">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={inviteSending} className="btn btn-primary flex-1">
                  {inviteSending ? <><i className="fa-solid fa-circle-notch fa-spin" /> Sending…</> : <><i className="fa-solid fa-paper-plane" /> Send Invite</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedBoard && (
        <div className="overlay">
          <div className="modal-surface p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-start gap-3.5 mb-2">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] shrink-0">
                <i className="fa-regular fa-trash-can" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--text)]">Delete board?</h2>
                <p className="text-[var(--text-muted)] text-sm mt-1">This will permanently remove <span className="font-semibold text-[var(--text)]">{selectedBoard.name}</span> and all its task data.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button type="button" onClick={handleDeleteBoard} className="btn btn-danger flex-1"><i className="fa-solid fa-trash-can" /> Delete Board</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="overlay">
          <div className="create-space-modal modal-surface w-full max-w-2xl overflow-hidden">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-label mb-1.5">Create a new space</p>
                  <h2 className="font-display text-2xl font-bold text-[var(--text)]">Name your space</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Set up a focused board for work your team can move forward.</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="modal-ghost-btn" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
              </div>
              <div className="flex items-center gap-2 mt-5 text-xs text-[var(--text-muted)]">
                <span className={`step-dot ${createBoardStep === 1 ? 'current' : createBoardStep > 1 ? 'done' : ''}`}>{createBoardStep > 1 ? <i className="fa-solid fa-check text-[9px]" /> : '1'}</span><span className={createBoardStep === 1 ? 'font-semibold text-[var(--text)]' : ''}>Details</span>
                <span className={`h-px w-10 ${createBoardStep > 1 ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`} />
                <span className={`step-dot ${createBoardStep === 2 ? 'current' : createBoardStep > 2 ? 'done' : ''}`}>{createBoardStep > 2 ? <i className="fa-solid fa-check text-[9px]" /> : '2'}</span><span className={createBoardStep === 2 ? 'font-semibold text-[var(--text)]' : ''}>Configure</span>
                <span className={`h-px w-10 ${createBoardStep > 2 ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`} />
                <span className={`step-dot ${createBoardStep === 3 ? 'current' : ''}`}>3</span><span className={createBoardStep === 3 ? 'font-semibold text-[var(--text)]' : ''}>Team</span>
              </div>
            </div>
            <form onSubmit={handleCreateBoard}>
              <div className="px-6 py-6 min-h-[250px] space-y-5">
                {createBoardStep === 1 ? (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <label className="field-label">Name <span className="text-[var(--danger)]">*</span></label>
                      <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} className="field-input" placeholder="Try a team name, project goal, milestone..." required autoFocus />
                    </div>
                    <div>
                      <label className="field-label">Description</label>
                      <textarea value={newBoardDescription} onChange={(e) => setNewBoardDescription(e.target.value)} className="field-input resize-none" rows="3" placeholder="What will this team work on?" />
                    </div>
                  </div>
                ) : createBoardStep === 2 ? (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <label className="field-label">How will your space be managed?</label>
                      <select value={boardManagement} onChange={(e) => setBoardManagement(e.target.value)} className="field-input field-select !mb-4">
                        <option value="team">Team-managed</option>
                        <option value="company">Company-managed</option>
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'blank', icon: 'fa-solid fa-table-cells-large', title: 'Blank space', desc: 'Start with a clean board' },
                          { id: 'delivery', icon: 'fa-solid fa-diagram-project', title: 'Delivery flow', desc: 'Plan, review, and complete work' },
                        ].map(template => (
                          <button key={template.id} type="button" onClick={() => setBoardTemplate(template.id)} className={`option-card ${boardTemplate === template.id ? 'selected' : ''}`}>
                            <span className="option-icon"><i className={template.icon} /></span>
                            <span className="block mt-3 text-sm font-semibold text-[var(--text)]">{template.title}</span>
                            <span className="block mt-1 text-xs text-[var(--text-muted)]">{template.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="field-label">Access <span className="text-[var(--danger)]">*</span></label>
                      <select value={newBoardVisibility} onChange={(e) => setNewBoardVisibility(e.target.value)} className="field-input field-select">
                        <option value="TEAM">Open to workspace members</option>
                        <option value="PRIVATE">Private to invited members</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-[var(--text)]">Bring your team along</h3>
                      <p className="text-sm text-[var(--text-muted)] mt-1">Invite existing XtonFlow members now. You can always add more later.</p>
                    </div>
                    <div>
                      <label className="field-label">Names or emails</label>
                      <textarea value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} className="field-input resize-none" rows="3" placeholder="alex@example.com, sam@example.com" />
                      <p className="text-xs text-[var(--text-faint)] mt-2 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-question text-[10px]" />
                        Separate multiple people with commas, spaces, or semicolons.
                      </p>
                    </div>
                    <div>
                      <label className="field-label">Role</label>
                      <select value={inviteAfterCreateRole} onChange={(e) => setInviteAfterCreateRole(e.target.value)} className="field-input field-select">
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4 bg-[var(--surface-2)]">
                <span className="text-xs text-[var(--text-muted)]">Step {createBoardStep} of 3</span>
                <div className="flex gap-3">
                  {createBoardStep > 1 && <button type="button" onClick={() => setCreateBoardStep(createBoardStep - 1)} className="btn btn-text">Back</button>}
                  {createBoardStep < 3 ? (
                    <button type="button" disabled={createBoardStep === 1 && !newBoardName.trim()} onClick={() => setCreateBoardStep(createBoardStep + 1)} className="btn btn-primary !py-2 !px-5 !text-sm">
                      Next <i className="fa-solid fa-arrow-right text-xs" />
                    </button>
                  ) : (
                    <>
                      <button type="submit" className="btn btn-text">I'll do this later</button>
                      <button type="submit" className="btn btn-primary !py-2 !px-5 !text-sm"><i className="fa-solid fa-circle-plus" /> Create space</button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="overlay">
          <div className="modal-surface p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--text)]">Share Board</h2>
                <p className="text-[var(--text-muted)] text-sm mt-0.5">Invite someone to collaborate on <span className="font-semibold text-[var(--text)]">{selectedBoard?.name}</span>.</p>
              </div>
              <button type="button" onClick={() => { setShowShareModal(false); setShareEmail(''); setShareRole('MEMBER'); setShareStatus(''); }} className="modal-ghost-btn" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
            </div>

            {shareStatus && (
              <div className="mb-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3.5 py-2.5 text-sm text-[var(--text)] flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-[var(--accent-text)]" /> {shareStatus}
              </div>
            )}
            <form onSubmit={handleShareBoard} className="space-y-4">
              <div>
                <label className="field-label">Board</label>
                <select
                  value={shareBoardId}
                  onChange={(e) => setShareBoardId(e.target.value)}
                  className="field-input field-select"
                  required
                >
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="field-label">Collaborator Email or Name</label>
                <input
                  type="text"
                  value={shareEmail}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="field-input"
                  placeholder="Type name or email to search"
                  required
                />

                {/* Autocomplete suggestions */}
                {filteredUsers.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 z-50 surface-card !rounded-xl max-h-40 overflow-auto p-1.5 animate-scale-in">
                    {filteredUsers.map(u => (
                      <button key={u.id} type="button" onClick={() => { setShareEmail(u.email); setShareStatus(`Selected ${u.fullName} <${u.email}>`); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition">
                        <div className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                          <div className="avatar-bubble h-6 w-6 text-[11px] !border-0 !shadow-none"><span>{u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}</span></div>
                          {u.fullName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] pl-8">{u.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-faint)]">Search suggestions appear as you type.</span>
                <button type="button" onClick={() => { setShowAllUsers(prev => !prev); setShareStatus(''); }} className="btn btn-text !text-[var(--accent-text)] hover:!bg-[var(--accent-soft)] !text-xs !font-semibold">
                  {showAllUsers ? 'Hide user list' : 'Show full org list'}
                </button>
              </div>

              {showAllUsers && orgUsers.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1.5 space-y-0.5 animate-fade-in">
                  {orgUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setShareEmail(u.email); setShareStatus(`Selected ${u.fullName} <${u.email}>`); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--surface-3)] transition"
                    >
                      <div className="text-sm font-medium text-[var(--text)]">{u.fullName}</div>
                      <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="field-label">Role</label>
                <select value={shareRole} onChange={(e) => setShareRole(e.target.value)} className="field-input field-select">
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" disabled={sharingBoard}
                  onClick={() => { setShowShareModal(false); setShareEmail(''); setShareRole('MEMBER'); setShareStatus(''); }}
                  className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={sharingBoard} className="btn btn-primary flex-1">
                  {sharingBoard ? <><i className="fa-solid fa-circle-notch fa-spin" /> Sharing…</> : <><i className="fa-solid fa-user-plus" /> Share Board</>}
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
