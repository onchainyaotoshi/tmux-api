import { Badge } from '@/components/ui/badge'
import SessionSection from '../sections/SessionSection.jsx'
import WindowSection from '../sections/WindowSection.jsx'
import PaneSection from '../sections/PaneSection.jsx'
import NavigationSection from '../sections/NavigationSection.jsx'
import ResizeSection from '../sections/ResizeSection.jsx'
import CopyModeSection from '../sections/CopyModeSection.jsx'

const sections = [
  { id: 'session', title: 'Session' },
  { id: 'window', title: 'Window' },
  { id: 'pane', title: 'Pane' },
  { id: 'navigasi', title: 'Navigasi' },
  { id: 'resize', title: 'Resize' },
  { id: 'copy-mode', title: 'Copy Mode' },
]

export default function KnowledgeBasePage() {
  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="mb-2 font-mono text-2xl font-bold text-primary">About Tmux</h2>
        <p className="text-muted-foreground">Visual tutorial untuk orchestrasi terminal</p>
      </div>
      <nav className="mb-8 flex flex-wrap gap-2">
        {sections.map(({ id, title }) => (
          <a key={id} href={`#${id}`}>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs cursor-pointer"
            >
              {title}
            </Badge>
          </a>
        ))}
      </nav>
      <SessionSection />
      <WindowSection />
      <PaneSection />
      <NavigationSection />
      <ResizeSection />
      <CopyModeSection />
    </>
  )
}
