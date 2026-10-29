---
sprint: 016
app: inmobiliaria
hito: H-2
opened: 2026-10-25
closed: 2026-10-27
branch: sprint-016/listo-para-abrir
pr: "#42"
---

# Sprint 016 «Listo para abrir» — cierre ejecutivo (cierre del hito H-2)

- **Objetivo planeado:** pagar el lote de medios y bajos de S5–S15, validar el lector de CTL contra el catálogo oficial, dejar el hito en papel (manual, brochure, BLUEPRINT as-built, guía v13) y correr el **ensayo general del usuario**.
- **Resultado y estado:** **Construido y verificado en local; el hito NO cierra hasta el ensayo.** 1959 unitarias (101 archivos), **599 e2e en verde + 237 omitidos a propósito (solo escritorio), 0 fallos, tres corridas completas** (dos sobre base limpia y una tras fusionar el PR #41), cobertura del motor 99,73 %, `engine/ctl` y `engine/antifraude` al 100 % de ramas; tipos, lint, `cero-enlaces`, humo anónimo de la nube 49/49. La CI se lee al final.
- **Tabla del lote (99 puntos de S5–S15, cada uno con `grep`):** **58 pagados** (con commit) · **23 «ya estaba»** (con sitio) · **14 a H-3/H-4** (9 que el sprint asigna: topes de tasa, purgas, cron en serie; **5 sin asignar → tu decisión**) · **2 en el ensayo** (vista previa de WhatsApp, estilo real del mapa) · **2 para tu decisión**. Nada «descartado».
- **Ensayo general (el único STOP):** **PENDIENTE: el usuario aún no lo corre.** Rama desplegada (versión `aed435c1`, 2026-10-27); 18 paradas en la guía v14 (bloque S), una sola historia dueño → comprador → números → equipo → mañana, ≈ 1 h 50: 9 ⭐⭐ de servicio real. Se llena aquí: fecha, duración, una fila por parada y **lo no visto**.
- **Migración 19** (una, `20261030000001`): consentimiento y tope de ciclos en la visita, `salas_panel` sin corte, la bandera que reaparece solo si cambia el dato (guardado como huella), `cerrar_ctl_pedido`, purga, nombre por verificación, «bajó de precio» ≥ 1 %, cupo de correos, zona del sector. **Aplicada en la nube el 2026-10-27 con tu «sí»: 19/19, humo `--lote` 49/49, sonda 7/7**; app desplegada de seguida (versión `aed435c1`). Nube 19/19.
- **Lector de CTL (solo conteos):** certificados 0 · anotaciones 0 · marcas 0 · desacuerdos 0 → `ctl-validar` «SIN VALIDAR»; **el lector sigue apagado** y la guarda de despliegue lo veta. Catálogo Res. SNR 11885/2016 (389 códigos, en dos reproducciones; **fuente primaria no alcanzada**; grupo 05 no leído): el test nació en rojo (200 de 391) y el código manda sobre la palabra.
- **Entregables:** manual con **37** funciones (13 + 24; la 17.ª de «17 + 7» = bilingüe ES/EN, **veta si prefieres otra**), brochure y export a 37 en 10 puertas con test de nombres, BLUEPRINT as-built (32 tablas, 123 funciones, 33 pantallas), ADR 020 y 021, guía v14 (128 pruebas; el gate son las 18 paradas del ensayo, que cubren los 41 ⭐ de A–R sin repetirlos), e2e y capturas en inglés, sonda de la nube, gate de contraste de correos y de cifras prohibidas con demo en rojo.
- **Auditoría (Sonnet · high, solo lectura, 23 min):** alcance, calidad, seguridad (limpia: sin secretos, enlaces ni datos de certificados) y frases caducadas · **C 0 · A 0 · M 17 · B 21** · todos pagados o cerrados con razón en 13 commits `[F2]` (`af13862`…`8e321d6`); lo que halló: dato de la bandera en claro, visita invertida en la portada, tope de correos 250 (no 300), plazo de conservación vago, export con un párrafo triplicado.
- **Para tu decisión (no están «descartados»):** S11.06 tope 135 con ciudad desconocida (cambia 1 proyecto de la maqueta aprobada) · S12.06/S13.11 `datos.ts` sin caché (recomiendo H-3) · S9.04 `Guardados.tsx:88` favorito quitado en otro dispositivo vuelve · S15.02 huella de foto del servidor · S15.03 `precio.ts:38-47` O(n²) (13,4 s con 17.000 en un grupo) · S5.11 `Vary`/CDN · S13.04 allowlist del operador en SQL · `/design-sync` (no existe `design-sync/`) · plazo legal definitivo de conservación (H-4) · grupo 05 del catálogo de CTL.
- **Desviaciones y causas:** el kit del ensayo no siembra datos en la nube (los scripts se niegan a propósito): el ensayo parte del anuncio que publicas en la primera parada · el PR #41 de Dependabot se fusionó antes (tú) y se trajo `main` a la rama · F1 y F2 pasaron de lo estimado (ver horas): el lote era de 99 puntos y 142 archivos tocados.
- **Aprendizajes:** un generador que añade un párrafo no es idempotente hasta que se corre dos veces (el export salió triplicado); un gate de «mapa de rutas» halló una ruta con parámetro que daba 404; una guía con ⭐ por bloque repetía lo mismo 2–3 veces (61 pruebas de gate → 18 paradas en una historia) y su parada de campaña podía escribirle a vendedores reales; correr los e2e sobre base limpia dos veces es lo que da el verde.
- **Siguiente · esfuerzo-beneficio:** **antes del 2027-01-01 renovar las tarifas**; H-3 (robustez) con las decisiones de arriba. Alto: el hito entero se prueba una vez con servicios reales.
- **Modelo y relevos:** F1 Opus 5.5 (req. Opus) · F2, F3 y auditor Sonnet 5.5 (req. Sonnet); único desvío: el plan en Sonnet. Haiku no se usó. Relevos: ninguno.

### Horas del sprint (`scripts/horas-sprint.mjs`, rango `origin/main..HEAD`, heurística git-hours: huecos ≤ 2 h + 0,5 h por sesión)

| Commits | Sesiones | Horas activas | Span (primer → último commit) |
|---:|---:|---:|---|
| 64 | 3 | 5,6 h | 2026-10-25 20:09 → 2026-10-27 20:12 (48,1 h) |

| Fase | Commits | Horas activas |
|---|---:|---:|
| F1 | 38 | 2,6 h |
| F2 | 21 | 1,9 h |
| F3 | 4 | 0,5 h |
| sin fase | 1 | 0,5 h |

**Para mergear:** squash y borrar la rama · el producto cambia (`src/`) y la nube ya lleva la 19 · después yo corro, en orden, `git pull && pnpm deploy:cf` · luego `/cierre-sprint inmobiliaria` (S9–S16).
