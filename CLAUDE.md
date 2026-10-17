# Innmobiliaria — constitución de la app (núcleo, kit v2.3.0)

> Auto-cargado en cada sesión de este repo. Esta app pertenece al pipeline **AI-APPs**; su plan vive en la casa planeadora.
> Núcleo regenerado por la planeadora (`/nueva-app inmobiliaria` modo regenerar) el 2026-10-17 para el S4; sustituye a la
> constitución v1 (kit v1.6.2, 261 líneas). Las reglas del kit en detalle viven en `docs/REGLAS-ANEXO.md` y se leen solo cuando una
> regla se cita, nunca al abrir la sesión. Las reglas duras de producto de Innmobiliaria están aquí, completas.

## Identidad y las dos casas (regla dura)

- **Planeadora** (`~/Code/hr01-develop-ai-apps/`, privada): brief, visión, el archivo del sprint (inicio ejecutivo + plan + prompt), método y estándares. La **lees** (`additionalDirectories` o path absoluto); **nunca escribes ahí**.
- **Esta app** (`~/Code/app-inmobiliaria`, pública): código, tests, ADRs, `sprints/SPRINT_NNN-cierre.md`. Escritor único: **tú**. El avance vive solo aquí; la planeadora te lee, tú no le reportas a mano. Si el plan necesita cambio, lo declaras en el cierre ejecutivo («desviaciones») y avisas al usuario.
- **Qué es:** **Innmobiliaria** (Innovation + Inmobiliaria, con B): marketplace inmobiliario del **dueño directo** en Bogotá, primera app 100 % comercial del pipeline. Fase 1 (H-1, construida): la campaña de vendedores fundadores, donde publicar ES registrarse. H-2 «Producto completo»: la apertura a compradores según la VISION v2 de la planeadora.
- **Stack:** Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + **componentes propios** en `src/components/ui/` contra `design-system.md` (**shadcn/ui NO está instalado**; no lo instales) + GSAP/ScrollTrigger + Lenis portados de la página base · **Supabase** (Postgres + RLS + Auth; magic link propio para el vendedor, ADR-004; operador por `signInWithPassword` + allowlist) · **Cloudflare Workers vía OpenNext** (ADR-001: Vercel Hobby prohíbe uso comercial) · fotos en **Cloudflare R2** por URL prefirmada (ADR-003) · correo Brevo · analítica PostHog · Pino + Sentry client-only y metadata-only (inerte sin DSN) · Vitest + Playwright + Testing Library + @axe-core/playwright · **cero IA** (feature LLM = ADR «código primero»).
- **Perfil:** web (no escritorio): la línea siguiente es la declaración del perfil escritorio y aquí no aplica; los datos de vendedores **se persisten** con consentimiento Ley 1581 y RLS (regla de producto 2), no son efímeros.
  captura_terceros: false
- **Deploy MANUAL hasta H-4:** `pnpm deploy:cf` (o `pnpm preview:cf`). **Mergear NO publica**: si nadie corre el comando, `main` y producción divergen en silencio. **Toda migración nueva se aplica al proyecto cloud en el mismo sprint** (`supabase db push`) y se verifica con `supabase migration list --linked`; el cierre ejecutivo lo declara (la migración de campaña del S3 no llegó a cloud y lo descubrió un job semanal en rojo ocho semanas después).
- **Estructura:** `src/app` (App Router; rutas: `/`, `/publicar`, `/confirmacion`, `/mi-anuncio`, `/renovar`, `/i/[slug]`, `/privacidad`, `/operador/*`, `/api/*`; `/conoce` = brochure) · `src/components` (UI sin lógica) · `src/engine` (motores puros, cobertura > 80 %) · `src/lib` (dominio; `lib/ia/` = schemas · client · guardrails · persist) · `tests/{unit,integration,e2e}` · `design-system.md` (fuente de verdad visual) · `design-sync/` (bundle del DS, se actualiza por hito) · `supabase/migrations/` (RLS en toda tabla) · `referencias-ui/inmobiliaria/` de la planeadora (página base, RO) · `docs/MANUAL-DE-USO.md` · `docs/GUIA-DE-PRUEBA.html` · `sprints/SPRINT_NNN-cierre.md` · `decisions/NNN-titulo.md` (ADR solo si la decisión es irreversible).

## Reglas duras de Innmobiliaria (producto, no estilo — 10, completas)

