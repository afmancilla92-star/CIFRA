export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <h1 className="text-xl font-bold">No encontrado</h1>
      <p className="mt-2 text-sm text-soft">El anuncio o anunciante ya no está en el radar (puede haberse eliminado por retención).</p>
      <a href="/" className="btn-primary mt-4">
        Volver a explorar
      </a>
    </div>
  );
}
