import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/terminal-styles.js';

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
