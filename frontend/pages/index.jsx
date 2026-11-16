import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { fetchLinks, fetchAnnouncements, fetchGivingAccounts } from '../lib/api'
import { ensureProtocol } from '../lib/utils'
import Ezra from '../components/Ezra'
import s from '../styles/Directory.module.css'

// Line icons, drawn on a 24x24 grid
const ICONS = {
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></>,
  news: <><path d="M4 10v4h3l7 4V6l-7 4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><path d="M16 14.5h2"/></>,
  search: <><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></>,
  list: <><path d="M5 7h14M5 12h14M5 17h14"/></>,
  tv: <><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M10.5 9.8v4.4l3.8-2.2z"/></>,
  map: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></>,
  connect: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></>,
  membership: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></>,
  giving: <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></>,
  devotion: <><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/></>,
  books: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></>,
}
// Categories without their own drawing borrow a close one; anything else gets the link icon
const CAT_ICON = { new_members: 'membership', counselling: 'connect', discipleship: 'books', testimony: 'giving' }

const Icon = ({ name }) => (
  <svg className={s.icon} viewBox="0 0 24 24" aria-hidden="true">{ICONS[CAT_ICON[name] || name] || ICONS.link}</svg>
)

const Logo = () => (
  <span className={s.logo}>
    <svg viewBox="0 0 88 40"><path pathLength="260" d="M8 20C8 6 24 6 32 20S48 34 56 20S80 6 80 20C80 34 64 34 56 20S40 6 32 20S8 34 8 20Z" /></svg>
  </span>
)

const catLabel = cat => cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const SLIDES = [
  { icon: 'devotion', tag: 'Daily prayer', title: 'Triumph30', text: 'Pray with us daily · 6am, 12pm, 8pm', cta: 'Join', url: 'https://www.youtube.com/@t30devotion' },
  { icon: 'tv', tag: 'CCI Global', title: 'Watch live sermons', text: 'Celebration Global TV on YouTube', cta: 'Watch', url: 'https://www.youtube.com/@CelebrationGlobalTV' },
]
const VIEWS = [['links', 'link', 'Links'], ['announcements', 'news', 'Announcements'], ['giving', 'wallet', 'Giving']]

