import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
})

http.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem('cbros_auth_user')
      if (raw) {
        const user = JSON.parse(raw)
        if (user?.id) config.headers['X-User-Id'] = user.id
        if (user?.email) config.headers['X-User-Email'] = user.email
      }
    } catch {
      // ignore storage errors
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Request failed'
    return Promise.reject({
      status: error?.response?.status,
      message,
      data: error?.response?.data,
      original: error
    })
  }
)

export const httpService = {
  get: (url, config) => http.get(url, config).then((r) => r.data),
  post: (url, body, config) => http.post(url, body, config).then((r) => r.data),
  put: (url, body, config) => http.put(url, body, config).then((r) => r.data),
  patch: (url, body, config) => http.patch(url, body, config).then((r) => r.data),
  delete: (url, config) => http.delete(url, config).then((r) => r.data)
}

export default http
