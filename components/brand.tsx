/* eslint-disable @next/next/no-img-element */
export function Brand({ size = 40 }: { size?: number }) {
  return (
    <>
      <img src="/alpha-logo.png" alt="Alpha" className="brand-logo" style={{ height: size }} />
      <span className="brand-divider" aria-hidden="true" />
      <span className="brand-name">New York City</span>
    </>
  );
}
