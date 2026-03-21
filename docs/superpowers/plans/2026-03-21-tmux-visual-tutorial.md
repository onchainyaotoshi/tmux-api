# Tmux Visual Tutorial Website — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page interactive tmux tutorial website in React+Vite, dockerized on port 9997, with visual diagrams, cheatsheets, and terminal simulations — all in Bahasa Indonesia.

**Architecture:** React SPA built with Vite, served by Nginx in a Docker container. Single scrollable page with fixed sidebar navigation and 6 tutorial sections covering core tmux features. Each section contains explanatory text, SVG diagrams, shortcut cheatsheets, and CSS-animated terminal simulations.

**Tech Stack:** React 18, Vite 5, CSS Modules, Docker (multi-stage: node:alpine + nginx:alpine)

---

## File Structure

```
tmux-management/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.module.css
│   ├── index.css                    # Global styles (reset, fonts, variables)
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Sidebar.module.css
│   │   ├── Section.jsx
│   │   ├── Section.module.css
│   │   ├── TerminalSimulator.jsx
│   │   ├── TerminalSimulator.module.css
│   │   ├── ShortcutTable.jsx
│   │   └── ShortcutTable.module.css
│   └── sections/
│       ├── SessionSection.jsx
│       ├── WindowSection.jsx
│       ├── PaneSection.jsx
│       ├── NavigationSection.jsx
│       ├── ResizeSection.jsx
│       └── CopyModeSection.jsx
└── public/
```

**Notes:**
- CSS Modules co-located with their components (`.module.css` next to `.jsx`)
- `ShortcutTable` replaces `DiagramPane` — more useful as a reusable cheatsheet table component; SVG diagrams are inlined per-section where needed
- `nginx.conf` lives at project root, copied into container during build

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/index.css`
- Create: `src/App.module.css`

- [ ] **Step 1: Initialize project with Vite**

```bash
cd /home/claude/devops/tmux-management
npm create vite@latest . -- --template react
```

Select: React, JavaScript

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Clean up default Vite files**

Remove default Vite boilerplate content from `src/App.jsx`, `src/App.css`, `src/index.css`. Delete `src/assets/` directory and any default SVG logos.

- [ ] **Step 4: Create global styles `src/index.css`**

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-terminal: #0d1117;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #00ff41;
  --accent-dim: #00cc33;
  --border: #2a2a4a;
  --sidebar-width: 260px;
  --font-mono: 'Courier New', Courier, monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 20px;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}
```

- [ ] **Step 5: Create `src/App.module.css`**

```css
.layout {
  display: flex;
  min-height: 100vh;
}

.main {
  margin-left: var(--sidebar-width);
  flex: 1;
  padding: 40px 60px;
  max-width: 900px;
}

.header {
  text-align: center;
  margin-bottom: 60px;
}

.header h1 {
  font-size: 2.5rem;
  color: var(--accent);
  font-family: var(--font-mono);
  margin-bottom: 12px;
}

.header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .main {
    margin-left: 0;
    padding: 20px;
  }
}
```

- [ ] **Step 6: Create `src/App.jsx`**

```jsx
import styles from './App.module.css';

const sections = [
  { id: 'session', title: 'Session' },
  { id: 'window', title: 'Window' },
  { id: 'pane', title: 'Pane' },
  { id: 'navigasi', title: 'Navigasi' },
  { id: 'resize', title: 'Resize' },
  { id: 'copy-mode', title: 'Copy Mode' },
];

function App() {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Tmux Tutorial</h1>
          <p>Panduan visual interaktif untuk menguasai tmux</p>
        </div>
        <p>Sections coming soon...</p>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Verify dev server runs**

```bash
npm run dev -- --port 5173
```

Open browser, confirm dark-themed page with "Tmux Tutorial" header renders.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/
git commit -m "feat: scaffold React+Vite project with global styles"
```

---

### Task 2: Sidebar Component with Scroll-Spy

**Files:**
- Create: `src/components/Sidebar.jsx`
- Create: `src/components/Sidebar.module.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/components/Sidebar.module.css`**

