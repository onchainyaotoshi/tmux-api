import { Navigate } from 'react-router-dom'
import { auth } from '../lib/auth.js'
import styles from './HomePage.module.css'

export default function HomePage() {
  if (auth.isAuthenticated()) {
    return <Navigate to="/sessions" replace />
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Foreman</h1>
      <p className={styles.subtitle}>Tmux REST API & workforce manager</p>
      <button className={styles.loginBtn} onClick={() => auth.login()}>
        Login
      </button>
    </div>
  )
}
