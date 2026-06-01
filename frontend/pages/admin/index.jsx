import { useState } from 'react'
import { useRouter } from 'next/router'
import { login } from '../../lib/api'
import styles from '../../styles/Admin.module.css'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(password)
      router.push('/admin/dashboard')
    } catch (err) {
      setError('Wrong password. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Info Desk <span>Hub</span></h1>
        <p className={styles.loginSub}>Admin access</p>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <input
            type="password"
            className={styles.loginInput}
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className={styles.loginError}>{error}</p>}
          <button
            type="submit"
            className={styles.loginBtn}
            disabled={loading || !password}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <a href="/" className={styles.backLink}>← Back to directory</a>
      </div>
    </div>
  )
}
