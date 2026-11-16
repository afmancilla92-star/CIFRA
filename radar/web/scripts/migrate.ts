import { db } from "../src/lib/db/client";

// Aplica el esquema (idempotente). Uso: npm run db:migrate
db()
  .then(() => {
    console.log("Esquema aplicado en", process.env.DATABASE_URL || "file:./data/radar.db");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
