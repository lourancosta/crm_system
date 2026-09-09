import styles from './QuoteWizardStepper.module.css';

export type WizardStep = { key: string; label: string };

type Props = {
  steps: WizardStep[];
  activeIndex: number;
};

// Purpose-built for this one wizard — this is the app's first multi-step
// flow, so this isn't generalized into shared/components yet (only worth
// doing once a second wizard needs the same shape).
export function QuoteWizardStepper({ steps, activeIndex }: Props) {
  const halfItemWidth = 50 / steps.length;
  const trackContentWidth = 100 - 2 * halfItemWidth;
  const progressFraction = steps.length > 1 ? activeIndex / (steps.length - 1) : 0;
  const progressWidth = trackContentWidth * progressFraction;

  return (
    <div className={styles.stepper}>
      <div className={styles['stepper-track']}>
        <div className={styles['stepper-line-bg']} style={{ left: `${halfItemWidth}%`, right: `${halfItemWidth}%` }} />
        <div className={styles['stepper-line-progress']} style={{ left: `${halfItemWidth}%`, width: `${progressWidth}%` }} />
        {steps.map((step, i) => (
          <div key={step.key} className={styles['stepper-item']}>
            <div
              className={`${styles['stepper-circle']}${
                i === activeIndex ? ` ${styles['stepper-circle--active']}` : i < activeIndex ? ` ${styles['stepper-circle--done']}` : ''
              }`}
            />
            <div className={`${styles['stepper-label']}${i === activeIndex ? ` ${styles['stepper-label--active']}` : ''}`}>{step.label}</div>
          </div>
        ))}
      </div>
      <div className={styles['stepper-count']}>
        Step {activeIndex + 1} of {steps.length}
      </div>
    </div>
  );
}
