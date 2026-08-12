import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login:    (data)         => api.post('/auth/login', data),
  me:       ()             => api.get('/auth/me'),
  register: (data)         => api.post('/auth/register', data),
  getUsers: ()             => api.get('/auth/users'),
};

// ── Assets / Dashboard ────────────────────────────────────────────
export const assetsAPI = {
  getDashboard:      (params) => api.get('/assets/dashboard', { params }),
  getSummary:        (params) => api.get('/assets/summary',   { params }),
  getBases:          ()       => api.get('/assets/bases'),
  getEquipmentTypes: ()       => api.get('/assets/equipment-types'),
  getAuditLogs:      (params) => api.get('/assets/audit-logs', { params }),
};

// ── Purchases ─────────────────────────────────────────────────────
export const purchasesAPI = {
  getAll:  (params) => api.get('/purchases', { params }),
  create:  (data)   => api.post('/purchases', data),
  remove:  (id)     => api.delete(`/purchases/${id}`),
};

// ── Transfers ─────────────────────────────────────────────────────
export const transfersAPI = {
  getAll:  (params) => api.get('/transfers', { params }),
  create:  (data)   => api.post('/transfers', data),
};

// ── Assignments ───────────────────────────────────────────────────
export const assignmentsAPI = {
  getAll:  (params) => api.get('/assignments', { params }),
  create:  (data)   => api.post('/assignments', data),
};

// ── Expenditures ──────────────────────────────────────────────────
export const expendituresAPI = {
  getAll:  (params) => api.get('/expenditures', { params }),
  create:  (data)   => api.post('/expenditures', data),
};

export default api;
