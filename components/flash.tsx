export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (err) return <p className="notice error" role="alert">{err}</p>;
  if (msg) return <p className="notice" role="status">{msg}</p>;
  return null;
}
