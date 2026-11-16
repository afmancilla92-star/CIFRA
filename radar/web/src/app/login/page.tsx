export default function LoginPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const next = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/";
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <form action="/api/auth/login" method="post" className="card space-y-4 p-6">
        <h1 className="text-xl font-bold">Entrar a Cifra Radar</h1>
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="label">Contraseña</span>
          <input type="password" name="password" required autoFocus className="input" />
        </label>
        {searchParams.error ? <p className="text-sm text-bad">Contraseña incorrecta.</p> : null}
        <button className="btn-primary w-full" type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
}
