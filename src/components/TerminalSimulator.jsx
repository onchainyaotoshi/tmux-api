import { useState } from 'react';
import styles from './TerminalSimulator.module.css';

export default function TerminalSimulator({ title, steps }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];

  return (
    <div className={styles.terminal}>
      <div className={styles.titleBar}>
        <span className={`${styles.dot} ${styles.dotRed}`} />
        <span className={`${styles.dot} ${styles.dotYellow}`} />
        <span className={`${styles.dot} ${styles.dotGreen}`} />
        <span className={styles.titleText}>{title}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.controls}>
          {steps.map((s, i) => (
            <button
              key={i}
              className={`${styles.btn} ${i === currentStep ? styles.btnActive : ''}`}
              onClick={() => setCurrentStep(i)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.display}>
          {step.render()}
        </div>
        {step.statusBar && (
          <div className={styles.statusBar}>
            <span>{step.statusBar.left}</span>
            <span>{step.statusBar.right}</span>
          </div>
        )}
      </div>
    </div>
  );
}
