import { useState, useEffect } from 'react'
import { fetchBooks, createOrder, fetchOrder } from '../lib/api'
import d from '../styles/Directory.module.css'
import s from '../styles/Bookstore.module.css'

const naira = n => '₦' + n.toLocaleString('en-NG')
const plural = n => `${n} book${n === 1 ? '' : 's'}`

const Logo = () => (
  <span className={s.logo}>
    <svg viewBox="0 0 88 40"><path pathLength="260" d="M8 20C8 6 24 6 32 20S48 34 56 20S80 6 80 20C80 34 64 34 56 20S40 6 32 20S8 34 8 20Z" /></svg>
  </span>
)

export default function Bookstore({ books: saved = [] }) {
  const [books, setBooks] = useState(saved)
  const [bag, setBag] = useState({}) // book id -> copies
  const [flipped, setFlipped] = useState({})
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ref, setRef] = useState(null) // set when the buyer comes back from paying
  const [order, setOrder] = useState(null)

  useEffect(() => {
    // the saved page can be a minute old, so refresh the copies left
    fetchBooks().then(setBooks).catch(() => {})
    const back = new URLSearchParams(window.location.search).get('order')
    if (back) { setRef(back); check(back) }
  }, [])

  async function check(orderRef, tries = 0) {
    setOrder(null)
    try {
      const o = await fetchOrder(orderRef)
      // a bank transfer can take a few seconds to land, so look again a few times
      if (o.status === 'pending' && tries < 5) return setTimeout(() => check(orderRef, tries + 1), 4000)
      setOrder(o)
    } catch {
      setOrder({ status: 'error' })
    }
  }

  const lines = books.filter(b => bag[b.id])
  const count = lines.reduce((n, b) => n + bag[b.id], 0)
  const booksTotal = lines.reduce((n, b) => n + b.price * bag[b.id], 0)

  const setQty = (b, n) => setBag({ ...bag, [b.id]: Math.max(0, Math.min(n, b.stock, 10)) })
  const field = key => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }), required: true })

  async function pay(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await createOrder({ ...form, items: lines.map(b => ({ id: b.id, qty: bag[b.id] })) })
      window.location.href = r.checkout_url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const header = (
    <header className={s.header}>
      <a className={s.brand} href="/bookstore"><Logo />Bookstore</a>
    </header>
  )

  if (ref) {
    return (
      <div className={s.page}>
        {header}
        <main className={s.done} aria-live="polite">
          {!order && <p className={s.wait}>Checking your payment…</p>}
          {order?.status === 'paid' && (
            <>
              <div className={s.ezra}>
                <span className={`${d.angel} ${s.angel}`}><i className={d.wingL} /><i className={d.wingR} /><i className={d.angelBody} /></span>
                <span className={s.bubble}>Happy reading!</span>
              </div>
              <span className={s.check} aria-hidden="true">✓</span>
              <h1>Payment confirmed</h1>
              <p>Order {order.ref} · {plural(order.count)} · {naira(order.total)}</p>
              <a className={s.btn} href="/bookstore">Back to bookstore</a>
            </>
          )}
          {order && order.status !== 'paid' && (
            <>
              <h1>We haven't received this payment yet</h1>
              <p>If you have paid, give it a moment and check again. Your order number is {ref}.</p>
              <button className={s.btn} onClick={() => check(ref)}>Check again</button>
              <a className={s.home} href="/bookstore">Back to bookstore</a>
            </>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className={s.page}>
      {header}
      <main className={s.wrap}>
        <h1>Take the words home with you.</h1>
        <div className={s.cols}>
          <div className={s.grid}>
            {books.map(b => {
              const qty = bag[b.id] || 0
              return (
                <article key={b.id} className={s.card}>
                  {/* only books with a real back cover photo can be flipped */}
                  {b.back_image ? (
                    <>
                      <button type="button" className={`${s.cover} ${flipped[b.id] ? s.flipped : ''}`}
                        aria-pressed={!!flipped[b.id]} aria-label={`Flip ${b.title} to see the back`}
                        onClick={() => setFlipped({ ...flipped, [b.id]: !flipped[b.id] })}>
                        <span className={s.inner}>
                          <img className={s.face} src={b.front_image} alt="" />
                          <img className={`${s.face} ${s.backFace}`} src={b.back_image} alt="" />
                        </span>
                      </button>
                      <small className={s.hint}>Tap the book to flip it</small>
                    </>
                  ) : (
                    <>
                      <span className={s.cover}><span className={s.inner}><img className={s.face} src={b.front_image} alt="" /></span></span>
                      <small className={s.hint}>{b.description}</small>
                    </>
                  )}
                  <h2>{b.title}</h2>
                  <div className={s.row}>
                    <b className={s.price}>{naira(b.price)}</b>
                    <span className={s.left}>{b.stock > 0 ? `${b.stock} left` : 'Sold out'}</span>
                  </div>
                  <div className={s.stepper}>
                    <button type="button" aria-label={`Remove one copy of ${b.title}`} disabled={!qty} onClick={() => setQty(b, qty - 1)}>−</button>
                    <span aria-live="polite">{qty}</span>
                    <button type="button" aria-label={`Add one copy of ${b.title}`} disabled={qty >= Math.min(b.stock, 10)} onClick={() => setQty(b, qty + 1)}>+</button>
                  </div>
                </article>
              )
            })}
          </div>

          <form id="bag" className={s.bag} onSubmit={pay}>
            <h2>Your bag</h2>
            {!count ? <p className={s.empty}>Your bag is empty. Add a book to get started.</p> : (
              <>
                {lines.map(b => (
                  <div key={b.id} className={s.line}>
                    <img src={b.front_image} alt="" />
                    <span><b>{b.title}</b><small>{bag[b.id]} × {naira(b.price)}</small></span>
                    <button type="button" aria-label={`Remove ${b.title} from your bag`} onClick={() => setQty(b, 0)}>✕</button>
                  </div>
                ))}
                <dl className={s.sums}>
                  <dt className={s.total}>Total</dt><dd className={s.total}>{naira(booksTotal)}</dd>
                </dl>
                <label>Name<input autoComplete="name" minLength={2} maxLength={80} {...field('name')} /></label>
                <label>Phone<input type="tel" autoComplete="tel" inputMode="tel" pattern="0[789][01][0-9]{8}|\+?234[789][01][0-9]{8}|\+[1-9][0-9]{9,14}" title="An 11-digit phone number, for example 08031234567" {...field('phone')} /></label>
                <label>Email<input type="email" autoComplete="email" maxLength={120} pattern="[A-Za-z0-9._%+\-]+@([A-Za-z0-9\-]+\.)+[A-Za-z]{2,}" title="A full email address, for example name@gmail.com" {...field('email')} /></label>
                {error && <p className={s.error} role="alert">{error}</p>}
                <button className={s.btn} disabled={busy}>{busy ? 'Opening payment…' : `Pay ${naira(booksTotal)}`}</button>
                <p className={s.note}>You pay on the next page. The payment service adds its small charge there.</p>
              </>
            )}
          </form>
        </div>
      </main>
      {count > 0 && <a className={s.bar} href="#bag">View bag · {plural(count)} · {naira(booksTotal)}</a>}
    </div>
  )
}

// The page is saved ahead of time like the homepage; copies left are refreshed in the browser
export async function getStaticProps() {
  return { props: { books: await fetchBooks().catch(() => []) }, revalidate: 60 }
}
