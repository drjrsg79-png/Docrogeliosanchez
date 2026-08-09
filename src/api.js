async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo completar la operación");
  return data;
}

const post = (url, body, headers) =>
  request(url, { method: "POST", body: JSON.stringify(body || {}), headers });

export const api = {
  me: () => request("/api/auth/me"),
  login: (email, password) => post("/api/auth/login", { email, password }),
  register: (payload) => post("/api/auth/register", payload),
  logout: () => request("/api/auth/logout"),

  courses: (audience) =>
    request(`/api/courses${audience ? `?audience=${audience}` : ""}`),
  course: (slug) => request(`/api/courses/${slug}`),

  checkout: (slug) => post("/api/checkout", { slug }),
  confirm: (sessionId) => request(`/api/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`),

  myCourses: () => request("/api/my"),
  setProgress: (lessonId, completed) => post("/api/my/progress", { lessonId, completed }),

  admin: (action, body, password) =>
    body
      ? post(`/api/admin/${action}`, body, { "x-admin-password": password })
      : request(`/api/admin/${action}`, { headers: { "x-admin-password": password } }),
};

export function formatPrice(cents, currency = "MXN") {
  const amount = (cents || 0) / 100;
  const text = Number.isInteger(amount)
    ? amount.toLocaleString("es-MX")
    : amount.toLocaleString("es-MX", { minimumFractionDigits: 2 });
  return `$${text} ${currency}`;
}

export function formatMinutes(total) {
  if (!total) return "—";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}