```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 30px 0;
  overflow-y: auto;
  z-index: 100;
}

.logo {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 1.3rem;
  padding: 0 24px 24px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.nav {
  list-style: none;
}

.navItem {
  display: block;
  padding: 10px 24px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.navItem:hover {
  color: var(--text-primary);
  background-color: rgba(0, 255, 65, 0.05);
}

.navItemActive {
  color: var(--accent);
  border-left-color: var(--accent);
  background-color: rgba(0, 255, 65, 0.08);
}

.hamburger {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 200;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 1.5rem;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
}

.overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebarOpen {
    transform: translateX(0);
  }

  .hamburger {
    display: block;
  }

  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 50;
  }
}
```

- [ ] **Step 2: Create `src/components/Sidebar.jsx`**

```jsx
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
```

- [ ] **Step 3: Integrate Sidebar into `src/App.jsx`**

Add `import Sidebar from './components/Sidebar';` and render `<Sidebar sections={sections} />` inside the layout div, before `<main>`.

- [ ] **Step 4: Verify sidebar renders with scroll-spy**

Run dev server. Confirm sidebar appears on left, links are listed, hamburger shows on narrow viewport.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.jsx src/components/Sidebar.module.css src/App.jsx
git commit -m "feat: add Sidebar component with scroll-spy and mobile hamburger"
```

---

### Task 3: Section Wrapper & ShortcutTable Components

**Files:**
- Create: `src/components/Section.jsx`
- Create: `src/components/Section.module.css`
- Create: `src/components/ShortcutTable.jsx`
- Create: `src/components/ShortcutTable.module.css`

- [ ] **Step 1: Create `src/components/Section.module.css`**

```css
.section {
  margin-bottom: 80px;
  scroll-margin-top: 20px;
}

.title {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 1.8rem;
  margin-bottom: 8px;
}

.description {
  color: var(--text-secondary);
  font-size: 1.05rem;
  margin-bottom: 28px;
  line-height: 1.7;
}
```

- [ ] **Step 2: Create `src/components/Section.jsx`**

```jsx
import styles from './Section.module.css';

export default function Section({ id, title, description, children }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {children}
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/ShortcutTable.module.css`**

```css
.table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 0.95rem;
}

.table th {
  text-align: left;
  padding: 10px 14px;
  background-color: var(--bg-secondary);
  color: var(--accent);
  border-bottom: 2px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-transform: uppercase;
}

.table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

.key {
  font-family: var(--font-mono);
  background-color: var(--bg-terminal);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
  white-space: nowrap;
}

.desc {
  color: var(--text-secondary);
}
```

- [ ] **Step 4: Create `src/components/ShortcutTable.jsx`**

```jsx
import styles from './ShortcutTable.module.css';

