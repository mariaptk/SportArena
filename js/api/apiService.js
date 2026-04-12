/**
 * apiService.js — универсальный fetch-клиент
 * Обрабатывает: таймаут, 401/403/404/429/5xx, offline
 */
import { API_CONFIG } from './config.js';

// ─── Нормализованные классы ошибок ───────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ─── Человеко-читаемые сообщения об ошибках ──────────────────────────────────

const HTTP_MESSAGES = {
  401: 'Неверный API-ключ. Проверьте config.js.',
  403: 'Доступ запрещён. Возможно, лига недоступна на вашем плане.',
  404: 'Данные не найдены.',
  429: 'Превышен лимит запросов. Подождите немного.',
  500: 'Ошибка сервера API. Попробуйте позже.',
  502: 'Сервер API временно недоступен.',
  503: 'Сервис временно недоступен.',
};

// ─── Основная функция запроса ─────────────────────────────────────────────────

/**
 * @param {string} url
 * @param {Record<string,string>} headers
 * @returns {Promise<any>} parsed JSON
 */
export async function apiFetch(url, headers = {}) {
  // Offline-проверка
  if (!navigator.onLine) {
    throw new NetworkError('Нет подключения к интернету.');
  }

  // AbortController для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    API_CONFIG.REQUEST_TIMEOUT_MS
  );

  try {
    console.log(`[API] GET ${url}`);

    const requestHeaders = {
      Accept: 'application/json',
      ...headers,
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const message =
        HTTP_MESSAGES[response.status] ||
        `HTTP ошибка ${response.status}`;
      throw new ApiError(message, response.status, `HTTP_${response.status}`);
    }

    const data = await response.json();
    console.log(`[API] ✓ Ответ получен (${url.split('?')[0]})`);
    return data;

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new NetworkError('Запрос превысил время ожидания (таймаут).');
    }
    if (err instanceof ApiError || err instanceof NetworkError) {
      throw err;
    }
    throw new NetworkError(`Сетевая ошибка: ${err.message}`);
  }
}
