export function SignOut({ className = "btn ghost", to }: { className?: string; to?: "tracker" }) {
  return (
    <form action={to ? `/auth/signout?to=${to}` : "/auth/signout"} method="post">
      <button type="submit" className={className}>Sign out</button>
    </form>
  );
}
