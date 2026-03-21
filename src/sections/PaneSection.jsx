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
