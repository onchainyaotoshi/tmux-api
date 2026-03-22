import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/terminal-styles.js';

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