1. **Publicar = registro.** El flujo multipaso (paso 1 con MÁXIMO 3 campos) crea `vendedor` + `inmueble` con estados `borrador → publicado_fundador → verificado`; persistencia por paso.
2. **Ley 1581 por construcción:** `consentimiento_at NOT NULL` · minimización radical · RLS en toda tabla (anónimo sin acceso directo; lectura pública solo por RPC `SECURITY DEFINER` con lista blanca de columnas, ADR-002/005) · **PII jamás en fixtures ni tests** (datos 100 % sintéticos).
3. **CTL jamás es requisito de entrada:** desbloquea el nivel 2 ⭐ «Propietario verificado»; el documento se VE y **nunca se almacena** (persisten `matricula` + `verificado` + fecha). La plataforma no paga CTLs. La misma regla vale para cualquier documento del comprador.
4. **Cifras citables ÚNICAMENTE** desde las investigaciones de la planeadora (`portafolio/inmobiliaria/investigacion/`, RO), con fuente: comisión 3 % urbano · 7–7,5 meses de venta · CTL $23.000. Tarifas legales y notariales: **tabla versionada por año con su norma primaria**, jamás de la prensa. Prohibidas las de evidencia débil.
5. **Escasez, contadores y señales REALES o no existen.** Cero cupos, números o insignias fabricadas; un solo sello fuerte antes que muchas señales.
6. **Sistema visual de la página base** (GSAP-Lenis, tokens) sin heredar sus gaps; wordmark **Innmobiliaria**. **LCP nace estático:** el hero jamás arranca en `opacity: 0`; motion solo bajo el pliegue y siempre con `prefers-reduced-motion`.
7. **Fotos:** compresión en el cliente (WebP 1600 + thumb 400) → **R2** por URL prefirmada; **jamás Supabase Storage**; el control de calidad fotográfica es código determinista.
8. **Público:** dueños directos (venta + arriendo, mensaje liderado por VENTA) y, desde la VISION v2 aprobada, **compradores**. **Inmobiliarias jamás** como usuarias ni como público del mensaje.
9. **Cero enlaces y cero datos personales en el repo:** el dominio de producción vive en el producto y la campaña, nunca en README, homepage del repo, docs públicos ni CV Viva; su valor solo en variables (`NEXT_PUBLIC_APP_URL`). Los datos del **responsable Ley 1581** (nombre, correo, teléfono) entran por variables de build, jamás commiteados.
10. **Bilingüe:** la app nació monolingüe (deuda declarada; se paga en H-2 con su sprint). Desde el S4, **todo texto NUEVO nace como mapa `{es, en}`** con test de paridad; nada nuevo se escribe solo en español.

## Workflow del sprint (5 pasos)

1. **Plan.** El usuario trae el archivo del sprint de la planeadora (`portafolio/<slug>/sprints/SPRINT_NNN.md`: inicio ejecutivo + plan técnico breve + prompt de arranque). En **plan mode** corres `/plan-sprint`: estado real del código, riesgos, plan en ≤ 3 fases con criterio observable y horas estimadas por fase, recomendación de modelo. **La aprobación del plan NO arranca nada:** esperas el **«construye»** explícito. Branch `sprint-NNN/<tema>`.
2. **Construcción.** ≤ 3 fases; commits convencionales con la etiqueta `[F1]` / `[F2]` / `[F3]` en el subject (de ahí salen las horas por fase). **Un solo STOP al final de la construcción** con el resumen de las fases, **más como máximo 1 mirada de DECISIÓN** si el sprint cambia una decisión del usuario, la promesa o su máquina (las paradas de contenido donde el usuario aprueba datos son producto y no cuentan). Sin STOP por fase; FORMA y TEXTO se maquetan «no vistas» (registro de una línea) y van al gate humano del hito.
3. **Auditoría de una pasada + checklist manual.** `/audita-sprint` (un auditor independiente en solo lectura, 4 casillas; **críticos y altos se pagan en el sprint, medios y bajos van al lote del hito**). Luego `/deploy-check` (web) o `/release-check` (escritorio): ≤ 10 casillas manuales — **la CI es el gate; si no está en la CI, no es casilla.**
4. **Cierre ejecutivo.** `sprints/SPRINT_NNN-cierre.md` ≤ 40 líneas con la salida de `node scripts/horas-sprint.mjs` pegada (campos abajo). Reemplaza al summary, la bitácora y la auditoría como archivos aparte (la auditoría es una sección del cierre).
5. **PR normal** (no en borrador) con el cierre dentro; checks requeridos con conclusión propia `success` leídos **al final**, no tras cada push. **Antes de abrirlo, `gh pr list --state open` (regla 18): un PR vivo por app.** Al pedir el merge entregas la lista de PRs abiertos, que debe ser ese uno. **El merge squash lo hace el usuario** y borra la rama; después corre `/cierre-sprint <slug>` en la planeadora.

