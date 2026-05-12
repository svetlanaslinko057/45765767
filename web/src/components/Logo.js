/**
 * Logo — fixed brand mark. ALWAYS renders /public/evax-logo.png.
 * Do NOT swap by theme. Do NOT replace this file or the underlying PNG.
 */
export default function Logo({
  className = '',
  height = 140,
  alt = 'EVA-X',
  testId = 'app-logo',
}) {
  const base = process.env.PUBLIC_URL || '';
  const src = `${base}/evax-logo.png`;
  return (
    <img
      data-testid={testId}
      src={src}
      alt={alt}
      style={{ height, width: 'auto', maxWidth: 'none' }}
      className={className}
    />
  );
}
