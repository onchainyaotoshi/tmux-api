import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TerminalSimulator({ title, steps }) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = steps[currentStep]

  return (
    <Card className="my-5 overflow-hidden bg-[#000000] font-mono text-sm border-primary/15">
      <div className="flex items-center gap-2 border-b border-primary/10 bg-[#0a0e14] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff3333]" />
        <span className="h-3 w-3 rounded-full bg-[#ffb000]" />
        <span className="h-3 w-3 rounded-full bg-[#00ff41]" />
        <span className="ml-2 text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="min-h-[200px] p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <Button
              key={i}
              variant={i === currentStep ? 'secondary' : 'outline'}
              size="sm"
              className="font-mono text-xs"
              onClick={() => setCurrentStep(i)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="overflow-hidden rounded border border-primary/10">
          {step.render()}
        </div>
        {step.statusBar && (
          <div className="mt-2 flex justify-between rounded-b bg-muted px-3 py-1 text-xs text-muted-foreground">
            <span>{step.statusBar.left}</span>
            <span>{step.statusBar.right}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