- **Por hito, no por sprint:** gate humano único (≈ 20 min con la página abierta; ⭐/⭐⭐ de la guía, FORMA y TEXTO pendientes, juicio de diseño) · lote de hallazgos medios y bajos · brochure (hito Vitrina) · `design-sync/` y `/design-sync` · `docs/BLUEPRINT.html` · pruebas y capturas en el segundo idioma · adopción del kit y de esta constitución (una vez al abrir el hito; el kit versiona ≤ 1 vez al mes).
- **Matriz de hitos (método v2.3.0; 4 hitos, ninguno más).** Un hito = los sprints que su objetivo necesite; el gate humano es uno por hito (≈ 20 min con la página abierta).

  | Hito | Objetivo | Entra cuando | Sale cuando (gate humano) | Lo que suma el kit en este hito |
  |---|---|---|---|---|
  | **H-1 Vitrina funcional** (= MVP) | diseño, experiencia, propuesta de valor y funciones esenciales, demostrables | visión + maqueta aprobadas (G-Diseño) | flujo principal navegable de punta a punta con datos sintéticos · manual · gate humano aprobado · deuda registrada · **ficha publicada en CV Viva** (export + complemento, build verde; apps de vitrina) · **documentos de arquitectura al día** (`docs/BLUEPRINT.html` as-built, ADRs, `design-system.md`) | automático en cada PR: tests + e2e contra el build · CI con checks propios · gitleaks · Lighthouse 1 corrida · a11y · bilingüe con paridad · cero enlaces · brochure + export |
  | **H-2 Producto completo** (ensayo general; **no robusto**) | todo lo que el cliente verá y usará, construido y funcionando de punta a punta como en producción | H-1 cerrado | inventario de la VISION 100 % construido o descartado con nombre · servicios reales sin mocks, en un entorno igual al de producción · bilingüe completo · **ensayo general del usuario** (todos los flujos como cliente; lo no visto no cuenta) · arquitectura al día | lo mismo que H-1 |
  | **H-3 Robustez** | calidad, mantenibilidad, datos y conectividad proporcionales | **H-2 cerrado** (apps para terceros); vitrina: terceros a la vista o riesgo material | pruebas esenciales de lo que cambia · persistencia e integraciones definitivas · lote de medios y bajos pagado · arquitectura al día | cobertura > 70 % en módulos no-UI · request-id y timing · rate limiting · `design-sync/` + checklist de diseño · techo de costo de IA declarado |
  | **H-4 Producción** (= G-Release) | seguridad, privacidad, despliegue, operación y legal proporcionales | **H-2 y H-3 cerrados** · usuarios reales o salida comercial | checklist de release corto · observabilidad mínima · legal · smoke en producción · arquitectura al día | suite completa verde en `main` · alerta activa · OWASP + red teaming si hay IA · WCAG AA manual · Privacy Policy + ToS · `/release-check` |

  La vitrina exige H-1 (y H-2 como ensayo general corto). **H-2 es el producto completo, no robusto: se cierra antes de H-3 y H-4 en toda app para terceros** (decisión del usuario, 2026-10-17); que el usuario use la app en su vida real no es un hito. Evolución y escalabilidad no son hitos: cada versión repite H-2 → H-4. El sprint de cierre del hito trae lote de medios y bajos, guía al día, manual, BLUEPRINT, `design-sync` y auditoría de la constitución.
