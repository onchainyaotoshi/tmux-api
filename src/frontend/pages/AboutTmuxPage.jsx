import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* ── Helper Components ─────────────────────────────────────────── */

function SectionCard({ id, title, description, children }) {
  return (
    <Card id={id} className="mb-12 scroll-mt-5 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}

function ShortcutTable({ shortcuts }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Shortcut</TableHead>
            <TableHead>Keterangan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shortcuts.map(({ key, description }) => (
            <TableRow key={key}>
              <TableCell className="font-mono text-sm text-primary">{key}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TerminalDemo({ title, steps }) {
  const [activeStep, setActiveStep] = useState(0)
  const current = steps[activeStep]

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2">
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-red-500/70" />
          <span className="size-3 rounded-full bg-yellow-500/70" />
          <span className="size-3 rounded-full bg-green-500/70" />
        </div>
        <span className="ml-2 text-xs text-muted-foreground">{title}</span>
      </div>

      {/* Step buttons */}
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/50 px-3 py-2">
        {steps.map((step, i) => (
          <Button
            key={i}
            variant={i === activeStep ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setActiveStep(i)}
          >
            {step.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-background p-4 font-mono text-sm min-h-[180px]">
        {current.render()}
      </div>

      {/* Status bar */}
      {current.statusBar && (
        <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-1 text-xs text-muted-foreground">
          <span>{current.statusBar.left}</span>
          <span>{current.statusBar.right}</span>
        </div>
      )}
    </div>
  )
}

/* ── Section 1: Session ────────────────────────────────────────── */

const sessionShortcuts = [
  { key: 'tmux new -s nama', description: 'Buat session baru dengan nama' },
  { key: 'tmux ls', description: 'Lihat daftar session' },
  { key: 'tmux attach -t nama', description: 'Masuk ke session yang ada' },
  { key: 'Ctrl+B d', description: 'Detach dari session aktif' },
  { key: 'tmux kill-session -t nama', description: 'Hapus session' },
]

const sessionSteps = [
  {
    label: 'Buat Session',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux new -s kerja{'\n'}
        <span className="text-muted-foreground"># Session "kerja" dibuat. Anda masuk ke dalamnya.</span>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:04' },
  },
  {
    label: 'List Session',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux ls{'\n'}
        kerja: 1 windows (created Fri Mar 21 10:00:00 2026){'\n'}
        dev: 2 windows (created Fri Mar 21 09:30:00 2026)
      </div>
    ),
  },
  {
    label: 'Detach',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-muted-foreground"># Di dalam tmux, tekan:</span>{'\n'}
        <span className="text-primary">Ctrl+B </span>lalu <span className="text-primary">d</span>{'\n\n'}
        [detached (from session kerja)]
      </div>
    ),
  },
  {
    label: 'Attach',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux attach -t kerja{'\n'}
        <span className="text-muted-foreground"># Kembali masuk ke session "kerja"</span>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:05' },
  },
  {
    label: 'Kill Session',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux kill-session -t dev{'\n'}
        <span className="text-primary">$ </span>tmux ls{'\n'}
        kerja: 1 windows (created Fri Mar 21 10:00:00 2026)
      </div>
    ),
  },
]

/* ── Section 2: Window ─────────────────────────────────────────── */

const windowShortcuts = [
  { key: 'Ctrl+B c', description: 'Buat window baru' },
  { key: 'Ctrl+B ,', description: 'Rename window aktif' },
  { key: 'Ctrl+B n', description: 'Pindah ke window berikutnya' },
  { key: 'Ctrl+B p', description: 'Pindah ke window sebelumnya' },
  { key: 'Ctrl+B 0-9', description: 'Pindah ke window nomor tertentu' },
  { key: 'Ctrl+B &', description: 'Tutup window aktif' },
]

function WindowTabs({ windows, active }) {
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
      {windows.map((w, i) => (
        <div
          key={i}
          style={{
            padding: '4px 12px',
            background: i === active ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: i === active ? 'var(--primary)' : 'var(--muted-foreground)',
            borderBottom: i === active ? '2px solid var(--primary)' : '2px solid transparent',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
          }}
        >
          {i}:{w}{i === active ? '*' : ''}
        </div>
      ))}
    </div>
  )
}

const windowSteps = [
  {
    label: 'Buat Window',
    render: () => (
      <div>
        <WindowTabs windows={['bash', 'bash']} active={1} />
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B c → window baru terbuat</span>{'\n'}
          <span className="text-primary">$ </span>▊
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
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B , → ketik nama baru → Enter</span>{'\n'}
          <span className="text-primary">$ </span>vim app.js
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
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B n/p atau Ctrl+B 0-9</span>{'\n'}
          <span className="text-primary">$ </span>tail -f /var/log/syslog
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
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B & → konfirmasi "y" → window ditutup</span>{'\n'}
          <span className="text-primary">$ </span>▊
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:editor 1:bash*', right: '"hostname" 15:13' },
  },
]

/* ── Section 3: Pane ───────────────────────────────────────────── */

const PANE = 'flex-1 p-2.5 text-muted-foreground flex items-center justify-center transition-all duration-300 border border-border text-sm'
const PANE_ACTIVE = 'flex-1 p-2.5 flex items-center justify-center transition-all duration-300 border border-primary bg-primary/10 text-sm text-foreground'
const PANE_ROW = 'flex h-[180px] transition-all duration-300'
const PANE_COL = 'flex flex-col h-[180px] transition-all duration-300'

const paneShortcuts = [
  { key: 'Ctrl+B %', description: 'Split pane secara vertikal (kiri-kanan)' },
  { key: 'Ctrl+B "', description: 'Split pane secara horizontal (atas-bawah)' },
  { key: 'Ctrl+B x', description: 'Tutup pane aktif' },
]

const paneSteps = [
  {
    label: 'Satu Pane',
    render: () => (
      <div className={PANE_ROW}>
        <div className={PANE_ACTIVE}>pane 0 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:20' },
  },
  {
    label: 'Split Vertikal',
    render: () => (
      <div className={PANE_ROW}>
        <div className={PANE}>pane 0</div>
        <div className={PANE_ACTIVE}>pane 1 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:21' },
  },
  {
    label: 'Split Horizontal',
    render: () => (
      <div className={PANE_COL}>
        <div className={PANE}>pane 0</div>
        <div className={PANE_ACTIVE}>pane 1 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:22' },
  },
  {
    label: 'Multi Split',
    render: () => (
      <div className={PANE_COL}>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={PANE}>pane 0</div>
          <div className={PANE_ACTIVE}>pane 1 (aktif)</div>
        </div>
        <div className={PANE}>pane 2</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:23' },
  },
  {
    label: 'Tutup Pane',
    render: () => (
      <div className={PANE_ROW}>
        <div className={PANE_ACTIVE}>pane 0 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:24' },
  },
]

/* ── Section 4: Navigasi ───────────────────────────────────────── */

const navShortcuts = [
  { key: 'Ctrl+B ↑↓←→', description: 'Pindah antar pane dengan arrow keys' },
  { key: 'Ctrl+B q', description: 'Tampilkan nomor pane, tekan angka untuk pindah' },
  { key: 'Ctrl+B o', description: 'Pindah ke pane berikutnya' },
  { key: 'Ctrl+B ;', description: 'Pindah ke pane terakhir yang aktif' },
  { key: 'Ctrl+B n', description: 'Pindah ke window berikutnya' },
  { key: 'Ctrl+B p', description: 'Pindah ke window sebelumnya' },
  { key: 'Ctrl+B w', description: 'Pilih window dari daftar interaktif' },
  { key: 'Ctrl+B s', description: 'Pilih session dari daftar interaktif' },
]

function PaneGrid({ activeIndex }) {
  const panes = ['vim app.js', 'npm run dev', 'git log', 'htop']
  return (
    <div className={PANE_COL} style={{ height: '160px' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        <div className={activeIndex === 0 ? PANE_ACTIVE : PANE}>{panes[0]}</div>
        <div className={activeIndex === 1 ? PANE_ACTIVE : PANE}>{panes[1]}</div>
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <div className={activeIndex === 2 ? PANE_ACTIVE : PANE}>{panes[2]}</div>
        <div className={activeIndex === 3 ? PANE_ACTIVE : PANE}>{panes[3]}</div>
      </div>
    </div>
  )
}

const navSteps = [
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
      <div className={PANE_COL} style={{ height: '160px' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">0</span></div>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">1</span></div>
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">2</span></div>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">3</span></div>
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: 'Tekan angka untuk pindah' },
  },
]

/* ── Section 5: Resize ─────────────────────────────────────────── */

const resizeShortcuts = [
  { key: 'Ctrl+B Ctrl+↑', description: 'Perbesar pane ke atas' },
  { key: 'Ctrl+B Ctrl+↓', description: 'Perbesar pane ke bawah' },
  { key: 'Ctrl+B Ctrl+←', description: 'Perbesar pane ke kiri' },
  { key: 'Ctrl+B Ctrl+→', description: 'Perbesar pane ke kanan' },
  { key: 'Ctrl+B z', description: 'Zoom/unzoom pane (fullscreen toggle)' },
  { key: 'Ctrl+B Space', description: 'Ganti layout otomatis' },
]

const resizeSteps = [
  {
    label: 'Default',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 1 }}>pane 0</div>
        <div className={PANE} style={{ flex: 1 }}>pane 1</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '50% | 50%' },
  },
  {
    label: 'Resize →',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 2 }}>pane 0 (lebih lebar)</div>
        <div className={PANE} style={{ flex: 1 }}>pane 1</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '67% | 33%' },
  },
  {
    label: 'Resize ←',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 1 }}>pane 0</div>
        <div className={PANE} style={{ flex: 2 }}>pane 1 (lebih lebar)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '33% | 67%' },
  },
  {
    label: 'Zoom (z)',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 1 }}>
          pane 0 (ZOOMED - fullscreen)
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash* (zoomed)', right: '100%' },
  },
]

/* ── Section 6: Copy Mode ──────────────────────────────────────── */

const copyModeShortcuts = [
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
]

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
]

