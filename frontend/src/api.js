const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('sirer_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('sirer_token', token);
  else localStorage.removeItem('sirer_token');
}

export async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(API_BASE + url, { ...options, headers });
  } catch (e) {
    const msg = e?.message || '';
    throw new Error(
      msg.includes('Failed to fetch') || msg.includes('NetworkError')
        ? 'Impossible de joindre le serveur (réseau ou API). Vérifiez l’URL de l’API et le déploiement Vercel.'
        : msg || 'Erreur réseau'
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error || data.message || res.statusText;
    throw new Error(detail || `Erreur ${res.status}`);
  }
  return data;
}

export const auth = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/auth/me'),
};

export const users = {
  list: () => api('/users'),
  resetPasswordSuper: (id, password) => api(`/users/reset-password-super/${id}`, { method: 'POST', body: JSON.stringify({ password }) }),
};

export const provinces = {
  list: () => api('/provinces'),
};

export const grades = {
  list: () => api('/grades'),
  create: (body) => api('/grades', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api('/grades/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api('/grades/' + id, { method: 'DELETE' }),
};

export const beneficiaries = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api('/beneficiaries' + (q ? '?' + q : ''));
  },
  get: (id) => api('/beneficiaries/' + id),
  create: (body) => api('/beneficiaries', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api('/beneficiaries/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api('/beneficiaries/' + id, { method: 'DELETE' }),
  verify: (matricule) => api('/beneficiaries/public/verify/' + matricule),
};

export const alerts = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api('/alerts' + (q ? '?' + q : ''));
  },
  resolve: (id, body) => api('/alerts/' + id + '/resolve', { method: 'PATCH', body: JSON.stringify(body || {}) }),
  report: (id) => api('/alerts/' + id + '/report', { method: 'PATCH' }),
  create: (body) => api('/alerts', { method: 'POST', body: JSON.stringify(body) }),
};

export const dashboard = {
  stats: () => api('/dashboard/stats'),
};

export const cards = {
  generate: (beneficiaryId) => api('/cards/generate/' + beneficiaryId, { method: 'POST' }),
  list: (beneficiaryId) => api('/cards/beneficiary/' + beneficiaryId),
  revoke: (id) => api('/cards/' + id + '/revoke', { method: 'POST' }),
  verify: (qrPayload) => api('/cards/verify', { method: 'POST', body: JSON.stringify({ qrPayload }) }),
};

export const audit = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api('/audit' + (q ? '?' + q : ''));
  },
  clear: () => api('/audit', { method: 'DELETE' }),
};

export const reports = {
  statistics: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api('/reports/statistics' + (q ? '?' + q : ''));
  },
  beneficiariesExport: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api('/reports/beneficiaries-export' + (q ? '?' + q : ''));
  },
};

export const orphans = {
  attestationEtudes: (beneficiaryId, body) =>
    api('/orphans/' + beneficiaryId + '/attestation-etudes', { method: 'POST', body: JSON.stringify(body || {}) }),
  suspendre: (beneficiaryId, body) =>
    api('/orphans/' + beneficiaryId + '/suspendre', { method: 'POST', body: JSON.stringify(body || {}) }),
};

export const jobs = {
  runOrphanRules: () => api('/jobs/run-orphan-rules', { method: 'POST' }),
};
