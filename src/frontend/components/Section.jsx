import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'

export default function Section({ id, title, description, children }) {
  return (
    <section id={id} className="mb-16 scroll-mt-5">
      <Card className="border-primary/15 bg-card">
        <CardHeader>
          <div className="text-center font-mono text-sm text-primary tracking-widest">
            ═══ {title.toUpperCase()} ═══
          </div>
          <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </section>
  )
}
