// /public/js/auth.js
const API_BASE =
  location.hostname === "localhost"
    ? "http://localhost:8081"
    : "https://rapidstay-api.onrender.com";

const TOKEN_KEY = "rapidstay_jwt";

// --- Token helpers ---
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// --- Decode (만료 체크용) ---
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch { return null; }
}
export function isTokenExpired() {
  const t = getToken();
  if (!t) return true;
  const p = decodeJwt(t);
  if (!p || !p.exp) return true;
  return Date.now() >= p.exp * 1000;
}

// --- Guard (보호 페이지 상단에서 호출) ---
export function requireAuth(redirect = "/login.html") {
  if (!getToken() || isTokenExpired()) {
    clearToken();
    alert("세션이 만료되었습니다. 다시 로그인 해주세요.");
    location.href = redirect;
  }
}

// --- authFetch: Authorization 자동 첨부 ---
export async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    throw new Error("Unauthorized");
  }
  return res;
}

// --- Login / Logout API ---
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.token) throw new Error(data.error || "로그인 실패");
  setToken(data.token);
  return data;
}
export function logout() {
  clearToken();
  location.reload();
}
