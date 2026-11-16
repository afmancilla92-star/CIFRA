import { dailyMaintenance, runAllWatchQueries } from "../src/lib/sync";

// Ejecuta las búsquedas monitoreadas y el mantenimiento sin servidor web
// (útil con cron del sistema). Uso: npm run sync
(async () => {
  const outcomes = await runAllWatchQueries();
  for (const o of outcomes) console.log(`[${o.status}] #${o.id} ${o.message}`);
  if (!outcomes.length) console.log("No hay búsquedas monitoreadas activas.");
  console.log("Mantenimiento:", await dailyMaintenance());
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
