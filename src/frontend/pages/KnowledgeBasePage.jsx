import SessionSection from '../sections/SessionSection.jsx'
import WindowSection from '../sections/WindowSection.jsx'
import PaneSection from '../sections/PaneSection.jsx'
import NavigationSection from '../sections/NavigationSection.jsx'
import ResizeSection from '../sections/ResizeSection.jsx'
import CopyModeSection from '../sections/CopyModeSection.jsx'

const sections = [
  { id: 'session', title: 'Session' },
  { id: 'window', title: 'Window' },
  { id: 'pane', title: 'Pane' },
  { id: 'navigasi', title: 'Navigasi' },
  { id: 'resize', title: 'Resize' },
  { id: 'copy-mode', title: 'Copy Mode' },
]

export default function KnowledgeBasePage() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '8px' }}>
          Tmux Knowledge Base
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Visual tutorial untuk orchestrasi terminal
        </p>
      </div>
      <nav style={{ marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {sections.map(({ id, title }) => (
          <a
            key={id}
            href={`#${id}`}
            style={{
              color: 'var(--accent-dim)',
              textDecoration: 'none',
              padding: '4px 12px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontSize: '0.85rem',
            }}
          >
            {title}
          </a>
        ))}
      </nav>
      <SessionSection />
      <WindowSection />
      <PaneSection />
      <NavigationSection />
      <ResizeSection />
      <CopyModeSection />
    </>
  )
}
