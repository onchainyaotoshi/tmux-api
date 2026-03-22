import styles from './ConfirmModal.module.css'

export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancel}>
            No
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onConfirm}>
            Yes, kill it
          </button>
        </div>
      </div>
    </div>
  )
}