- **Solo por cambio:** aprovisionamiento (tabla y humo solo si hay uno nuevo) · demo en rojo (solo gates propios nuevos) · `CONTRATO.lock` de reusables (solo si el contrato cambia) · roadmap de CV Viva (solo si el sprint toca una feature votada) · ADR (solo decisiones irreversibles).
- **Tamaño:** ≈ 4 h activas de builder por defecto; hasta ≈ 12 h con una línea de justificación. Si el real supera el estimado en más del 50 %, el cierre explica la causa y propone una medida.
- **Modelo por DECISIÓN, nunca por descuido (regla dura del usuario, 2026-10-11; kit v2.2.0).** Cada fase del plan declara el modelo requerido y un esfuerzo **sugerido**; el modelo tope ordinario es **Opus 5.5**; **Fable 5.1 solo en emergencia declarada por el usuario** (validación o planeación extraordinaria), jamás por iniciativa del builder, de una skill ni de un subagente.

  | Actividad | Modelo requerido | Esfuerzo (sugerido, no se verifica) |
  |---|---|---|
  | Planear sprint, cerrar sprint, preguntas de la planeadora | Opus 5.5 | medium |
  | Checkpoint de hito, decisión irreversible, auditoría del proceso | Opus 5.5 | high |
  | **Emergencia declarada por el usuario** (validación o planeación extraordinaria) | Fable 5.1 | — (solo si él lo pide en el mensaje) |
  | Construcción con alcance claro (interfaz, lógica, pruebas) | Sonnet 5.5 | medium |
  | Construcción simple: ajustes de interfaz, textos, cambios pequeños | Haiku 5.5 (en prueba) | medium |
  | Depuración difícil, Rust, concurrencia, seguridad, nativo | Opus 5.5 | high |
  | Auditoría de una pasada | Sonnet 5.5 | high |
  | Cierre ejecutivo, script de horas, documentación corta | Haiku 5.5 | low |
  | Subagentes de búsqueda o lectura de archivos | Haiku 5.5 | — |

  - **Gate de modelo al abrir cada fase:** tu primera línea es «Fase N · modelo requerido: X · modelo activo: Y» (Y lo lees de tu propio encabezado de sesión). Si coinciden, arrancas. **Si no coinciden, NO construyes nada** hasta que el usuario escriba «vamos con Y» (queda registrado en el archivo del sprint como decisión) o cambie con `/model X`. Es un renglón, no una parada del techo. Trabajo de rutina en Opus o Fable también se detiene y se recomienda bajar.
  - **El esfuerzo es sugerido:** no se verifica, no se reporta como desvío y nunca detiene nada; `/effort` es opcional.
  - **Relevo, nunca loop (regla 29):** al **segundo intento fallido** sobre el mismo problema, o a los **20 min sin avance verificable** (un test que pasa, un error que cambia), **paras**: escribes en el cierre o la bitácora qué intentaste, qué falló y qué sabes, y pides relevo en UNA línea: «Relevo: modelo actual X · recomiendo Y · por qué · `/model Y`». Prohibido el tercer intento por el mismo camino con el mismo modelo. Escalón: Haiku → Sonnet → Opus; si Opus pide relevo, decide el usuario (Fable solo si él lo declara emergencia).
  - **Haiku 5.5 en construcción simple está en prueba:** su relevo es Sonnet 5.5 (regla 29); el cierre registra si Haiku bastó o no; tras 3 sprints se decide si se queda. Nombre completo `claude-haiku-5-5` en `/model` hasta confirmar que el alias `haiku` apunta a esa versión.
  - Al cambiar de fase, si el contexto anterior no se necesita, recomienda `/clear` o `/compact`: el archivo del sprint conserva el estado.
  - Los subagentes declaran su modelo en su definición (búsqueda y lectura: Haiku 5.5; auditor: Sonnet 5.5); ninguno hereda Opus o Fable por omisión.

## Reglas (29, una línea cada una)

Frecuencia: `[sprint]` cuesta algo en cada sprint · `[hito]` se ejecuta al cerrar o abrir un hito · `[cambio]` solo cuando el sprint toca lo que la regla cubre · `[siempre]` pasiva, costo cero. 🔒 = privacidad o seguridad, sin cambio de fondo. El detalle, origen y precedentes de cada una: `docs/REGLAS-ANEXO.md § N`.

