import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { auth } from '../lib/auth.js'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const user = auth.getUser()

  const handleClick = () => setIsOpen(false)

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}
      <nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>$ foreman</div>

        <div className={styles.groupLabel}>Dashboard</div>
        <ul className={styles.nav}>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={handleClick}
            >
              Sessions
            </NavLink>
          </li>
        </ul>

        <div className={styles.groupLabel}>Resources</div>
        <ul className={styles.nav}>
          <li>
            <NavLink
              to="/knowledge-base"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={handleClick}
            >
              Knowledge Base
            </NavLink>
          </li>
          <li>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navItem}
            >
              API Docs ↗
            </a>
          </li>
        </ul>

        <div className={styles.bottom}>
          {user && (
            <div className={styles.userInfo}>{user.email}</div>
          )}
          <button className={styles.logoutBtn} onClick={() => auth.logout()}>
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}
