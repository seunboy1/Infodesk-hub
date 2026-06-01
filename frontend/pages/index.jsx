import { useState, useEffect, useRef } from 'react'
import { fetchLinks, getQrUrl, fetchAnnouncements } from '../lib/api'
import { ensureProtocol } from '../lib/utils'
import styles from '../styles/Directory.module.css'

const CATS = {
  membership:  { label: 'Membership',  color: 'teal',   icon: '👥' },
  new_members: { label: 'New Members', color: 'purple', icon: '🌟' },
  testimony:  { label: 'Testimony',  color: 'coral',  icon: '❤️' },
  books:      { label: 'Books',      color: 'amber',  icon: '📖' },
  connect:    { label: 'Connect',    color: 'gold',   icon: '🤝' },
  map:        { label: 'Map',        color: 'blue',   icon: '📍' },
  giving:     { label: 'Giving',     color: 'green',  icon: '💝' },
  devotion:    { label: 'Devotion',    color: 'rose', icon: '🙏' },
  counselling: { label: 'Counselling', color: 'cyan', icon: '💬' },
}


export default function Directory() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [modal, setModal] = useState(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef()

  // Announcements
  const [announcements, setAnnouncements] = useState([])
  const [expandedAnn, setExpandedAnn] = useState({})

  // View toggle: 'links' or 'announcements'
  const [activeView, setActiveView] = useState('links')

  // Helper to detect announcement type from title
  function getAnnType(title) {
    const t = title.toLowerCase()
    if (t.includes('service') || t.includes('worship')) return { icon: '⛪', color: 'teal', label: 'Service' }
    if (t.includes('prayer') || t.includes('triumph')) return { icon: '🙏', color: 'rose', label: 'Prayer' }
    if (t.includes('meeting') || t.includes('fellowship')) return { icon: '🤝', color: 'gold', label: 'Fellowship' }
    if (t.includes('event') || t.includes('program')) return { icon: '📅', color: 'purple', label: 'Event' }
    if (t.includes('urgent') || t.includes('important')) return { icon: '🔔', color: 'coral', label: 'Important' }
    return { icon: '📢', color: 'blue', label: 'Notice' }
  }

  function toggleExpand(id) {
    setExpandedAnn(prev => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    fetchLinks()
      .then(setLinks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    fetchAnnouncements()
      .then(setAnnouncements)
      .catch(() => {})
  }, [])

  const filtered = links.filter(l => {
    const matchTab = activeTab === 'all' || l.cat === activeTab
    const matchQ = !q || l.name.toLowerCase().includes(q.toLowerCase()) ||
      l.desc.toLowerCase().includes(q.toLowerCase()) ||
      CATS[l.cat]?.label.toLowerCase().includes(q.toLowerCase())
    return matchTab && matchQ
  })

  function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={styles.dashLayout}>
      {/* Sidebar */}
      <aside className={styles.dashSidebar}>
        <div className={styles.dashBrand}>
          <span className={styles.dashLogo}>CCI Ajah Info Desk</span>
          <span className={styles.dashLogoAccent}>Hub</span>
        </div>

        <nav className={styles.dashNav}>
          <button
            className={`${styles.dashNavItem} ${activeView === 'links' ? styles.dashNavActive : ''}`}
            onClick={() => setActiveView('links')}
          >
            <span className={styles.dashNavIcon}>📋</span>
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
          <a href="/admin" className={styles.dashAdminLink}>
            <span className={styles.dashAdminIcon}>⚙️</span>
            <span>Admin Panel</span>
            <span className={styles.dashAdminArrow}>→</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.dashContent}>
        {activeView === 'links' ? (
          <>
            {/* Links Header */}
            <header className={styles.contentHeader}>
              <h1 className={styles.contentTitle}>Links & Resources</h1>
              <p className={styles.contentSubtitle}>Find any link or QR code instantly</p>

              {/* Search */}
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  ref={inputRef}
                  className={styles.search}
                  type="text"
                  placeholder="Search forms, books, membership…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
                {q && <button className={styles.clear} onClick={() => setQ('')}>✕</button>}
              </div>

              {/* Category tabs */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('all')}
                >All</button>
                {Object.entries(CATS).map(([key, c]) => (
                  <button
                    key={key}
                    className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(key)}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </header>

            {/* Links Grid */}
            <main className={styles.main}>
              {loading && <div className={styles.status}>Loading resources…</div>}
              {error && <div className={styles.statusError}>Could not load links: {error}</div>}

              {!loading && !error && (
                <>
                  <p className={styles.resultCount}>
                    {filtered.length === links.length
                      ? `${links.length} resources`
                      : `${filtered.length} of ${links.length} resources`}
                  </p>

                  {filtered.length === 0 && (
                    <div className={styles.empty}>
                      <span>🔍</span>
                      <p>Nothing found — try a different search</p>
                    </div>
                  )}

                  <div className={styles.grid}>
                    {filtered.map(link => {
                      const cat = CATS[link.cat] || CATS.membership
                      return (
                        <a
                          key={link.id}
                          href={ensureProtocol(link.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${styles.card} ${styles[`card_${cat.color}`]}`}
                        >
                          <div className={styles.cardTop}>
                            <span className={`${styles.catTag} ${styles[`tag_${cat.color}`]}`}>
                              {cat.icon} {cat.label}
                            </span>
                          </div>
                          <h3 className={styles.cardName}>{link.name}</h3>
                          {link.desc && <p className={styles.cardDesc}>{link.desc}</p>}
                          <div className={styles.cardActions}>
                            <button
                              className={`${styles.btn} ${styles.btnPrimary}`}
                              onClick={(e) => { e.preventDefault(); setModal(link); }}
                            >
                              QR Code
                            </button>
                            <button
                              className={styles.btn}
                              onClick={(e) => { e.preventDefault(); copyLink(ensureProtocol(link.url)); }}
                            >
                              Copy Link
                            </button>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </>
              )}
            </main>
          </>
        ) : (
          <>
            {/* Announcements View */}
            <header className={styles.contentHeader}>
              <h1 className={styles.contentTitle}>Announcements</h1>
              <p className={styles.contentSubtitle}>Stay updated with the latest news</p>
            </header>

            <main className={styles.main}>
              {announcements.length === 0 ? (
                <div className={styles.empty}>
                  <span>📢</span>
                  <p>No announcements at this time</p>
                </div>
              ) : (
                <div className={styles.annTimeline}>
                  {announcements.map((ann, idx) => {
                    const type = getAnnType(ann.title)
                    const isLong = ann.message.length > 150
                    const isExpanded = expandedAnn[ann.id]
                    return (
                      <div key={ann.id} className={styles.annItem}>
                        <div className={`${styles.annAccent} ${styles[`accent_${type.color}`]}`} />
                        <div className={styles.annContent}>
                          <div className={styles.annHeader}>
                            <span className={`${styles.annIcon} ${styles[`tag_${type.color}`]}`}>
                              {type.icon}
                            </span>
                            <span className={`${styles.annTypeBadge} ${styles[`tag_${type.color}`]}`}>
                              {type.label}
                            </span>
                          </div>
                          <h3 className={styles.annTitle}>{ann.title}</h3>
                          <p className={`${styles.annMessage} ${!isExpanded && isLong ? styles.annTruncated : ''}`}>
                            {ann.message}
                          </p>
                          {isLong && (
                            <button
                              className={styles.annExpandBtn}
                              onClick={() => toggleExpand(ann.id)}
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </main>
          </>
        )}

        <footer className={styles.footer}>
          CCI Info Desk Hub
        </footer>
      </div>

      {/* QR Modal */}
      {modal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={`${styles.modalIcon} ${styles[`tag_${CATS[modal.cat]?.color}`]}`}>
                {CATS[modal.cat]?.icon}
              </span>
              <h2 className={styles.modalTitle}>{modal.name}</h2>
            </div>
            {modal.desc && <p className={styles.modalDesc}>{modal.desc}</p>}

            <div className={styles.qrBox}>
              <img
                src={getQrUrl(modal.id, modal.qr_image)}
                alt={`QR code for ${modal.name}`}
                className={styles.qrImg}
              />
            </div>

            <div className={styles.urlRow} onClick={() => copyLink(ensureProtocol(modal.url))}>
              <span className={styles.urlText}>{ensureProtocol(modal.url)}</span>
              <span className={styles.copyHint}>{copied ? '✓ Copied!' : 'Copy'}</span>
            </div>

            <a href={ensureProtocol(modal.url)} target="_blank" rel="noopener noreferrer" className={styles.openBtn}>
              Open Link ↗
            </a>
            <button className={styles.closeBtn} onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
