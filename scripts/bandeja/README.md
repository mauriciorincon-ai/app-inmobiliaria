# Bandeja de IA — la CLI

Implementa el contrato `bandeja-ia` v0.1.0 (copia fijada en `src/engine/bandeja/CONTRATO.lock`). La sesión de Claude Code
**produce**; este script y los motores de `src/engine/bandeja/` **deciden**.

| Orden                                       | Qué hace                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `bandeja.mjs verificar`                     | Comprueba la huella SHA-256 del contrato fijado y registra los tipos (destino ignorado por git).            |
| `bandeja.mjs listar`                        | Lista los trabajos pendientes y vencidos con su resumen. Solo lee NOMBRES de archivo, jamás el PDF.         |
| `bandeja.mjs entregar <id> <salida.json> …` | Valida la salida contra el esquema del tipo y, solo si pasa, la deja en el destino del tipo. Deja registro. |

`--hoy AAAA-MM-DD` fija la fecha (para pruebas y ensayos); `--autoriza-vencido` es el «sí» del usuario a un trabajo vencido;
`BANDEJA_FUENTES` apunta a otra carpeta de fuentes. El registro de cada corrida (modelo, fecha, duración, procesados, muestra
revisada, anotaciones) queda en `registro/corridas.jsonl` (ignorado por git).

Se corre con `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/bandeja/bandeja.mjs …` (Node 24 ejecuta los
`.ts` de los motores sin compilar). Para agregar un tipo: ver `.claude/skills/bandeja.md`.
