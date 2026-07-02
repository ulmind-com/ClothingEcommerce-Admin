const KEY = "admin_token";
const UKEY = "admin_user";

export const getToken = () => localStorage.getItem(KEY);
export const getUser = () => {
  const raw = localStorage.getItem(UKEY);
  return raw ? JSON.parse(raw) : null;
};
export const setAuth = (token: string, user: any) => {
  localStorage.setItem(KEY, token);
  localStorage.setItem(UKEY, JSON.stringify(user));
};
export const logout = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(UKEY);
};
export const isAdmin = () => getUser()?.role === "admin";