1. `[siempre]` **TypeScript strict.** Sin `any` ni `@ts-ignore` sin justificación en comentario. — detalle: docs/REGLAS-ANEXO.md § 1
2. `[sprint]` **Tests de lo que cambia.** Motores puros > 80 %, UI > 50 %, ≥ 1 e2e por feature core; `--coverage` en el script `test` desde los primeros tests; directorios generados a `globalIgnores`. — detalle: docs/REGLAS-ANEXO.md § 2
3. `[siempre]` **Motor separado de UI.** Lógica pura en `engine/`/`lib/`; componentes sin lógica de negocio. — detalle: docs/REGLAS-ANEXO.md § 3
4. `[siempre]` **Toda salida de LLM que se persista pasa por esquema Zod** (skill `ia-embebida`); nunca texto libre directo a la BD. — detalle: docs/REGLAS-ANEXO.md § 4
5. `[siempre]` **A11y desde el inicio:** tabindex, aria-labels, contraste AA; `prefers-reduced-motion` cambia propiedades, jamás la forma del árbol (test de árbol + axe solo si el sprint toca motion); tokens de tinta vetados fallan en lint; el color nunca solo (símbolo + texto + color). — detalle: docs/REGLAS-ANEXO.md § 5
6. `[siempre]` **Commits convencionales**; branch `sprint-NNN/<tema>`; jamás push directo a `main` (hook); ruleset `main-protegida` con checks requeridos desde el estampado; un job de CI nuevo entra a la ruleset en el mismo sprint. — detalle: docs/REGLAS-ANEXO.md § 6
7. `[siempre]` 🔒 **Secrets solo en `.env.local` y Vercel env;** gitleaks a doble cinturón (hook PreToolUse + `githooks/pre-commit`, `core.hooksPath` por `prepare`); se prueba con la carnada canónica, nunca improvisada. — detalle: docs/REGLAS-ANEXO.md § 7
8. `[sprint]` **Presupuesto medido:** ≈ 4 h activas por defecto, ≤ 12 h con justificación; horas con `scripts/horas-sprint.mjs`; ~12 pasos por pantalla como orientación — si lo excedes, simplifica o consulta. — detalle: docs/REGLAS-ANEXO.md § 8
9. `[sprint]` **Manual de uso vivo** (`docs/MANUAL-DE-USO.md`): toda feature que llega a `main` tiene su sección en el mismo sprint, en lenguaje de usuario final (qué hace, cómo se usa, limitaciones). — detalle: docs/REGLAS-ANEXO.md § 9
10. `[hito]` **El diseño va antes del código:** G-Diseño una vez por app, en UNA sesión sobre la maqueta entera (`docs/diseno/` + `design-system.md`); FIDELIDAD del primer sprint con UI indiferible; de las tres clases de mirada solo **DECISIÓN** abre parada (máx. 1 por sprint; pregunta llana en la primera línea + dónde abrirla; registro de una línea); FORMA y TEXTO al gate humano del hito. — detalle: docs/REGLAS-ANEXO.md § 10
11. `[cambio]` **Guía de prueba viva y acumulativa** (`docs/GUIA-DE-PRUEBA.html`, autocontenida, origen por línea, prefijo `localStorage` versionado): se toca solo si el sprint cambia un flujo visible; ⭐/⭐⭐ se corren en el gate humano del hito, sin acumulados ni contrapesos; kit de prueba (`docs/kit-de-prueba/`) solo por cambio. — detalle: docs/REGLAS-ANEXO.md § 11
12. `[siempre]` **Prohibido entregar por artifacts o plataformas externas:** todo entregable es un archivo del repo (HTML autocontenido o Markdown) y se entrega su ruta. — detalle: docs/REGLAS-ANEXO.md § 12
13. `[hito]` **Brochure** (`docs/BROCHURE.html` + `/conoce` + `docs/brochure-export.json`): se produce una vez, con storyboard aprobado y el banco de técnicas, cuando la app entra al hito Vitrina; se ajusta al cierre de cada hito posterior, no por sprint. — detalle: docs/REGLAS-ANEXO.md § 13
14. `[siempre]` **Código primero, IA generativa después:** toda funcionalidad nativa se resuelve con programación; una feature LLM exige ADR «código primero» (`decisions/PLANTILLA-ADR-codigo-primero.md`); la IA es acento con fallback determinista. — detalle: docs/REGLAS-ANEXO.md § 14
15. `[cambio]` **Un gate se demuestra fallando:** la demo en rojo (`scripts/demo-rojo.sh`) solo para gates PROPIOS nuevos de esta app (los del kit la traen en sus tests); un gate que nunca ejecutó (`skipped`) no es verde: cada check requerido con conclusión propia `success`; todo modo de arranque y perfil de compilación que se distribuye corrió en vivo al menos una vez. — detalle: docs/REGLAS-ANEXO.md § 15
16. `[hito]` **El bundle `design-sync/` es un artefacto del repo,** espejo del DS publicado, y se actualiza al cierre del hito; `/design-sync` lo invoca el usuario y tú lo ejecutas. — detalle: docs/REGLAS-ANEXO.md § 16
17-bis. `[siempre]` **Lo que la app escribe también es superficie:** un derivado jamás nace menos privado que su fuente (700/600, reparación al abrir); todo arnés que pueda tocar fuentes declara su árbol al arrancar y aborta ante datos reales. — detalle: docs/REGLAS-ANEXO.md § 17-bis
17. `[siempre]` 🔒 **Cero enlaces: la producción se muestra, jamás se entrega.** Ningún archivo versionado ni campo de GitHub publica la URL de producción o de previews (CTA = «lista de espera»; homepage del repo = el propio repo; los documentos escriben el patrón con clase de carácter); el barrido de árbol + homepage es un paso del job `quality` de la CI (`scripts/cero-enlaces.mjs`, dominios en `cero-enlaces.json`: cada app suma el host real de su stack). — detalle: docs/REGLAS-ANEXO.md § 17
18. `[siempre]` **UN SOLO PR VIVO POR APP (regla dura del usuario, 2026-10-11; kit v2.1.0).** Dependabot cuenta. Antes de abrir cualquier PR: `gh pr list --state open`; si hay uno, se procesa (mergea o cierra) o se sigue en su rama. Un segundo PR solo si es complementario del primero y su cuerpo EMPIEZA con «complementa #N: <por qué no cabe en #N>». El job `un-pr-vivo` de la CI falla al segundo PR sin esa línea. Dependencias: agrupadas, de a uno, al arrancar el sprint y antes de abrir el PR del sprint; ningún paquete por debajo de `main` (`scripts/verificar-dependencias.mjs`); overrides y excepciones en `pnpm-workspace.yaml`, excepción solo por advisory sin parche y con ADR. — detalle: docs/REGLAS-ANEXO.md § 18
19. `[cambio]` **Todo puente entre dos lenguajes exige su gate de contrato** en el sprint que lo cruza: fixture escrito por el serializador real, tipo validado del lado que lee, un test de punta a punta. — detalle: docs/REGLAS-ANEXO.md § 19
20. `[siempre]` **Bilingüe ES/EN en todo desde el primer sprint:** el dato nace como mapa `{ es, en }`, redactado (no traducido), con test automático de paridad de claves; e2e y capturas en UN idioma por sprint, el otro al cierre del hito. Conversación y cierres en español; código, commits y ADRs en inglés. — detalle: docs/REGLAS-ANEXO.md § 20
21. `[cambio]` **IA de construcción por suscripción (7-S):** solo el binario oficial de Claude Code, token jamás en env, trazas ni repo, directorio temporal limpio con MCP vacío, lotes pequeños fuera de CI, ADR de cumplimiento con relectura de términos por release. — detalle: docs/REGLAS-ANEXO.md § 21
22. `[cambio]` **Todo control dibujado tiene su script cargado** (gate `tests/unit/controladores-maqueta`); si el sprint toca una maqueta o pantalla, la pasada de capturas activa cada control y comprueba que algo cambió. — detalle: docs/REGLAS-ANEXO.md § 22
23. `[cambio]` **Matriz de envejecimiento:** todo dato con fecha de cambio de estado trae un gate que construye la página en cada fecha en que algo cambia; la fecha de consulta es perilla de build, nunca el reloj. — detalle: docs/REGLAS-ANEXO.md § 23
24. `[cambio]` 🔒 **Las protecciones del sistema del usuario se enseñan antes de tocarlas:** matriz de una fila por acción (qué · para qué · qué aviso verá · cómo se deshace) y un «sí» por acción; vale para scripts, tests y tus propios comandos. — detalle: docs/REGLAS-ANEXO.md § 24
25. `[siempre]` **El comando de pruebas por defecto no toca hardware ni permisos:** marca `hardware` (la CI, `--include-ignored --skip en_vivo_`) y prefijo `en_vivo_` (solo la máquina del usuario, con matriz y «sí»). — detalle: docs/REGLAS-ANEXO.md § 25
26. `[siempre]` **Worktrees prohibidos:** todo ocurre en el checkout `~/Code/app-<slug>`; nada de `git worktree` ni `git stash` a secas sobre trabajo ajeno. — detalle: docs/REGLAS-ANEXO.md § 26
27. `[siempre]` **La evidencia se escribe después del hecho** («leído como imagen», «N de N», «en verde») con la cuenta tomada del resultado; extremos de magnitud en capturas y spike de costos solo por cambio. — detalle: docs/REGLAS-ANEXO.md § 27
28. `[cambio]` **Parejas de versiones entre dos ecosistemas** (npm ↔ crates / Python) se vigilan con un test entre lockfiles (`tests/unit/tauri-a-la-par.test.ts`); si entró un lote de dependencias, se construye también el binario. — detalle: docs/REGLAS-ANEXO.md § 28
29. `[siempre]` **Relevo, nunca loop (regla dura del usuario, 2026-10-11; kit v2.2.0).** Segundo intento fallido sobre el mismo problema, o 20 min sin avance verificable ⇒ paras, escribes qué intentaste y pides relevo en una línea con el `/model` del escalón siguiente (Haiku → Sonnet → Opus; de Opus decide el usuario). Jamás un tercer intento por el mismo camino con el mismo modelo. — detalle: docs/REGLAS-ANEXO.md § 29

