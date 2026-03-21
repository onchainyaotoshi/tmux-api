import styles from './ShortcutTable.module.css';

export default function ShortcutTable({ shortcuts }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Shortcut</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        {shortcuts.map(({ key, description }, i) => (
          <tr key={i}>
            <td><code className={styles.key}>{key}</code></td>
            <td className={styles.desc}>{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
