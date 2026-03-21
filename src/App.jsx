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
