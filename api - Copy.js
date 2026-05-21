/**
 * API Service Layer
 * Centralized Axios instance with interceptors for auth and error handling.
 */

import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  seedAdmin: () => api.post('/auth/seed-admin'),
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const logsAPI = {
  list: (params) => api.get('/logs', { params }),
  uploadFile: (formData) => api.post('/logs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  ingest: (batch) => api.post('/logs/ingest', batch),
  stats: (hours) => api.get('/logs/stats', { params: { hours } }),
  seedSample: () => api.post('/logs/seed-sample'),
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export const incidentsAPI = {
  list: (params) => api.get('/incidents', { params }),
  get: (id) => api.get(`/incidents/${id}`),
  update: (id, data) => api.patch(`/incidents/${id}`, data),
  resolve: (id) => api.post(`/incidents/${id}/resolve`),
  getLogs: (id) => api.get(`/incidents/${id}/logs`),
  dashboardStats: (days) => api.get('/incidents/dashboard-stats', { params: { days } }),
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export const analysisAPI = {
  runAnalysis: (id) => api.post(`/analysis/analyze/${id}`),
  getRootCause: (id, forceReanalyze) => api.get(`/analysis/root-cause/${id}`, {
    params: { force_reanalyze: forceReanalyze },
  }),
  getRemediation: (id) => api.get(`/analysis/remediation/${id}`),
  getSummary: (id) => api.get(`/analysis/summary/${id}`),
  exportJson: (id) => api.get(`/analysis/export/${id}/json`, { responseType: 'blob' }),
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export const chatbotAPI = {
  chat: (data) => api.post('/chatbot', data),
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
