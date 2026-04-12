import { API_CONFIG } from './config.js';

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

const HTTP_MESSAGES = {
  401: 'Invalid API key. Check your configuration.',
  403: 'Access denied. This competition may not be available on your plan.',
  404: 'Requested data was not found.',
  429: 'Request limit reached. Please try again in a moment.',
  500: 'The API server returned an error. Please try again later.',
  502: 'The API server is temporarily unavailable.',
  503: 'The service is temporarily unavailable.',
};

export async function apiFetch(url, headers = {}) {
  if (!navigator.onLine) {
    throw new NetworkError('No internet connection.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT_MS);

  try {
    console.log(`[API] GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const message = HTTP_MESSAGES[response.status] ?? `HTTP error ${response.status}`;
      throw new ApiError(message, response.status, `HTTP_${response.status}`);
    }

    const data = await response.json();
    console.log(`[API] Response received (${url.split('?')[0]})`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new NetworkError('The request timed out.');
    }
    if (error instanceof ApiError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError(`Network error: ${error.message}`);
  }
}
