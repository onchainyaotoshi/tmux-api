import Section from '../components/Section';
import ShortcutTable from '../components/ShortcutTable';
import TerminalSimulator from '../components/TerminalSimulator';
import ts from '../components/terminal-styles.js';

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
            {i === 4 && <span className="text-primary">▶ </span>}
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
        <span className="text-muted-foreground"># Ctrl+B ] → teks di-paste:</span>{'\n'}
        <span className="text-primary">[10:04] POST /api/login 200 45ms</span>{'\n'}
        <span className="text-primary">[10:05] GET /api/dashboard 200 23ms</span>{'\n'}
        <span className="text-primary">[10:06] WebSocket connection established</span>
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
