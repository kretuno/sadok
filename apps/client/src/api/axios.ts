import axios from 'axios';
import { getApiBaseUrl } from './serverConfig';

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

let authResetInProgress = false;

// Додаємо токен до кожного запиту
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    const shouldResetSession =
      status === 401 ||
      (status === 403 &&
        (message === 'Токен недійсний' || message === 'Доступ заборонено: відсутній токен'));

    if (shouldResetSession) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined' && !authResetInProgress) {
        authResetInProgress = true;
        window.dispatchEvent(new CustomEvent('auth:expired'));
        window.setTimeout(() => {
          window.location.reload();
        }, 0);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
