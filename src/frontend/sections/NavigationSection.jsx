import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/terminal-styles.js';

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
          <div className={ts.pane}><span style={{ fontSize: '2rem' }} className="text-primary">0</span></div>
          <div className={ts.pane}><span style={{ fontSize: '2rem' }} className="text-primary">1</span></div>
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={ts.pane}><span style={{ fontSize: '2rem' }} className="text-primary">2</span></div>
          <div className={ts.pane}><span style={{ fontSize: '2rem' }} className="text-primary">3</span></div>
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
