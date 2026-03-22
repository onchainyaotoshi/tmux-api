import { Bot } from 'lucide-react'

export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-border py-16 text-center">
        <Bot className="mb-4 size-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          Coming soon — agent management will be available here.
        </p>
      </div>
    </div>
  )
}
