const USER_KEY = 'user';

export const clearAuthState = () => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
};

export const storeAuth = (responseData, rememberMe) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  const opposite = rememberMe ? sessionStorage : localStorage;
  opposite.removeItem(USER_KEY);
  storage.setItem(USER_KEY, JSON.stringify(responseData));
};

export const getStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const persistStoredUser = (user) => {
  const storage = localStorage.getItem(USER_KEY) ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
};

export const getActiveOrg = () => {
  const user = getStoredUser();
  if (!user) return null;
  const orgs = user.organisations || [];
  return orgs.find(o => o.orgId === user.activeOrgId) || orgs[0] || null;
};

export const switchOrg = (orgId) => {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return;
  const data = JSON.parse(raw);
  data.activeOrgId = orgId;
  const storage = localStorage.getItem(USER_KEY) ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(data));
};
