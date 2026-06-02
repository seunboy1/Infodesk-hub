import { useState, useEffect, useRef } from 'react'
import { fetchLinks, getQrUrl, fetchAnnouncements, fetchGivingAccounts } from '../lib/api'
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
  const [copied, setCopied] = useState(null)
  const inputRef = useRef()

  // Announcements
  const [announcements, setAnnouncements] = useState([])
  const [expandedAnn, setExpandedAnn] = useState({})

  // Giving accounts
  const [givingAccounts, setGivingAccounts] = useState([])

  // View toggle: 'links', 'announcements', or 'giving'
  const [activeView, setActiveView] = useState('links')

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // View mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState('grid')

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

    fetchGivingAccounts()
      .then(setGivingAccounts)
      .catch(() => {})
  }, [])

  const filtered = links.filter(l => {
    const matchTab = activeTab === 'all' || l.cat === activeTab
    const matchQ = !q || l.name.toLowerCase().includes(q.toLowerCase()) ||
      l.desc.toLowerCase().includes(q.toLowerCase()) ||
      CATS[l.cat]?.label.toLowerCase().includes(q.toLowerCase())
    return matchTab && matchQ
  })

  function copyLink(url, id = 'link') {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className={styles.dashLayout}>
      {/* Sidebar */}
      <aside className={`${styles.dashSidebar} ${sidebarCollapsed ? styles.dashSidebarCollapsed : ''}`}>
        <button
          className={`${styles.sidebarToggle} ${sidebarCollapsed ? styles.sidebarToggleCollapsed : ''}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          ‹
        </button>
        <div className={`${styles.dashBrand} ${sidebarCollapsed ? styles.dashBrandCollapsed : ''}`}>
          <span className={styles.dashLogo}>CCI Ajah Info Desk</span>
          <span className={styles.dashLogoAccent}>{sidebarCollapsed ? 'Hub' : 'Hub'}</span>
        </div>

        <nav className={`${styles.dashNav} ${sidebarCollapsed ? styles.dashNavCollapsed : ''}`}>
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
          <button
            className={`${styles.dashNavItem} ${activeView === 'giving' ? styles.dashNavActive : ''}`}
            onClick={() => setActiveView('giving')}
          >
            <span className={styles.dashNavIcon}>🏦</span>
            <span>Account Numbers</span>
          </button>
        </nav>

        <div className={`${styles.dashSidebarFooter} ${sidebarCollapsed ? styles.dashFooterCollapsed : ''}`}>
          <a href="/admin" className={styles.dashAdminLink}>
            <span className={styles.dashAdminIcon}>⚙️</span>
            <span>Admin Panel</span>
            <span className={styles.dashAdminArrow}>→</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${styles.dashContent} ${sidebarCollapsed ? styles.dashContentCollapsed : ''}`}>
        {activeView === 'giving' ? (
          <>
            {/* Account Numbers View */}
            <header className={styles.contentHeader}>
              <h1 className={styles.contentTitle}>Account Numbers</h1>
              <p className={styles.contentSubtitle}>Bank account details for offerings and payments</p>
            </header>

            <main className={styles.main}>
              {/* Mobile count - below header */}
              <div className={styles.mobileHeaderSpacer}>
                <span className={styles.mobileCount}>{givingAccounts.length} accounts</span>
              </div>
              {givingAccounts.length === 0 ? (
                <div className={styles.empty}>
                  <span>💝</span>
                  <p>No giving accounts configured</p>
                </div>
              ) : (
                <div className={styles.givingCards}>
                  {givingAccounts.map(account => (
                    <div key={account.id} className={styles.givingCard}>
                      <div className={styles.givingBank}>
                        <span className={styles.givingBankLogo}>🏦</span>
                        <span className={styles.givingBankName}>{account.bank_name}</span>
                      </div>
                      <div className={styles.givingAccount}>
                        <span className={styles.givingLabel}>{account.label}</span>
                        <span className={styles.givingNumber}>{account.account_number}</span>
                        <button
                          className={styles.givingCopy}
                          onClick={() => copyLink(account.account_number, account.id)}
                        >
                          {copied === account.id ? '✓' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </>
        ) : activeView === 'links' ? (
          <>
            {/* Links Header */}
            <header className={styles.contentHeader}>
              <h1 className={styles.contentTitle}>Links & Resources</h1>
              <p className={styles.contentSubtitle}>Find any link or QR code instantly</p>

              {/* Desktop: Search bar */}
              <div className={styles.desktopSearchWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  className={styles.search}
                  type="text"
                  placeholder="Search forms, books, membership…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
                {q && <button className={styles.clear} onClick={() => setQ('')}>✕</button>}
              </div>

              {/* Desktop: Category tabs */}
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
              {/* Mobile: Search bar on top, filters below */}
              <div className={styles.mobileSearchRow}>
                <div className={styles.searchWrap}>
                  <span className={styles.searchIcon}>⌕</span>
                  <input
                    ref={inputRef}
                    className={styles.search}
                    type="text"
                    placeholder="Search..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                  />
                  {q && <button className={styles.clear} onClick={() => setQ('')}>✕</button>}
                </div>
                <div className={styles.mobileFilterRow}>
                  <select
                    className={styles.catSelect}
                    value={activeTab}
                    onChange={e => setActiveTab(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(CATS).map(([key, c]) => (
                      <option key={key} value={key}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                  <div className={styles.mobileViewToggle}>
                    <button
                      className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                    >
                      <svg className={styles.viewIcon} viewBox="0 0 16 16" fill="currentColor">
                        <rect x="1" y="1" width="6" height="6" rx="1" />
                        <rect x="9" y="1" width="6" height="6" rx="1" />
                        <rect x="1" y="9" width="6" height="6" rx="1" />
                        <rect x="9" y="9" width="6" height="6" rx="1" />
                      </svg>
                    </button>
                    <button
                      className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                    >
                      <svg className={styles.viewIcon} viewBox="0 0 16 16" fill="currentColor">
                        <rect x="1" y="1" width="14" height="3" rx="1" />
                        <rect x="1" y="6" width="14" height="3" rx="1" />
                        <rect x="1" y="11" width="14" height="3" rx="1" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {loading && <div className={styles.status}>Loading resources…</div>}
              {error && <div className={styles.statusError}>Could not load links: {error}</div>}

              {!loading && !error && (
                <>
                  <div className={styles.viewControls}>
                    <p className={styles.resultCount}>
                      {filtered.length === links.length
                        ? `${links.length} resources`
                        : `${filtered.length} of ${links.length} resources`}
                    </p>
                    <div className={styles.viewToggle}>
                      <button
                        className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid view"
                      >
                        <svg className={styles.viewIcon} viewBox="0 0 16 16" fill="currentColor">
                          <rect x="1" y="1" width="6" height="6" rx="1" />
                          <rect x="9" y="1" width="6" height="6" rx="1" />
                          <rect x="1" y="9" width="6" height="6" rx="1" />
                          <rect x="9" y="9" width="6" height="6" rx="1" />
                        </svg>
                      </button>
                      <button
                        className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                        onClick={() => setViewMode('list')}
                        aria-label="List view"
                      >
                        <svg className={styles.viewIcon} viewBox="0 0 16 16" fill="currentColor">
                          <rect x="1" y="1" width="14" height="3" rx="1" />
                          <rect x="1" y="6" width="14" height="3" rx="1" />
                          <rect x="1" y="11" width="14" height="3" rx="1" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {filtered.length === 0 && (
                    <div className={styles.empty}>
                      <span>🔍</span>
                      <p>Nothing found — try a different search</p>
                    </div>
                  )}

                  {viewMode === 'grid' ? (
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
                                onClick={(e) => { e.preventDefault(); copyLink(ensureProtocol(link.url), link.id); }}
                              >
                                {copied === link.id ? '✓ Copied' : 'Copy Link'}
                              </button>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={styles.list}>
                      {filtered.map(link => {
                        const cat = CATS[link.cat] || CATS.membership
                        return (
                          <a
                            key={link.id}
                            href={ensureProtocol(link.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.listCard}
                          >
                            <div className={styles.listCardContent}>
                              <div className={styles.listCardTop}>
                                <span className={`${styles.catTag} ${styles[`tag_${cat.color}`]}`}>
                                  {cat.icon} {cat.label}
                                </span>
                                <h3 className={styles.listCardName}>{link.name}</h3>
                              </div>
                              {link.desc && <p className={styles.listCardDesc}>{link.desc}</p>}
                            </div>
                            <div className={styles.listCardActions}>
                              <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={(e) => { e.preventDefault(); setModal(link); }}
                              >
                                QR
                              </button>
                              <button
                                className={styles.btn}
                                onClick={(e) => { e.preventDefault(); copyLink(ensureProtocol(link.url), link.id); }}
                              >
                                {copied === link.id ? '✓' : 'Copy'}
                              </button>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  )}
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
              {/* Mobile count - below header */}
              <div className={styles.mobileHeaderSpacer}>
                <span className={styles.mobileCount}>{announcements.length} announcements</span>
              </div>
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

            <div className={styles.urlRow} onClick={() => copyLink(ensureProtocol(modal.url), 'modal')}>
              <span className={styles.urlText}>{ensureProtocol(modal.url)}</span>
              <span className={styles.copyHint}>{copied === 'modal' ? '✓ Copied!' : 'Copy'}</span>
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
