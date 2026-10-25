export function SignOut({ className = "btn ghost" }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={className}>Sign out</button>
    </form>
  );
}
