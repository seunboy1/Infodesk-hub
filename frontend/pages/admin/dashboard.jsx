import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  checkAuth, logout, adminFetchLinks,
  createLink, updateLink, deleteLink,
  uploadQr, removeCustomQr,
  adminFetchAnnouncements, createAnnouncement,
  updateAnnouncement, deleteAnnouncement
} from '../../lib/api'
import { ensureProtocol } from '../../lib/utils'
import styles from '../../styles/Admin.module.css'

const CATS = ['membership', 'new_members', 'testimony', 'books', 'connect', 'map', 'giving', 'devotion', 'counselling']
const EMPTY_FORM = { name: '', desc: '', cat: 'membership', url: '', active: true }
const EMPTY_ANNOUNCEMENT = { title: '', message: '', active: true }


export default function Dashboard() {
  const router = useRouter()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)        // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [editTarget, setEditTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [qrUploading, setQrUploading] = useState(null)
  const [toast, setToast] = useState(null)

  // View toggle: 'links' or 'announcements'
  const [activeView, setActiveView] = useState('links')

  // Announcements state
  const [announcements, setAnnouncements] = useState([])
  const [annModal, setAnnModal] = useState(null)  // null | 'add' | 'edit'
  const [annForm, setAnnForm] = useState(EMPTY_ANNOUNCEMENT)
  const [annEditTarget, setAnnEditTarget] = useState(null)
  const [annSaving, setAnnSaving] = useState(false)
  const [annDeleteConfirm, setAnnDeleteConfirm] = useState(null)

  useEffect(() => {
    checkAuth().catch(() => router.push('/admin'))
    loadLinks()
    loadAnnouncements()
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadLinks() {
    try {
      const data = await adminFetchLinks()
      setLinks(data)
    } catch {
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setModal('add')
  }

  function openEdit(link) {
    setForm({ name: link.name, desc: link.desc, cat: link.cat, url: link.url, active: link.active })
    setEditTarget(link)
    setModal('edit')
  }

  async function handleSave() {
    if (!form.name || !form.url) return
    setSaving(true)
    try {
      if (modal === 'add') {
        await createLink(form)
        showToast('Link added!')
      } else {
        await updateLink(editTarget.id, editTarget.row_num, form)
        showToast('Link updated!')
      }
      setModal(null)
      loadLinks()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(link) {
    try {
      await deleteLink(link.id, link.row_num)
      setDeleteConfirm(null)
      showToast('Link deleted.')
      loadLinks()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleQrUpload(link, file) {
    setQrUploading(link.id)
    try {
      await uploadQr(link.id, link.row_num, file)
      showToast('QR image uploaded!')
      loadLinks()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setQrUploading(null)
    }
  }

  async function handleRemoveQr(link) {
    try {
      await removeCustomQr(link.id, link.row_num)
      showToast('Custom QR removed — auto-generating from URL.')
      loadLinks()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleLogout() {
    await logout()
    router.push('/admin')
  }

  // ── Announcements ─────────────────────────────────────────────────────────

  async function loadAnnouncements() {
    try {
      const data = await adminFetchAnnouncements()
      setAnnouncements(data)
    } catch {
      // silently fail - announcements are secondary
    }
  }

  function openAddAnnouncement() {
    setAnnForm(EMPTY_ANNOUNCEMENT)
    setAnnEditTarget(null)
    setAnnModal('add')
  }

  function openEditAnnouncement(ann) {
    setAnnForm({ title: ann.title, message: ann.message, active: ann.active })
    setAnnEditTarget(ann)
    setAnnModal('edit')
  }

  async function handleSaveAnnouncement() {
    if (!annForm.title || !annForm.message) return
    setAnnSaving(true)
    try {
      if (annModal === 'add') {
        await createAnnouncement(annForm)
        showToast('Announcement added!')
      } else {
        await updateAnnouncement(annEditTarget.id, annEditTarget.row_num, annForm)
        showToast('Announcement updated!')
      }
      setAnnModal(null)
      loadAnnouncements()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setAnnSaving(false)
    }
  }

  async function handleDeleteAnnouncement(ann) {
    try {
      await deleteAnnouncement(ann.id, ann.row_num)
      setAnnDeleteConfirm(null)
      showToast('Announcement deleted.')
      loadAnnouncements()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div className={styles.dashPage}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside className={styles.dashSidebar}>
        <div className={styles.dashBrand}>
          <span className={styles.dashLogo}>CCI Ajah Info Desk</span>
          <span className={styles.dashLogoAccent}>Hub</span>
          <span className={styles.dashLogoSub}>Admin Panel</span>
        </div>

        <nav className={styles.dashNav}>
          <button
            className={`${styles.dashNavItem} ${activeView === 'links' ? styles.dashNavActive : ''}`}
            onClick={() => setActiveView('links')}
          >
            <span className={styles.dashNavIcon}>🔗</span>
            <span>Links</span>
            <span className={styles.dashNavBadge}>{links.length}</span>
          </button>
          <button
            className={`${styles.dashNavItem} ${activeView === 'announcements' ? styles.dashNavActive : ''}`}
            onClick={() => setActiveView('announcements')}
          >
            <span className={styles.dashNavIcon}>📢</span>
            <span>Announcements</span>
            {announcements.length > 0 && (
              <span className={styles.dashNavBadge}>{announcements.length}</span>
            )}
          </button>
        </nav>

        <div className={styles.dashSidebarFooter}>
          <a href="/" className={styles.dashFooterLink}>
            <span>🏠</span>
            <span>View Directory</span>
          </a>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.dashContent}>
        {activeView === 'links' ? (
          <>
            {/* Links Header */}
            <header className={styles.contentHeader}>
              <h1 className={styles.contentTitle}>Links & QR Codes</h1>
              <p className={styles.contentSubtitle}>Manage all directory links and their QR codes</p>
            </header>

            <main className={styles.dashMain}>
              <div className={styles.dashHeader}>
                <span></span>
                <button className={styles.addBtn} onClick={openAdd}>+ Add link</button>
              </div>

              {loading && <p className={styles.loading}>Loading…</p>}

              {!loading && (
                <div className={styles.table}>
                  <div className={styles.tableHead}>
                    <span>Name</span>
                    <span>Category</span>
                    <span>URL</span>
                    <span>QR</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>

                  {links.length === 0 && (
                    <div className={styles.tableEmpty}>No links yet — add your first one above.</div>
                  )}

                  {links.map(link => (
                    <div key={link.id} className={`${styles.tableRow} ${!link.active ? styles.rowHidden : ''}`}>
                      <div className={styles.cellName}>
                        <span className={styles.linkName}>{link.name}</span>
                        {link.desc && <span className={styles.linkDesc}>{link.desc}</span>}
                      </div>

                      <div>
                        <span className={`${styles.catBadge} ${styles[`cat_${link.cat}`]}`}>
                          {link.cat}
                        </span>
                      </div>

                      <div className={styles.cellUrl}>
                        <a href={ensureProtocol(link.url)} target="_blank" rel="noopener noreferrer" className={styles.urlText}>
                          {link.url}
                        </a>
                      </div>

                      <div className={styles.cellQr}>
                        {link.qr_image ? (
                          <div className={styles.qrActions}>
                            <img src={link.qr_image} alt="QR" className={styles.qrThumb} />
                            <button className={styles.qrRemove} onClick={() => handleRemoveQr(link)} title="Remove custom QR">✕</button>
                          </div>
                        ) : (
                          <div className={styles.qrUpload}>
                            <span className={styles.qrAuto}>Auto</span>
                            <label className={styles.qrUploadBtn} title="Upload custom QR image">
                              {qrUploading === link.id ? '…' : '↑'}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={e => e.target.files[0] && handleQrUpload(link, e.target.files[0])}
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className={`${styles.statusBadge} ${link.active ? styles.statusActive : styles.statusHidden}`}>
                          {link.active ? 'Visible' : 'Hidden'}
                        </span>
                      </div>

                      <div className={styles.cellActions}>
                        <button className={styles.editBtn} onClick={() => openEdit(link)}>Edit</button>
                        <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(link)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </>
        ) : (
          <>
            {/* Announcements Header */}
            <header className={styles.contentHeader}>
              <h1 className={styles.contentTitle}>Announcements</h1>
              <p className={styles.contentSubtitle}>Manage announcements shown in the directory</p>
            </header>

            <main className={styles.dashMain}>
              <div className={styles.dashHeader}>
                <span></span>
                <button className={styles.addBtn} onClick={openAddAnnouncement}>+ Add announcement</button>
              </div>

              <div className={styles.table}>
                <div className={styles.tableHead} style={{ gridTemplateColumns: '2fr 3fr 100px 120px' }}>
                  <span>Title</span>
                  <span>Message</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                {announcements.length === 0 && (
                  <div className={styles.tableEmpty}>No announcements yet — add your first one above.</div>
                )}

                {announcements.map(ann => (
                  <div key={ann.id} className={`${styles.tableRow} ${!ann.active ? styles.rowHidden : ''}`} style={{ gridTemplateColumns: '2fr 3fr 100px 120px' }}>
                    <div className={styles.cellName}>
                      <span className={styles.linkName}>{ann.title}</span>
                    </div>

                    <div className={styles.cellUrl}>
                      <span className={styles.annMessage}>{ann.message}</span>
                    </div>

                    <div>
                      <span className={`${styles.statusBadge} ${ann.active ? styles.statusActive : styles.statusHidden}`}>
                        {ann.active ? 'Visible' : 'Hidden'}
                      </span>
                    </div>

                    <div className={styles.cellActions}>
                      <button className={styles.editBtn} onClick={() => openEditAnnouncement(ann)}>Edit</button>
                      <button className={styles.deleteBtn} onClick={() => setAnnDeleteConfirm(ann)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.formModal}>
            <h2 className={styles.formTitle}>{modal === 'add' ? 'Add new link' : 'Edit link'}</h2>

            <label className={styles.label}>Name *
              <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Testimony form" />
            </label>

            <label className={styles.label}>Description
              <input className={styles.input} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Short description shown on the card" />
            </label>

            <label className={styles.label}>Category
              <select className={styles.select} value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className={styles.label}>URL *
              <input className={styles.input} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
            </label>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              Show in directory
            </label>

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !form.name || !form.url}
              >
                {saving ? 'Saving…' : modal === 'add' ? 'Add link' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className={styles.confirmModal}>
            <h2 className={styles.confirmTitle}>Delete "{deleteConfirm.name}"?</h2>
            <p className={styles.confirmText}>This will remove it from the directory and the Google Sheet. This cannot be undone.</p>
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className={styles.deleteBtnConfirm} onClick={() => handleDelete(deleteConfirm)}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Add / Edit Modal */}
      {annModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setAnnModal(null)}>
          <div className={styles.formModal}>
            <h2 className={styles.formTitle}>{annModal === 'add' ? 'Add new announcement' : 'Edit announcement'}</h2>

            <label className={styles.label}>Title *
              <input className={styles.input} value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Service time change" />
            </label>

            <label className={styles.label}>Message *
              <textarea className={styles.textarea} value={annForm.message} onChange={e => setAnnForm(f => ({ ...f, message: e.target.value }))} placeholder="The announcement message..." rows={4} />
            </label>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={annForm.active} onChange={e => setAnnForm(f => ({ ...f, active: e.target.checked }))} />
              Show in directory
            </label>

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setAnnModal(null)}>Cancel</button>
              <button
                className={styles.saveBtn}
                onClick={handleSaveAnnouncement}
                disabled={annSaving || !annForm.title || !annForm.message}
              >
                {annSaving ? 'Saving…' : annModal === 'add' ? 'Add announcement' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Delete confirm */}
      {annDeleteConfirm && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setAnnDeleteConfirm(null)}>
          <div className={styles.confirmModal}>
            <h2 className={styles.confirmTitle}>Delete "{annDeleteConfirm.title}"?</h2>
            <p className={styles.confirmText}>This will remove the announcement. This cannot be undone.</p>
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setAnnDeleteConfirm(null)}>Cancel</button>
              <button className={styles.deleteBtnConfirm} onClick={() => handleDeleteAnnouncement(annDeleteConfirm)}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