## Cierre ejecutivo (`sprints/SPRINT_NNN-cierre.md`, ≤ 40 líneas)

Frontmatter `sprint · app · hito · opened · closed · branch · pr`, y los campos, cada uno en una línea o una tabla corta:
nombre · objetivo planeado · resultado · estado · tiempo estimado · tiempo real (salida de `scripts/horas-sprint.mjs`) · diferencia ·
fases planeadas y resultado real · tiempo estimado y real por fase · entregables · no completado · desviaciones · causas · decisiones ·
deuda generada o aplazada (medios y bajos con `archivo:línea`, al lote del hito) · aprendizajes reutilizables · recomendación para el siguiente ·
evaluación esfuerzo-beneficio · **auditoría** (4 casillas; C/A con `pagado · <commit>`) · si una fase se pasó más del 50 %: causa y medida ·
**modelo usado por fase y si hubo desvío** (una línea; si una fase corrió con Haiku 5.5, si bastó o no) · **relevos** (cuántos · de qué modelo a cuál · por qué; o «ninguno») ·
«Para mergear: squash y borrar la rama; después `/cierre-sprint <slug>`».

## Comandos

`/plan-sprint` (paso 1) · `/audita-sprint` (paso 3) · `/deploy-check` web | `/release-check` escritorio (paso 3) · `/design-sync` (hito; lo invoca el usuario) ·
`/self-review`, `/run-tests`, `/security-audit` (opcionales: la CI ya corre lo que verifican). Scripts: `scripts/horas-sprint.mjs` (horas del sprint) ·
`scripts/demo-rojo.sh` (demo en rojo de un gate propio) · `scripts/verificar-dependencias.mjs` · `scripts/build-como-proveedor.mjs` · `scripts/verify-ephemeral.mjs`.

