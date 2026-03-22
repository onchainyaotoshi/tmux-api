import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Section({ id, title, description, children }) {
  return (
    <section id={id} className="mb-16 scroll-mt-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-2xl">{title}</CardTitle>
          <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </section>
  )
}
