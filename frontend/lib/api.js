const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// Public
export const fetchLinks = () => request('/links')
export const getQrUrl = (id, qr_image) =>
  qr_image || `${API}/links/${id}/qr.png`
export const fetchAnnouncements = () => request('/announcements')

// Admin auth
export const login = (password) =>
  request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
export const logout = () =>
  request('/admin/logout', { method: 'DELETE' })
export const checkAuth = () =>
  request('/admin/me')

// Admin CRUD
export const adminFetchLinks = () => request('/admin/links')

export const createLink = (data) =>
  request('/admin/links', { method: 'POST', body: JSON.stringify(data) })

export const updateLink = (id, rowNum, data) =>
  request(`/admin/links/${id}?row_num=${rowNum}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteLink = (id, rowNum) =>
  request(`/admin/links/${id}?row_num=${rowNum}`, { method: 'DELETE' })

export const uploadQr = (id, rowNum, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return fetch(`${API}/admin/links/${id}/qr?row_num=${rowNum}`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  }).then(r => r.json())
}

export const removeCustomQr = (id, rowNum) =>
  request(`/admin/links/${id}/qr?row_num=${rowNum}`, { method: 'DELETE' })

// Admin Announcements
export const adminFetchAnnouncements = () => request('/admin/announcements')

export const createAnnouncement = (data) =>
  request('/admin/announcements', { method: 'POST', body: JSON.stringify(data) })

export const updateAnnouncement = (id, rowNum, data) =>
  request(`/admin/announcements/${id}?row_num=${rowNum}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteAnnouncement = (id, rowNum) =>
  request(`/admin/announcements/${id}?row_num=${rowNum}`, { method: 'DELETE' })

// Public Giving
export const fetchGivingAccounts = () => request('/giving')

// Admin Giving
export const adminFetchGivingAccounts = () => request('/admin/giving')

export const createGivingAccount = (data) =>
  request('/admin/giving', { method: 'POST', body: JSON.stringify(data) })

export const updateGivingAccount = (id, rowNum, data) =>
  request(`/admin/giving/${id}?row_num=${rowNum}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteGivingAccount = (id, rowNum) =>
  request(`/admin/giving/${id}?row_num=${rowNum}`, { method: 'DELETE' })
