// Crea (idempotente) el usuario operador vía Admin API. Para uso LOCAL y CI.
//
// Requiere env:
//   SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   (poder total, solo scripts — jamás en la app)
//   OPERADOR_EMAIL              (allowlist del panel)
//   OPERADOR_PASSWORD           (en CI: sintético; en local: el tuyo de prueba)
//
// Uso: node scripts/crear-operador.mjs
//
// Nunca uses datos reales aquí: los operadores de prueba son 100% sintéticos.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.OPERADOR_EMAIL;
const password = process.env.OPERADOR_PASSWORD;

const faltan = Object.entries({
  "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL": url,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  OPERADOR_EMAIL: email,
  OPERADOR_PASSWORD: password,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (faltan.length > 0) {
  console.error(`[crear-operador] Faltan variables de entorno: ${faltan.join(", ")}`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ¿Ya existe? (idempotencia — el seed corre en cada arranque de CI).
const { data: lista, error: errLista } = await admin.auth.admin.listUsers();
if (errLista) {
  console.error(`[crear-operador] No se pudo listar usuarios: ${errLista.message}`);
  process.exit(1);
}

const existente = lista.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (existente) {
  // Asegura password + email confirmado (por si el usuario quedó a medias).
  const { error } = await admin.auth.admin.updateUserById(existente.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error(`[crear-operador] No se pudo actualizar el operador: ${error.message}`);
    process.exit(1);
  }
  console.log(`[crear-operador] Operador ya existía; credenciales actualizadas (${email}).`);
  process.exit(0);
}

const { error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error(`[crear-operador] No se pudo crear el operador: ${error.message}`);
  process.exit(1);
}

console.log(`[crear-operador] Operador creado (${email}).`);
