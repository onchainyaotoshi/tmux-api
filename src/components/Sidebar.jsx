import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar({ sections }) {
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = () => setIsOpen(false);

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
        <div className={styles.logo}>$ tmux</div>
        <ul className={styles.nav}>
          {sections.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`${styles.navItem} ${activeId === id ? styles.navItemActive : ''}`}
                onClick={handleClick}
              >
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