## Estándares (los 6+1, gates en CI)

Testing · CI/CD · Observabilidad · Seguridad · Performance (`perf-budget.json`, Lighthouse una corrida, categorías ≥ 0.9) · UX+A11y · IA embebida responsable.
Detalle canónico: `estandares/estandares.md` de la planeadora (solo lectura). Ítem rojo ⇒ deuda explícita en el cierre ejecutivo o el sprint no cierra.

## Patrones de dominio de esta app

- **Motores puros en `src/engine/`** (cobertura > 80 %): score de completitud (ADR-006), control de calidad de fotos, cupos y vigencia; la UI no calcula.
- **Lectura pública por RPC** con lista blanca de columnas (`obtener_ficha`, `obtener_cupos`…); toda RPC nueva trae su prueba negativa de RLS (anon denegado).
- **Vigencia anti-zombie** con doble defensa (job semanal `vigencia.yml` + chequeo en lectura); `/renovar` con token en el fragmento; magic link: solo el hash del token en BD (ADR-004).
- **Correo:** Brevo cae a MOCK sin `BREVO_API_KEY` (`src/lib/brevo.ts`): ningún flujo se da por probado con el mock; el entorno de ensayo general de H-2 usa el servicio real.
- **Indexación:** `noindex` global hasta H-4; robots y sitemap llegan con el dominio.

Constitución núcleo kit v2.3.0 — Innmobiliaria, regenerada 2026-10-17 para el S4 (sustituye la v1 de kit v1.6.2). Las reglas del kit en detalle viven en docs/REGLAS-ANEXO.md y se leen solo cuando una regla se cita.
