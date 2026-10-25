---
sprint: 015
app: inmobiliaria
hito: H-2
opened: 2026-10-25
closed: 2026-10-25
branch: sprint-015/aqui-nadie-te-tumba
pr: "#40"
---

# Sprint 015 «Aquí nadie te tumba» — cierre ejecutivo

- **Objetivo planeado:** antifraude con reglas a la vista (banderas al operador, «Reportar», cola con pausar · pedir CTL · descartar), el lector de CTL (condicionado a certificados reales), «fotos que venden» y las cuatro cifras de la deuda del S14.
- **Resultado y estado:** **Sí en local; la CI se lee en el PR.** 1369 unitarias (92 archivos) y **564 e2e en verde dos veces seguidas** sobre base limpia, 0 fallos; `engine/antifraude` al 100 % y `engine/ctl` al 98,2 % (ramas 93,5 %). Lighthouse local (3 corridas): `/antifraude` 268,9 KB (tope 285), `/reportar` 273,9 KB (tope 290) con LCP 2,63 s tras pasar el estado verificado al servidor (antes 3,56 s y rendimiento 0,89), `/papeleo` 286,0 KB (tope 290); categorías ≥ 0,9; demo en rojo: un tope de 100 KB falla solo `/antifraude`. Migración 17 en la nube (con tu «sí»; `migration list --linked` 17/17; humo anónimo 44 de 44). `pnpm audit --audit-level high` sin altos.
- **CTL (solo conteos):** certificados 0 · anotaciones 0 · marcas 0 · desacuerdos 0 → `ctl-validar` dice «SIN VALIDAR» y el **lector queda apagado** (`LECTOR_CTL_ACTIVO` solo en el job e2e; la guarda de despliegue lo veta). **Pregunta:** ¿copias ≥ 3 CTL a `privado/ctl/` (un `.txt` cada uno, ignorada por git, solo se leen en tu máquina) para validarlo en el S16, o sigue apagado hasta el ensayo general?
- **Fases (est. 3,5 h → real, script, 2,7 h, un piso):** F1 la puerta cerrada (1,25 → 0,8) · F2 leer antes de firmar (1 → 0,5) · F3 pantallas, auditoría y pagos (1,25 → 1,4; +12 %). Los commits de F1 se hicieron juntos al final de la fase: el tiempo real fue mayor que el del script. Sin fase pasada del 50 %.
- **Entregables:** migraciones `20261028000001` (tablas `reportes`/`banderas`/`sesiones_fotos`, pausa por `pausado_at` en 12 funciones, 21 RPC) y `20261029000001`; `engine/{antifraude,ctl}`, `/antifraude`, `/i/[slug]/reportar`, `/operador/{antifraude,sesiones}`, sesión de fotos y avisos del equipo en «Mi anuncio», lector como 5.ª sección de `/papeleo`, gate de la pausa en `pg_proc`, e2e `antifraude-{bd,ui}` y `papeleo-ctl-ui`, manual, guía v12 (112 pruebas, bloque R), nota de desvíos de las maquetas 11 y 12.
- **Deuda del S14 pagada:** tope VIP (90 SMMLV, Ley 1955 art. 85), VIP sin subsidio (art. 31 notarial no pide subsidio; el aviso dice que es nuestra lectura y manda a confirmar), retención de empresa sin art. 398, ET 398 «activos fijos de personas naturales», IVA sin afirmar quién lo cobra; `datos-187.js` regenerado.
- **Desviaciones y causas:** (1) **dos migraciones** (el plan decía una): la 18 nació de probar la pantalla de punta a punta (pedir el CTL hacía desaparecer la tarjeta con su WhatsApp; la cola mandaba al final al recién pausado) y trae la validación de `guardar_banderas_precio`; **está solo en local y necesita tu «sí» para `supabase db push`**. (2) Sacrificado por el orden del plan: `tarifas_vencidas` de `precioVerdadero`. (3) La ficha de vivienda nueva suma la mitad del registro con subsidio y **nombra** el completo como faltante (el archivo pedía «muestra el completo y “con subsidio, la mitad”»): la cota «al menos» sigue siendo cierta. (4) El lector es 5.ª sección y la guarda de despliegue lo veta. (5) La página de reglas es pública (la maqueta 12 la muestra solo al operador). (6) El commit `9acce95` [F1] cae entre F2 y F3 y sesga las horas por fase.
- **Decisiones:** una bandera o un reporte jamás pausan ni acusan (solo el operador; el reporte no revela quién) · `signOut({scope:"local"})` en las specs (el global cierra las sesiones de las demás) · lo no verificado se nombra sin cifra.
- **Deuda al lote del hito:** `cola.ts:30` un CTL pedido que el dueño nunca entrega deja el anuncio en la cola sin salida · `…sql:629` la huella la fija el cliente y el umbral 6/64 no se validó con fotos reales · `precio.ts:38-47` la bandera de precio es O(n²) por grupo (cron de 67 s con 17.000 anuncios locales; con decenas, ms) · `papeleo-isla.test.ts:67-76` el gate no veta `console` · `landing.ts:288` «un tercio más rápido» (S3) sin fuente · `resolver_revision` una bandera resuelta con «pausar» no reaparece tras reactivar (¿debe?) · `precio-verdadero.ts:152` el «en su año» · BLUEPRINT al día en el cierre de H-2.
- **Aprendizajes:** `auth.signOut()` es global por defecto y tumba las sesiones de las specs paralelas; un cálculo «sobre toda la base» se prueba también con la base grande (la local acumuló 17.000 anuncios y el cron tardó 67 s); probar la pantalla de punta a punta halló dos fallos de diseño que ninguna prueba de base veía.
- **Siguiente · esfuerzo-beneficio:** S16 (lote del hito y ensayo general; validar el lector si copias CTL). **Antes del 2027-01-01 hay que renovar las tarifas.** Alto: el operador ve el anuncio sospechoso antes que el comprador y el comprador sabe cómo se revisa.
- **Auditoría (Sonnet · high, solo lectura):** alcance, calidad, seguridad (limpia: sin secretos, enlaces ni datos de certificados; RLS y el reporte sin identidad confirmados) y frases caducadas · **C 0 · A 1 · M 7 · B 8** · A1 `40c2bfd` (landing y confirmación decían «Próximamente») · M1 `570448b` · M2 `8cf01ed` · M3 `47b483d` · M4 `6d7eb96` · M5 `de4d5bf` · B2/B3/B4 `0ec43dc` pagados; M6, M7, B1, B6, B7, B8 arriba; B5 descartado (es un título, no una promesa) · veredicto «listo para cierre».
- **Modelo y relevos:** F1 y F2 Opus 5.5 (req. Opus) · F3 y auditor Sonnet 5.5 (req. Sonnet); único desvío: el plan en Sonnet. Haiku no se usó. Relevos: ninguno.

### Horas del sprint (`scripts/horas-sprint.mjs`, rango `origin/main..HEAD`, heurística git-hours: huecos ≤ 2 h + 0,5 h por sesión)

| Commits | Sesiones | Horas activas | Span (primer → último commit)               |
| ------: | -------: | ------------: | ------------------------------------------- |
|      22 |        1 |         2,7 h | 2026-10-25 15:58 → 2026-10-25 18:09 (2,2 h) |

| Fase | Commits | Horas activas |
| ---- | ------: | ------------: |
| F1   |       5 |         0,8 h |
| F2   |       2 |         0,5 h |
| F3   |      15 |         1,4 h |

**Para mergear:** squash y borrar la rama · el producto cambia (`src/`) · **antes, tu «sí» a la migración 18** (la aplico y la verifico con `migration list --linked`) · después yo corro, en orden, `git pull && pnpm deploy:cf` · luego `/cierre-sprint inmobiliaria`.
