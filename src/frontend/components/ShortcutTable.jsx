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
        <TableRow>
          <TableHead>Shortcut</TableHead>
          <TableHead>Keterangan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shortcuts.map(({ key, description }, i) => (
          <TableRow key={i}>
            <TableCell>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm whitespace-nowrap">{key}</code>
            </TableCell>
            <TableCell className="text-muted-foreground">{description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
