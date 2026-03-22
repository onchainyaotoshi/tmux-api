import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function ShortcutTable({ shortcuts }) {
  return (
    <Table className="my-5">
      <TableHeader>
        <TableRow className="border-b border-primary/15 hover:bg-transparent">
          <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Shortcut</TableHead>
          <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Keterangan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shortcuts.map(({ key, description }, i) => (
          <TableRow key={i} className="border-b border-border/50 hover:bg-accent/30">
            <TableCell>
              <code className="rounded bg-primary/10 px-2 py-1 font-mono text-sm text-primary whitespace-nowrap">{key}</code>
            </TableCell>
            <TableCell className="text-muted-foreground">{description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
