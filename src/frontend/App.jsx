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
          <h1>Foreman</h1>
          <p>Tmux REST API & visual tutorial untuk orchestrasi terminal</p>
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
