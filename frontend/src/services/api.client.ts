import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Inject JWT Token & Operational Context (branchId, userId)
apiClient.interceptors.request.use(
  (config) => {
    // 1. Attach JWT Authorization Header
    const token = localStorage.getItem('supero_pos_jwt') || useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Attach Operational Context Headers
    const branchId = localStorage.getItem('supero_pos_branch_id') || useAuthStore.getState().selectedBranchId;
    const user = useAuthStore.getState().user;

    if (branchId) {
      config.headers['x-branch-id'] = branchId;
    }
    if (user?.id) {
      config.headers['x-user-id'] = String(user.id);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized / Token Expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Sesión expirada o token no válido. Ejecutando cierre de sesión automático...');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