const copyModeSteps = [
  {
    label: 'Normal Mode',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <span className="text-primary">$ </span>▊
      </div>
    ),
  },
  {
    label: 'Copy Mode',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i} style={i === 4 ? { backgroundColor: 'rgba(59,130,246,0.2)' } : {}}>
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
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div
            key={i}
            style={
              i >= 3 && i <= 5
                ? { backgroundColor: 'rgba(59,130,246,0.3)', color: 'var(--primary)' }
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
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        <span className="text-primary">$ </span>▊{'\n'}
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
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i}>
            {line.includes('WebSocket') ? (
              <span>
                [10:06] <span style={{ backgroundColor: 'rgb(59,130,246)', color: '#fff', padding: '0 2px' }}>WebSocket</span> connection established
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
]

/* ── Nav Sections Index ────────────────────────────────────────── */

const sections = [
  { id: 'session', title: 'Session' },
  { id: 'window', title: 'Window' },
  { id: 'pane', title: 'Pane' },
  { id: 'navigasi', title: 'Navigasi' },
  { id: 'resize', title: 'Resize' },
  { id: 'copy-mode', title: 'Copy Mode' },
]

/* ── Page Component ────────────────────────────────────────────── */

export default function AboutTmuxPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">About Tmux</h1>
        <p className="mt-1 text-muted-foreground">
          Visual tutorial untuk orchestrasi terminal
        </p>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2">
        {sections.map(({ id, title }) => (
          <a key={id} href={`#${id}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              {title}
            </Badge>
          </a>
        ))}
      </nav>

      <SectionCard id="session" title="Session" description="Session adalah unit utama di tmux. Satu session bisa berisi banyak window. Session tetap berjalan di background meskipun kamu sudah keluar dari terminal.">
        <ShortcutTable shortcuts={sessionShortcuts} />
        <TerminalDemo title="Session Management" steps={sessionSteps} />
      </SectionCard>

      <SectionCard id="window" title="Window" description="Window seperti tab di browser. Satu session bisa punya banyak window, dan setiap window menampilkan satu layar terminal penuh.">
        <ShortcutTable shortcuts={windowShortcuts} />
        <TerminalDemo title="Window Management" steps={windowSteps} />
      </SectionCard>

      <SectionCard id="pane" title="Pane" description="Pane membagi satu window menjadi beberapa area. Kamu bisa split secara vertikal (kiri-kanan) atau horizontal (atas-bawah), sehingga bisa menjalankan beberapa perintah sekaligus dalam satu layar.">
        <ShortcutTable shortcuts={paneShortcuts} />
        <TerminalDemo title="Pane Splitting" steps={paneSteps} />
      </SectionCard>

      <SectionCard id="navigasi" title="Navigasi" description="Berpindah antar pane, window, dan session dengan cepat menggunakan shortcut keyboard. Navigasi yang efisien adalah kunci produktivitas di tmux.">
        <ShortcutTable shortcuts={navShortcuts} />
        <TerminalDemo title="Navigasi Pane" steps={navSteps} />
      </SectionCard>

      <SectionCard id="resize" title="Resize" description="Ubah ukuran pane sesuai kebutuhan. Gunakan Ctrl+arrow untuk resize manual, atau zoom untuk fokus di satu pane secara fullscreen.">
        <ShortcutTable shortcuts={resizeShortcuts} />
        <TerminalDemo title="Resize Pane" steps={resizeSteps} />
      </SectionCard>

      <SectionCard id="copy-mode" title="Copy Mode" description="Copy mode memungkinkan kamu scroll ke atas, mencari teks, menyeleksi, dan meng-copy output terminal. Sangat berguna untuk menyalin log atau output perintah yang panjang.">
        <ShortcutTable shortcuts={copyModeShortcuts} />
        <TerminalDemo title="Copy Mode" steps={copyModeSteps} />
      </SectionCard>
    </div>
  )
}
