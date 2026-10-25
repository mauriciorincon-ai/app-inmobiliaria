# Bandeja de IA — la CLI

Implementa el contrato `bandeja-ia` v0.1.0 (copia fijada en `src/engine/bandeja/CONTRATO.lock`). La sesión de Claude Code
**produce**; este script y los motores de `src/engine/bandeja/` **deciden**.

| Orden                                       | Qué hace                                                                                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bandeja.mjs verificar`                     | Comprueba la huella SHA-256 del contrato fijado y registra los tipos (destino ignorado por git).                                                                                          |
| `bandeja.mjs listar`                        | Lista los trabajos pendientes y vencidos con su resumen. Solo lee NOMBRES de archivo, jamás el PDF.                                                                                       |
| `bandeja.mjs entregar <id> <salida.json> …` | Valida la salida contra el esquema del tipo y, solo si pasa, la deja en el destino del tipo, con su `meta` (número, páginas, vigencia; `--paginas`, `--desde`, `--hasta`). Deja registro. |
| `bandeja.mjs cargar <id>`                   | (`edicion-del-mes`) Lleva la edición entregada a la base **sin publicar**, fija la muestra de 5 y escribe `crudo/revision-N.html`.                                                        |
| `bandeja.mjs publicar <id> --revisada`      | Publica la edición tras la revisión del usuario (la base compara la muestra con la que fijó la carga).                                                                                    |
| `bandeja.mjs estado <N>` · `retirar <N>`    | Dice si la edición está cargada o publicada · la quita de inmediato y deja sus datos.                                                                                                     |

`cargar`, `publicar`, `estado` y `retirar` usan la llave de servicio del entorno y **se niegan a tocar una base que no sea local
sin `--nube`** (y `--nube` solo con el «sí» del usuario). `--hoy AAAA-MM-DD` fija la fecha (para pruebas y ensayos); `--autoriza-vencido` es el «sí» del usuario a un trabajo vencido;
`BANDEJA_FUENTES` apunta a otra carpeta de fuentes. El registro de cada corrida (modelo, fecha, duración, procesados, muestra
revisada, anotaciones) queda en `registro/corridas.jsonl` (ignorado por git).

Se corre con `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/bandeja/bandeja.mjs …` (Node 24 ejecuta los
`.ts` de los motores sin compilar). Para agregar un tipo: ver `.claude/skills/bandeja.md`.
