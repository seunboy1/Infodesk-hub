const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper to trigger on-demand revalidation
async function triggerRevalidation() {
  try {
    const secret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET
    if (!secret) return // Skip if no secret configured

    await fetch(`/api/revalidate?secret=${secret}`)
  } catch (error) {
    console.error('Failed to trigger revalidation:', error)
  }
}

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

export const createLink = async (data) => {
  const result = await request('/admin/links', { method: 'POST', body: JSON.stringify(data) })
  await triggerRevalidation()
  return result
}

export const updateLink = async (id, rowNum, data) => {
  const result = await request(`/admin/links/${id}?row_num=${rowNum}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  await triggerRevalidation()
  return result
}

export const deleteLink = async (id, rowNum) => {
  const result = await request(`/admin/links/${id}?row_num=${rowNum}`, { method: 'DELETE' })
  await triggerRevalidation()
  return result
}

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

export const createAnnouncement = async (data) => {
  const result = await request('/admin/announcements', { method: 'POST', body: JSON.stringify(data) })
  await triggerRevalidation()
  return result
}

export const updateAnnouncement = async (id, rowNum, data) => {
  const result = await request(`/admin/announcements/${id}?row_num=${rowNum}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  await triggerRevalidation()
  return result
}

export const deleteAnnouncement = async (id, rowNum) => {
  const result = await request(`/admin/announcements/${id}?row_num=${rowNum}`, { method: 'DELETE' })
  await triggerRevalidation()
  return result
}

// Public Giving
export const fetchGivingAccounts = () => request('/giving')

// Admin Giving
export const adminFetchGivingAccounts = () => request('/admin/giving')

export const createGivingAccount = async (data) => {
  const result = await request('/admin/giving', { method: 'POST', body: JSON.stringify(data) })
  await triggerRevalidation()
  return result
}

export const updateGivingAccount = async (id, rowNum, data) => {
  const result = await request(`/admin/giving/${id}?row_num=${rowNum}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  await triggerRevalidation()
  return result
}

export const deleteGivingAccount = async (id, rowNum) => {
  const result = await request(`/admin/giving/${id}?row_num=${rowNum}`, { method: 'DELETE' })
  await triggerRevalidation()
  return result
}