export default function Directory({ links = [], announcements = [], givingAccounts = [] }) {
  const [view, setView] = useState('links')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [listMode, setListMode] = useState(false)
  const [modal, setModal] = useState(null)
  const [copied, setCopied] = useState(null)

  const cats = [...new Set(links.map(l => l.cat))]
  const needle = q.toLowerCase()
  const filtered = links.filter(l =>
    (cat === 'all' || l.cat === cat) &&
    (!q || `${l.name} ${l.desc} ${catLabel(l.cat)}`.toLowerCase().includes(needle))
  )

  function copy(text, id) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className={s.page}>
      <div className={s.loader} aria-hidden="true"><Logo />Ajah Info Desk</div>
      <i className={s.blob} />
      <div className={s.wrap}>
        <header className={s.header}>
          <Logo />Ajah Info Desk
          <nav className={s.nav}>
            {VIEWS.map(([key, icon, label]) => (
              <button key={key} className={view === key ? s.navOn : ''} onClick={() => setView(key)}>
                <Icon name={icon} />{label}
              </button>
            ))}
          </nav>
        </header>

        {view === 'links' && (
          <>
            <div className={s.feat}>
              <div className={s.track}>
                {/* the third slide repeats the first so the loop never rewinds */}
                {[...SLIDES, SLIDES[0]].map((sl, i) => (
                  <a key={i} className={s.slide} href={sl.url} target="_blank" rel="noopener noreferrer"
                    aria-hidden={i === SLIDES.length} tabIndex={i === SLIDES.length ? -1 : 0}>
                    <span className={s.slideIcon}><Icon name={sl.icon} /></span>
                    <div><small>{sl.tag}</small><b>{sl.title}</b><p>{sl.text}</p></div>
                    <span className={s.cta}>▶ {sl.cta}</span>
                  </a>
                ))}
              </div>
              <div className={s.dots}><i /><i /></div>
            </div>

            {announcements.length > 0 && (
              <div className={s.annBar}>
                <div className={s.annLabel}><Icon name="news" /><span>Announcements</span></div>
                <div className={s.annWin}>
                  <div className={s.annMove}>
                    {/* shown twice so the moving text loops without a gap */}
                    {[0, 1].map(n => announcements.map(a => (
                      <span key={`${n}-${a.id}`} aria-hidden={n === 1}><b>{a.title}</b><span>{a.message}</span></span>
                    )))}
                  </div>
                </div>
                <button className={s.annAll} onClick={() => setView('announcements')}>See all {announcements.length}</button>
              </div>
            )}

            <div className={s.sec}><Icon name="link" />Links</div>
            <div className={s.controls}>
              <label className={s.search}>
                <Icon name="search" />
                <input type="search" placeholder="Search…" aria-label="Search links" value={q} onChange={e => setQ(e.target.value)} />
              </label>
              <select className={s.select} aria-label="Category" value={cat} onChange={e => setCat(e.target.value)}>
                <option value="all">All Categories</option>
                {cats.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
              <div className={s.toggle}>
                <button className={listMode ? '' : s.toggleOn} aria-label="Grid view" onClick={() => setListMode(false)}><Icon name="grid" /></button>
                <button className={listMode ? s.toggleOn : ''} aria-label="List view" onClick={() => setListMode(true)}><Icon name="list" /></button>
              </div>
            </div>

            {filtered.length === 0 && <p className={s.empty}>Nothing found. Try a different search.</p>}
            <div className={`${s.grid} ${listMode ? s.list : ''}`}>
              {filtered.map(link => (
                <a key={link.id} className={s.tile} href={ensureProtocol(link.url)} target="_blank" rel="noopener noreferrer">
                  <div className={s.tileHead}>
                    <span className={s.tileIcon}><Icon name={link.cat} /></span>
                    <span>{catLabel(link.cat)}</span>
                  </div>
                  <h3>{link.name}</h3>
                  {link.desc && <p>{link.desc}</p>}
                  <div className={s.actions}>
                    <button className={`${s.btn} ${s.btnMain}`} onClick={e => { e.preventDefault(); setModal(link) }}>QR Code</button>
                    <button className={s.btn} onClick={e => { e.preventDefault(); copy(ensureProtocol(link.url), link.id) }}>
                      {copied === link.id ? '✓ Copied' : 'Copy Link'}
                    </button>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {view === 'announcements' && (
          <>
            <div className={s.sec}><Icon name="news" />Announcements</div>
            {announcements.length === 0 && <p className={s.empty}>No announcements at this time.</p>}
            <div className={s.cards}>
              {announcements.map(a => (
                <div key={a.id} className={s.card}><h3>{a.title}</h3><p>{a.message}</p></div>
              ))}
            </div>
          </>
        )}

        {view === 'giving' && (
          <>
            <div className={s.sec}><Icon name="wallet" />Account numbers</div>
            {givingAccounts.length === 0 && <p className={s.empty}>No giving accounts yet.</p>}
            <div className={s.cards}>
              {givingAccounts.map(a => (
                <div key={a.id} className={s.card}>
                  <small>{a.bank_name}</small>
                  <h3>{a.label}</h3>
                  <div className={s.acct}>
                    {a.account_number}
                    <button className={s.btn} onClick={() => copy(a.account_number, a.id)}>{copied === a.id ? '✓ Copied' : 'Copy'}</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <footer className={s.footer}>CCI Ajah Info Desk · <a href="/admin">Admin</a></footer>
      </div>

      {modal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={s.modal} role="dialog" aria-label={`QR code for ${modal.name}`}>
            <h2>{modal.name}</h2>
            {modal.desc && <p>{modal.desc}</p>}
            {modal.qr_image
              ? <img className={s.qr} src={modal.qr_image} alt={`QR code for ${modal.name}`} />
              : <QRCodeSVG className={s.qr} value={ensureProtocol(modal.url)} size={200} level="H" />}
            <p className={s.url}>{ensureProtocol(modal.url)}</p>
            <div className={s.actions}>
              <a className={`${s.btn} ${s.btnMain}`} href={ensureProtocol(modal.url)} target="_blank" rel="noopener noreferrer">Open Link ↗</a>
              <button className={s.btn} onClick={() => copy(ensureProtocol(modal.url), 'modal')}>{copied === 'modal' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <button className={s.btn} onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}

      <Ezra />
    </div>
  )
}

// Fetch data at build time and revalidate every 5 minutes
export async function getStaticProps() {
  try {
    const [links, announcements, givingAccounts] = await Promise.all([
      fetchLinks(),
      fetchAnnouncements().catch(() => []),
      fetchGivingAccounts().catch(() => [])
    ])

    return {
      props: {
        links,
        announcements,
        givingAccounts
      },
      revalidate: 300 // Rebuild every 5 minutes (300 seconds)
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    // Return empty arrays if fetch fails
    return {
      props: {
        links: [],
        announcements: [],
        givingAccounts: []
      },
      revalidate: 60 // Retry more frequently if failed
    }
  }
}
