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
