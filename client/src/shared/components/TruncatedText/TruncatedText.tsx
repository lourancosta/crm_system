import styles from './TruncatedText.module.css';

type Props = {
  text: string | null | undefined;
  max?: number;
};

export function TruncatedText({ text, max = 50 }: Props) {
  if (!text) return <span>—</span>;
  if (text.length <= max) return <span>{text}</span>;
  return (
    <span className={styles['text-truncated']} data-tooltip={text}>
      {text.slice(0, max)}...
    </span>
  );
}
