import styles from './Section.module.css';

export default function Section({ id, title, description, children }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {children}
    </section>
  );
}