export default function ShortcutTable({ shortcuts }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Shortcut</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        {shortcuts.map(({ key, description }, i) => (
          <tr key={i}>
            <td><code className={styles.key}>{key}</code></td>
            <td className={styles.desc}>{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Verify components render**

Import Section and ShortcutTable in App.jsx. Add one test section with dummy data. Confirm styling.

- [ ] **Step 6: Commit**

```bash
git add src/components/Section.* src/components/ShortcutTable.*
git commit -m "feat: add Section wrapper and ShortcutTable components"
```

---

### Task 4: TerminalSimulator Component

**Files:**
- Create: `src/components/TerminalSimulator.jsx`
- Create: `src/components/TerminalSimulator.module.css`

- [ ] **Step 1: Create `src/components/TerminalSimulator.module.css`**

```css
.terminal {
  background-color: var(--bg-terminal);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.titleBar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #161b22;
  border-bottom: 1px solid var(--border);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dotRed { background: #ff5f56; }
.dotYellow { background: #ffbd2e; }
.dotGreen { background: #27c93f; }

.titleText {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-left: 8px;
}

.body {
  padding: 16px;
  min-height: 200px;
  position: relative;
}

.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.btn {
  background-color: var(--bg-secondary);
  color: var(--accent);
  border: 1px solid var(--border);
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: rgba(0, 255, 65, 0.1);
  border-color: var(--accent);
}

.btnActive {
  background-color: rgba(0, 255, 65, 0.15);
  border-color: var(--accent);
}

.display {
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.paneContainer {
  display: flex;
  height: 180px;
  transition: all 0.3s ease;
}

.paneContainerVertical {
  flex-direction: column;
}

.pane {
  flex: 1;
  padding: 10px;
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: 1px solid var(--border);
  font-size: 0.8rem;
}

.paneActive {
  border-color: var(--accent);
  background-color: rgba(0, 255, 65, 0.05);
}

.output {
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.5;
}

.prompt {
  color: var(--accent);
}

.statusBar {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px;
  background-color: var(--accent-dim);
  color: #000;
  font-size: 0.75rem;
  margin-top: 8px;
  border-radius: 0 0 4px 4px;
}
```

- [ ] **Step 2: Create `src/components/TerminalSimulator.jsx`**

```jsx
import { useState } from 'react';
import styles from './TerminalSimulator.module.css';

export default function TerminalSimulator({ title, steps }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];

  return (
    <div className={styles.terminal}>
      <div className={styles.titleBar}>
        <span className={`${styles.dot} ${styles.dotRed}`} />
        <span className={`${styles.dot} ${styles.dotYellow}`} />
        <span className={`${styles.dot} ${styles.dotGreen}`} />
        <span className={styles.titleText}>{title}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.controls}>
          {steps.map((s, i) => (
            <button
              key={i}
              className={`${styles.btn} ${i === currentStep ? styles.btnActive : ''}`}
              onClick={() => setCurrentStep(i)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.display}>
          {step.render()}
        </div>
        {step.statusBar && (
          <div className={styles.statusBar}>
            <span>{step.statusBar.left}</span>
            <span>{step.statusBar.right}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

The `steps` prop is an array of `{ label, render, statusBar? }`. Each section defines its own steps with custom render functions for maximum flexibility (pane splits, window tabs, output text, etc.).

- [ ] **Step 3: Verify TerminalSimulator renders**

Import into App.jsx with a test steps array. Confirm title bar, buttons, and display area render. Click buttons to switch steps.

- [ ] **Step 4: Commit**

```bash
git add src/components/TerminalSimulator.*
git commit -m "feat: add TerminalSimulator component with step-based interaction"
```

---

### Task 5: Session Section

**Files:**
- Create: `src/sections/SessionSection.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/sections/SessionSection.jsx`**

```jsx
import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/TerminalSimulator.module.css';

const shortcuts = [
  { key: 'tmux new -s nama', description: 'Buat session baru dengan nama' },
  { key: 'tmux ls', description: 'Lihat daftar session' },
  { key: 'tmux attach -t nama', description: 'Masuk ke session yang ada' },
  { key: 'Ctrl+B d', description: 'Detach dari session aktif' },
  { key: 'tmux kill-session -t nama', description: 'Hapus session' },
];

const steps = [
  {
    label: 'Buat Session',
    render: () => (
      <div className={ts.output}>
        <span className={ts.prompt}>$ </span>tmux new -s kerja{'\n'}
        <span style={{ color: '#666' }}># Session "kerja" dibuat. Anda masuk ke dalamnya.</span>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:04' },
  },
  {
    label: 'List Session',
    render: () => (
      <div className={ts.output}>
        <span className={ts.prompt}>$ </span>tmux ls{'\n'}
        kerja: 1 windows (created Fri Mar 21 10:00:00 2026){'\n'}
        dev: 2 windows (created Fri Mar 21 09:30:00 2026)
      </div>
    ),
  },
  {
    label: 'Detach',
    render: () => (
      <div className={ts.output}>
        <span style={{ color: '#666' }}># Di dalam tmux, tekan:</span>{'\n'}
        <span className={ts.prompt}>Ctrl+B </span>lalu <span className={ts.prompt}>d</span>{'\n\n'}
        [detached (from session kerja)]
      </div>
    ),
  },
  {
    label: 'Attach',
    render: () => (
      <div className={ts.output}>
        <span className={ts.prompt}>$ </span>tmux attach -t kerja{'\n'}
        <span style={{ color: '#666' }}># Kembali masuk ke session "kerja"</span>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:05' },
  },
  {
    label: 'Kill Session',
    render: () => (
      <div className={ts.output}>
        <span className={ts.prompt}>$ </span>tmux kill-session -t dev{'\n'}
        <span className={ts.prompt}>$ </span>tmux ls{'\n'}
        kerja: 1 windows (created Fri Mar 21 10:00:00 2026)
      </div>
    ),
  },
];

export default function SessionSection() {
  return (
    <Section
      id="session"
      title="Session"
      description="Session adalah unit utama di tmux. Satu session bisa berisi banyak window. Session tetap berjalan di background meskipun kamu sudah keluar dari terminal."
    >
      <ShortcutTable shortcuts={shortcuts} />
      <TerminalSimulator title="Session Management" steps={steps} />
    </Section>
  );
}
```

- [ ] **Step 2: Add SessionSection to `src/App.jsx`**

Import `SessionSection` and render it in main content area, replacing placeholder text.

- [ ] **Step 3: Verify SessionSection renders**

Run dev server. Confirm section shows with title, description, shortcut table, and interactive terminal simulator with all 5 buttons working.

- [ ] **Step 4: Commit**

```bash
git add src/sections/SessionSection.jsx src/App.jsx
git commit -m "feat: add Session tutorial section"
```

---

### Task 6: Window Section

**Files:**
- Create: `src/sections/WindowSection.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/sections/WindowSection.jsx`**

```jsx
import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/TerminalSimulator.module.css';

const shortcuts = [
  { key: 'Ctrl+B c', description: 'Buat window baru' },
  { key: 'Ctrl+B ,', description: 'Rename window aktif' },
  { key: 'Ctrl+B n', description: 'Pindah ke window berikutnya' },
  { key: 'Ctrl+B p', description: 'Pindah ke window sebelumnya' },
  { key: 'Ctrl+B 0-9', description: 'Pindah ke window nomor tertentu' },
  { key: 'Ctrl+B &', description: 'Tutup window aktif' },
];

function WindowTabs({ windows, active }) {
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
      {windows.map((w, i) => (
        <div
          key={i}
          style={{
            padding: '4px 12px',
            background: i === active ? 'rgba(0,255,65,0.15)' : 'transparent',
            color: i === active ? '#00ff41' : '#666',
            borderBottom: i === active ? '2px solid #00ff41' : '2px solid transparent',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
          }}
        >
          {i}:{w}{i === active ? '*' : ''}
        </div>
      ))}
    </div>
  );
}

const steps = [
  {
    label: 'Buat Window',
    render: () => (
      <div>
        <WindowTabs windows={['bash', 'bash']} active={1} />
        <div className={ts.output}>
          <span style={{ color: '#666' }}># Ctrl+B c → window baru terbuat</span>{'\n'}
          <span className={ts.prompt}>$ </span>▊
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash- 1:bash*', right: '"hostname" 15:10' },
  },
  {
    label: 'Rename',
    render: () => (
      <div>
        <WindowTabs windows={['editor', 'bash']} active={0} />
        <div className={ts.output}>
          <span style={{ color: '#666' }}># Ctrl+B , → ketik nama baru → Enter</span>{'\n'}
          <span className={ts.prompt}>$ </span>vim app.js
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:editor* 1:bash-', right: '"hostname" 15:11' },
  },
  {
    label: 'Switch',
    render: () => (
      <div>
        <WindowTabs windows={['editor', 'bash', 'logs']} active={2} />
        <div className={ts.output}>
          <span style={{ color: '#666' }}># Ctrl+B n/p atau Ctrl+B 0-9</span>{'\n'}
          <span className={ts.prompt}>$ </span>tail -f /var/log/syslog
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:editor 1:bash 2:logs*', right: '"hostname" 15:12' },
  },
  {
    label: 'Tutup',
    render: () => (
      <div>
        <WindowTabs windows={['editor', 'bash']} active={1} />
        <div className={ts.output}>
          <span style={{ color: '#666' }}># Ctrl+B & → konfirmasi "y" → window ditutup</span>{'\n'}
          <span className={ts.prompt}>$ </span>▊
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:editor 1:bash*', right: '"hostname" 15:13' },
  },
];

export default function WindowSection() {
  return (
    <Section
      id="window"
      title="Window"
      description="Window seperti tab di browser. Satu session bisa punya banyak window, dan setiap window menampilkan satu layar terminal penuh."
    >
      <ShortcutTable shortcuts={shortcuts} />
      <TerminalSimulator title="Window Management" steps={steps} />
    </Section>
  );
}
```

- [ ] **Step 2: Add WindowSection to `src/App.jsx`**

Import and render `WindowSection` after `SessionSection`.

- [ ] **Step 3: Verify WindowSection renders**

Confirm window tabs visual, button switching, and status bar updates.

- [ ] **Step 4: Commit**

```bash
git add src/sections/WindowSection.jsx src/App.jsx
git commit -m "feat: add Window tutorial section"
```

---

### Task 7: Pane Section

**Files:**
- Create: `src/sections/PaneSection.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/sections/PaneSection.jsx`**

```jsx
import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/TerminalSimulator.module.css';

const shortcuts = [
  { key: 'Ctrl+B %', description: 'Split pane secara vertikal (kiri-kanan)' },
  { key: 'Ctrl+B "', description: 'Split pane secara horizontal (atas-bawah)' },
  { key: 'Ctrl+B x', description: 'Tutup pane aktif' },
];

const steps = [
  {
    label: 'Satu Pane',
    render: () => (
      <div className={ts.paneContainer}>
        <div className={`${ts.pane} ${ts.paneActive}`}>
          <span>pane 0 (aktif)</span>
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:20' },
  },
  {
    label: 'Split Vertikal',
    render: () => (
      <div className={ts.paneContainer}>
        <div className={ts.pane}>pane 0</div>
        <div className={`${ts.pane} ${ts.paneActive}`}>pane 1 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:21' },
  },
  {
    label: 'Split Horizontal',
    render: () => (
      <div className={`${ts.paneContainer} ${ts.paneContainerVertical}`}>
        <div className={ts.pane}>pane 0</div>
        <div className={`${ts.pane} ${ts.paneActive}`}>pane 1 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:22' },
  },
  {
    label: 'Multi Split',
    render: () => (
      <div className={`${ts.paneContainer} ${ts.paneContainerVertical}`}>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={ts.pane}>pane 0</div>
          <div className={`${ts.pane} ${ts.paneActive}`}>pane 1 (aktif)</div>
        </div>
        <div className={ts.pane}>pane 2</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:23' },
  },
  {
    label: 'Tutup Pane',
    render: () => (
      <div className={ts.paneContainer}>
        <div className={`${ts.pane} ${ts.paneActive}`}>
          <span>pane 0 (aktif)</span>
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:24' },
  },
];

export default function PaneSection() {
  return (
    <Section
      id="pane"
      title="Pane"
      description="Pane membagi satu window menjadi beberapa area. Kamu bisa split secara vertikal (kiri-kanan) atau horizontal (atas-bawah), sehingga bisa menjalankan beberapa perintah sekaligus dalam satu layar."
    >
      <ShortcutTable shortcuts={shortcuts} />
      <TerminalSimulator title="Pane Splitting" steps={steps} />
    </Section>
  );
}
```

- [ ] **Step 2: Add PaneSection to `src/App.jsx`**

Import and render after `WindowSection`.

- [ ] **Step 3: Verify pane visual splitting animations work**

- [ ] **Step 4: Commit**

```bash
git add src/sections/PaneSection.jsx src/App.jsx
git commit -m "feat: add Pane tutorial section with split visualizations"
```

---

### Task 8: Navigation Section

**Files:**
- Create: `src/sections/NavigationSection.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/sections/NavigationSection.jsx`**

```jsx
import { useState } from 'react';
import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/TerminalSimulator.module.css';

const shortcuts = [
  { key: 'Ctrl+B ↑↓←→', description: 'Pindah antar pane dengan arrow keys' },
  { key: 'Ctrl+B q', description: 'Tampilkan nomor pane, tekan angka untuk pindah' },
  { key: 'Ctrl+B o', description: 'Pindah ke pane berikutnya' },
  { key: 'Ctrl+B ;', description: 'Pindah ke pane terakhir yang aktif' },
  { key: 'Ctrl+B n', description: 'Pindah ke window berikutnya' },
  { key: 'Ctrl+B p', description: 'Pindah ke window sebelumnya' },
  { key: 'Ctrl+B w', description: 'Pilih window dari daftar interaktif' },
  { key: 'Ctrl+B s', description: 'Pilih session dari daftar interaktif' },
];

function PaneGrid({ activeIndex }) {
  const panes = ['vim app.js', 'npm run dev', 'git log', 'htop'];
  return (
    <div className={`${ts.paneContainer} ${ts.paneContainerVertical}`} style={{ height: '160px' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        <div className={`${ts.pane} ${activeIndex === 0 ? ts.paneActive : ''}`}>{panes[0]}</div>
        <div className={`${ts.pane} ${activeIndex === 1 ? ts.paneActive : ''}`}>{panes[1]}</div>
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <div className={`${ts.pane} ${activeIndex === 2 ? ts.paneActive : ''}`}>{panes[2]}</div>
        <div className={`${ts.pane} ${activeIndex === 3 ? ts.paneActive : ''}`}>{panes[3]}</div>
      </div>
    </div>
  );
}

const steps = [
  {
    label: '← Kiri',
    render: () => <PaneGrid activeIndex={0} />,
    statusBar: { left: '[kerja] 0:bash*', right: 'Pane 0 aktif' },
  },
  {
    label: '→ Kanan',
    render: () => <PaneGrid activeIndex={1} />,
    statusBar: { left: '[kerja] 0:bash*', right: 'Pane 1 aktif' },
  },
  {
    label: '↓ Bawah',
    render: () => <PaneGrid activeIndex={3} />,
    statusBar: { left: '[kerja] 0:bash*', right: 'Pane 3 aktif' },
  },
  {
    label: 'Ctrl+B q',
    render: () => (
      <div className={`${ts.paneContainer} ${ts.paneContainerVertical}`} style={{ height: '160px' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={ts.pane}><span style={{ fontSize: '2rem', color: '#00ff41' }}>0</span></div>
          <div className={ts.pane}><span style={{ fontSize: '2rem', color: '#00ff41' }}>1</span></div>
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={ts.pane}><span style={{ fontSize: '2rem', color: '#00ff41' }}>2</span></div>
          <div className={ts.pane}><span style={{ fontSize: '2rem', color: '#00ff41' }}>3</span></div>
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: 'Tekan angka untuk pindah' },
  },
];

export default function NavigationSection() {
  return (
    <Section
      id="navigasi"
      title="Navigasi"
      description="Berpindah antar pane, window, dan session dengan cepat menggunakan shortcut keyboard. Navigasi yang efisien adalah kunci produktivitas di tmux."
    >
      <ShortcutTable shortcuts={shortcuts} />
      <TerminalSimulator title="Navigasi Pane" steps={steps} />
    </Section>
  );
}
```

- [ ] **Step 2: Add NavigationSection to `src/App.jsx`**

- [ ] **Step 3: Verify navigation demo with pane highlighting**

- [ ] **Step 4: Commit**

```bash
git add src/sections/NavigationSection.jsx src/App.jsx
git commit -m "feat: add Navigation tutorial section"
```

---

### Task 9: Resize Section

**Files:**
- Create: `src/sections/ResizeSection.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/sections/ResizeSection.jsx`**

```jsx
import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/TerminalSimulator.module.css';

const shortcuts = [
  { key: 'Ctrl+B Ctrl+↑', description: 'Perbesar pane ke atas' },
  { key: 'Ctrl+B Ctrl+↓', description: 'Perbesar pane ke bawah' },
  { key: 'Ctrl+B Ctrl+←', description: 'Perbesar pane ke kiri' },
  { key: 'Ctrl+B Ctrl+→', description: 'Perbesar pane ke kanan' },
  { key: 'Ctrl+B z', description: 'Zoom/unzoom pane (fullscreen toggle)' },
  { key: 'Ctrl+B Space', description: 'Ganti layout otomatis' },
];

const steps = [
  {
    label: 'Default',
    render: () => (
      <div className={ts.paneContainer} style={{ height: '150px' }}>
        <div className={`${ts.pane} ${ts.paneActive}`} style={{ flex: 1 }}>pane 0</div>
        <div className={ts.pane} style={{ flex: 1 }}>pane 1</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '50% | 50%' },
  },
  {
    label: 'Resize →',
    render: () => (
      <div className={ts.paneContainer} style={{ height: '150px' }}>
        <div className={`${ts.pane} ${ts.paneActive}`} style={{ flex: 2 }}>pane 0 (lebih lebar)</div>
        <div className={ts.pane} style={{ flex: 1 }}>pane 1</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '67% | 33%' },
  },
  {
    label: 'Resize ←',
    render: () => (
      <div className={ts.paneContainer} style={{ height: '150px' }}>
        <div className={`${ts.pane} ${ts.paneActive}`} style={{ flex: 1 }}>pane 0</div>
        <div className={ts.pane} style={{ flex: 2 }}>pane 1 (lebih lebar)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '33% | 67%' },
  },
  {
    label: 'Zoom (z)',
    render: () => (
      <div className={ts.paneContainer} style={{ height: '150px' }}>
        <div className={`${ts.pane} ${ts.paneActive}`} style={{ flex: 1 }}>
          pane 0 (ZOOMED - fullscreen)
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash* (zoomed)', right: '100%' },
  },
];

export default function ResizeSection() {
  return (
    <Section
      id="resize"
      title="Resize"
      description="Ubah ukuran pane sesuai kebutuhan. Gunakan Ctrl+arrow untuk resize manual, atau zoom untuk fokus di satu pane secara fullscreen."
    >
      <ShortcutTable shortcuts={shortcuts} />
      <TerminalSimulator title="Resize Pane" steps={steps} />
    </Section>
  );
}
```

- [ ] **Step 2: Add ResizeSection to `src/App.jsx`**

- [ ] **Step 3: Verify resize flex animations**

- [ ] **Step 4: Commit**

```bash
git add src/sections/ResizeSection.jsx src/App.jsx
git commit -m "feat: add Resize tutorial section"
```

---

### Task 10: Copy Mode Section

**Files:**
- Create: `src/sections/CopyModeSection.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/sections/CopyModeSection.jsx`**

```jsx
import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/TerminalSimulator.module.css';

const shortcuts = [
  { key: 'Ctrl+B [', description: 'Masuk ke copy mode' },
  { key: '↑↓←→', description: 'Navigasi dalam copy mode' },
  { key: 'Space', description: 'Mulai seleksi teks' },
  { key: 'Enter', description: 'Copy teks yang diseleksi' },
  { key: 'Ctrl+B ]', description: 'Paste teks yang sudah di-copy' },
  { key: 'q', description: 'Keluar dari copy mode' },
  { key: '/', description: 'Cari teks ke bawah' },
  { key: '?', description: 'Cari teks ke atas' },
  { key: 'g', description: 'Pergi ke baris paling atas' },
  { key: 'G', description: 'Pergi ke baris paling bawah' },
];

const logLines = [
  '[10:01] Server started on port 3000',
  '[10:02] Connected to database',
  '[10:03] GET /api/users 200 12ms',
  '[10:04] POST /api/login 200 45ms',
  '[10:05] GET /api/dashboard 200 23ms',
  '[10:06] WebSocket connection established',
  '[10:07] GET /api/users/42 200 8ms',
  '[10:08] Cache miss: dashboard_stats',
  '[10:09] GET /api/stats 200 156ms',
  '[10:10] Scheduled job: cleanup completed',
];

const steps = [
  {
    label: 'Normal Mode',
    render: () => (
      <div className={ts.output} style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <span className={ts.prompt}>$ </span>▊
      </div>
    ),
  },
  {
    label: 'Copy Mode',
    render: () => (
      <div className={ts.output} style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i} style={i === 4 ? { backgroundColor: 'rgba(0,255,65,0.2)' } : {}}>
            {i === 4 && <span style={{ color: '#00ff41' }}>▶ </span>}
            {line}
          </div>
        ))}
      </div>
    ),
    statusBar: { left: '[0/10]', right: 'Copy mode - ↑↓ untuk scroll' },
  },
  {
    label: 'Seleksi',
    render: () => (
      <div className={ts.output} style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div
            key={i}
            style={
              i >= 3 && i <= 5
                ? { backgroundColor: 'rgba(0,255,65,0.3)', color: '#00ff41' }
                : {}
            }
          >
            {line}
          </div>
        ))}
      </div>
    ),
    statusBar: { left: '[3 lines selected]', right: 'Enter untuk copy' },
  },
  {
    label: 'Paste',
    render: () => (
      <div className={ts.output} style={{ height: '160px', overflow: 'hidden' }}>
        <span className={ts.prompt}>$ </span>▊{'\n'}
        <span style={{ color: '#666' }}># Ctrl+B ] → teks di-paste:</span>{'\n'}
        <span style={{ color: '#00ff41' }}>[10:04] POST /api/login 200 45ms</span>{'\n'}
        <span style={{ color: '#00ff41' }}>[10:05] GET /api/dashboard 200 23ms</span>{'\n'}
        <span style={{ color: '#00ff41' }}>[10:06] WebSocket connection established</span>
      </div>
    ),
  },
  {
    label: 'Search (/)',
    render: () => (
      <div className={ts.output} style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i}>
            {line.includes('WebSocket') ? (
              <span>
                [10:06] <span style={{ backgroundColor: '#00ff41', color: '#000', padding: '0 2px' }}>WebSocket</span> connection established
              </span>
            ) : (
              line
            )}
          </div>
        ))}
      </div>
    ),
    statusBar: { left: 'Search: WebSocket', right: '1 match found' },
  },
];

export default function CopyModeSection() {
  return (
    <Section
      id="copy-mode"
      title="Copy Mode"
      description="Copy mode memungkinkan kamu scroll ke atas, mencari teks, menyeleksi, dan meng-copy output terminal. Sangat berguna untuk menyalin log atau output perintah yang panjang."
    >
      <ShortcutTable shortcuts={shortcuts} />
      <TerminalSimulator title="Copy Mode" steps={steps} />
    </Section>
  );
}
```

- [ ] **Step 2: Add CopyModeSection to `src/App.jsx`**

- [ ] **Step 3: Verify copy mode demo with selection highlighting and search**

- [ ] **Step 4: Commit**

```bash
git add src/sections/CopyModeSection.jsx src/App.jsx
git commit -m "feat: add Copy Mode tutorial section"
```

---

### Task 11: Final App.jsx Assembly

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Ensure `src/App.jsx` imports and renders all sections in order**

```jsx
import Sidebar from './components/Sidebar';
import SessionSection from './sections/SessionSection';
import WindowSection from './sections/WindowSection';
import PaneSection from './sections/PaneSection';
import NavigationSection from './sections/NavigationSection';
import ResizeSection from './sections/ResizeSection';
import CopyModeSection from './sections/CopyModeSection';
import styles from './App.module.css';

const sections = [
  { id: 'session', title: 'Session' },
  { id: 'window', title: 'Window' },
  { id: 'pane', title: 'Pane' },
  { id: 'navigasi', title: 'Navigasi' },
  { id: 'resize', title: 'Resize' },
  { id: 'copy-mode', title: 'Copy Mode' },
];

function App() {
  return (
    <div className={styles.layout}>
      <Sidebar sections={sections} />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Tmux Tutorial</h1>
          <p>Panduan visual interaktif untuk menguasai tmux</p>
        </div>
        <SessionSection />
        <WindowSection />
        <PaneSection />
        <NavigationSection />
        <ResizeSection />
        <CopyModeSection />
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify complete page renders with all 6 sections and sidebar scroll-spy**

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: assemble all sections in App.jsx"
```

---

### Task 12: Docker Setup

**Files:**
- Create: `nginx.conf`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

- [ ] **Step 1: Create `nginx.conf`**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
dist
.git
docs
```

- [ ] **Step 3: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Create `docker-compose.yml`**

```yaml
services:
  tmux-tutorial:
    build: .
    ports:
      - "9997:80"
    restart: unless-stopped
```

- [ ] **Step 5: Build and run**

```bash
docker compose up -d --build
```

- [ ] **Step 6: Verify website at http://localhost:9997**

Open browser, confirm full site loads with all sections, sidebar, and interactive elements.

- [ ] **Step 7: Commit**

```bash
git add nginx.conf Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add Docker setup with nginx serving on port 9997"
```

---
