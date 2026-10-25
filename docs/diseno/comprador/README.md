# Maqueta del lado comprador — Innmobiliaria (S6)

Maqueta navegable de todo lo que el comprador verá y usará, y de la cara que el dueño y el operador ven de él.
Es la base contra la que se construyen los sprints S6 a S12. **No es código de producto:** HTML autocontenido,
sin React ni motores, que se abre con doble clic en `index.html`.

## Cómo abrirla

- **En el computador:** doble clic en `docs/diseno/comprador/index.html`. Funciona sin internet.
- **Como teléfono:** en la barra negra de arriba, «Marco → Móvil 390».
- **En el teléfono:** pásate la carpeta `docs/diseno/comprador/` entera (AirDrop o un zip) y abre `index.html`.

La barra negra es de la maqueta, no del producto. En cada pantalla cambia:

- **Estado:** vacío, cargando, error, verificado…
- **Idioma:** ES/EN.
- **Comprador:** sin verificar, WhatsApp verificado o identificado.
- **Marco:** libre o móvil.

El producto tiene su propio selector ES|EN en el encabezado.

**Real y de ejemplo:**

- **Reales:** los barrios del mapa y su forma (Catastro Bogotá).
- **De ejemplo:** anuncios, precios, personas, tasas y el valor catastral de la pantalla 09.
- **Estimados:** las tarifas del papeleo, que son las de 2026 con su norma.

## Pantalla → funcionalidad de la VISION v2.0.0

| Pantalla                     | Funcionalidad de la VISION                                                                                   | Estados diseñados                                                        | Se construye                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------- |
| `01-buscar.html`             | Búsqueda con filtros y mapa de zona dibujada · «Aquí no hay anuncios zombie» (vivo hace N días, amplía)      | con resultados · primera vez · cargando · sin resultados · mapa caído    | **S6**                            |
| `02-ficha.html`              | Sello del propietario visible con la fecha del CTL · «vivo hace N días» · contacto por WhatsApp con un toque | verificado · re-verificación pendiente · fundador · contactar            | **S6** sello y vivo · S7 contacto |
| `03-verificar-whatsapp.html` | Comprador verificado por WhatsApp (≈ 30 s, código ya escrito)                                                | inicio · esperando · verificado · error                                  | S7                                |
| `04-identificarse.html`      | Comprador identificado (opcional), cédula y nombre contra la Registraduría sin guardar el documento          | inicio · validando · identificado · no coincide · servicio no disponible | S7–S12                            |
| `05-tarjeta-comprador.html`  | Tarjeta del comprador para el dueño · «solo compradores identificados»                                       | identificado · solo WhatsApp · ajuste del dueño · sin solicitudes        | S7–S12                            |
| `06-agenda.html`             | Agenda de visita: el dueño propone, el comprador confirma, recordatorio, asistió / no asistió                | comprador elige · dueño propone · confirmada · después · cancelada       | S7–S12                            |
| `07-favoritos.html`          | Favoritos, comparar hasta 4 y listas compartidas con notas                                                   | favoritos · comparar · lista compartida · vacío                          | S7–S12                            |
| `08-alertas.html`            | Alertas de coincidencia (correo; WhatsApp si lo pides) y bajas de precio                                     | mis alertas · crear · el correo que llega · vacío                        | S7–S12                            |
| `09-esta-caro.html`          | ¿Está caro este anuncio? (rango P25–P75 con número, fecha y fuente) · Datos de tu zona                       | en rango · caro · sospechosamente barato · sin datos suficientes         | S7–S12                            |
| `10-simulador.html`          | Simulador de cuota y capacidad de endeudamiento (calcula de verdad)                                          | con cálculo · fuera de capacidad · sin tasa                              | S7–S12                            |
| `11-papeleo.html`            | Asistente del papeleo (gastos por actor con su norma, documentos, plazos) · Lector de CTL **condicionado**   | gastos · documentos · plazos · lector de CTL                             | S7–S12                            |
| `12-reportar.html`           | Reglas antifraude visibles: botón «reportar» y cola de revisión del operador · Panel del operador (amplía)   | reportar · enviado · cola del operador                                   | S7–S12                            |

La VISION marca 16 funcionalidades con `[H-2]`, y 15 tienen pantalla aquí. **«Fotos que venden: solicita tu sesión»**
es del lado del dueño y no entra en esta maqueta; el S6 no la pide. Las dos ampliaciones de H-1 también tienen
pantalla: «vivo hace N días» en la 01 y la 02, y la cola del panel del operador en la 12. El sprint de cada
funcionalidad después del S7 lo fija la planeadora.

## Decisiones de diseño (las que esta maqueta pone a tu juicio)

1. **El anuncio es el área de su barrio, nunca un punto.** El mapa colorea el barrio catastral con el número de
   anuncios vivos. La dirección exacta la da el dueño cuando acepta la visita (G-Plan 1a, ahora visible).
2. **Mirar es libre; contactar exige WhatsApp verificado.** Buscar, guardar favoritos y crear alertas por correo
   no piden nada. Escribir y pedir visita piden la verificación de WhatsApp, una sola vez. La cédula es opcional
   y solo la exige el dueño que activa «solo compradores identificados».
3. **Favoritos sin cuenta:** viven en el teléfono y se sincronizan al verificar el WhatsApp.
4. **Un solo sello, con tres estados:** Fundador · ⭐ con la fecha del CTL · re-verificación pendiente. Este
   último lo llevan todos los verificados de hoy hasta mostrar un CTL de máximo 30 días.
5. **«Vivo hace N días»** cuenta desde la última confirmación del dueño (vigencia de 60 días, ADR 007).
6. **Navegación del comprador en 4 secciones:** Buscar · Guardados · Alertas · Herramientas. En el teléfono es
   una barra inferior.
7. **Tres tokens de estado nuevos:** ok (verde), aviso (ámbar) y error (rojo), siempre con símbolo y texto. Si
   los apruebas, entran a `design-system.md` en el sprint que construya la primera pantalla que los use.
8. **«¿Está caro?» es un rango, nunca un «avalúo»:** P25–P75 del precio por m² de oferta, con un mínimo de 8
   comparables. Un precio 30 % o más bajo la mediana avisa al comprador y levanta una bandera al operador.
9. **Papeleo:**
   - Tarifas 2026 con su norma, marcadas como estimado.
   - La beneficencia sale como rango (1,67 %–2 %) hasta fijar la norma departamental.
   - La ganancia ocasional queda fuera, porque depende de cada caso.
10. **Recordatorios de visita por correo, que no cuestan.** La dirección llega por el WhatsApp del dueño.
11. **El simulador topa la cuota en 30 % de los ingresos, como ejemplo.** El sprint del simulador fija la regla
    con su norma.
12. **El lector de CTL se muestra como «condicionado»:** se construye solo si las reglas funcionan con CTL reales.

## Lo que la maqueta no es

- **El mapa no dibuja calles.** Solo muestra los barrios catastrales de Chapinero, Chicó y Usaquén. En el
  producto van sobre el mapa de OpenFreeMap (ADR 014, S6).
- **Las fotos son ilustraciones sintéticas,** para no usar fotos de terceros.
- **La verificación, la Registraduría y el envío de correos se simulan** con los botones de estado.

## Lo que el producto cambió respecto de la maqueta 11 (Sprint 014)

La maqueta 11 queda como la aprobó el usuario; el producto (`/papeleo`, S14) se construyó contra ella y se apartó en lo que la norma
primaria leída el 2026-10-25 desmintió o en lo que el plan acordó:

- **Un solo impuesto de registro, por mitades.** La maqueta pone «beneficencia y registro departamental, 1,67 % a 2 %» todo al comprador. La
  «beneficencia» no es un cobro aparte: es el impuesto de registro y anotación de Cundinamarca (Ordenanza 039 de 2020, arts. 208 a 218, con
  la tarifa del art. 217 modificada por la Ordenanza 0105 de 2023), **1 %**, que en Bogotá y Cundinamarca se paga **por partes iguales salvo
  pacto**. Sale una línea, con su norma, y no un rango.
- **«Registro: dentro de 2 meses»** se separa en lo que dice cada norma: **pedir** el registro dentro de 2 meses (Ordenanza 039, art. 218) y que la
  oficina **registra en 5 días hábiles** (Ley 1579 de 2012, art. 27). Los 2 meses no son de la Ley 1579.
- **El IVA de 19 % sobre la notaría** que muestra la maqueta no se muestra: no hay una norma primaria clara (la DIAN se contradice entre
  conceptos), así que el concepto se nombra **sin cifra**. La ganancia ocasional se nombra sin el 15 %.
- **«CTL de máximo 30 días»** se rotula como criterio del portal de la SNR, no como ley: la Ley 1579 (art. 72) fija la vigencia del CTL a la
  fecha y hora de la solicitud.
- **«Si el vendedor incumple te devuelve el doble»** era impreciso: las arras dobladas son el precio de **retractarse** (Código Civil, art. 1859),
  no de incumplir; el incumplimiento tiene su cláusula (art. 1546) y, si hay, la cláusula penal.
- **Más entradas que el precio:** ciudad, tipo (normal, VIS, VIP) y subsidio, quién vende, reparto, avalúo catastral y crédito, porque cada una
  cambia una norma (tope de la VIS, mitad de la VIS solo con subsidio, base ≥ avalúo, retención solo si vende una persona natural).
- **Una línea más por actor:** los recaudos de la notaría (Res. SNR 2026-000964-6, art. 50).
- **La cuarta pestaña** es «Qué dice cada documento» (cláusulas de texto fijo con su artículo). El **lector de CTL** de la maqueta no cupo aquí:
  llegó en el Sprint 15, como quinta sección (ver abajo).

## Lo que el producto cambió respecto de las maquetas 11 y 12 (Sprint 015)

Las maquetas quedan como las aprobó el usuario. El producto del S15 (antifraude, el lector de CTL y la sesión de fotos) se apartó de ellas en
esto:

- **Lector de CTL (maqueta 11).** Es la **quinta sección** de Papeleo («Certificado (CTL)»), no la cuarta, y **solo existe con el interruptor
  `LECTOR_CTL_ACTIVO` encendido**; hoy está apagado porque no se validó con certificados reales. La franja «Condicionado» de la maqueta no se
  muestra. Cada marca trae su anotación, si sigue vigente o qué anotación la canceló, y su norma; **lo que no reconoce lo lista**, y una
  cancelación que no nombra la anotación que cancela no da nada por cancelado. Donde la maqueta dice «Sin embargos ni demandas inscritas», el
  producto dice «no encontramos nada de lo que este lector marca»: no afirma que el certificado esté limpio, porque solo lee lo que reconoce. No es un
  estudio de títulos y lo dice.
- **Las reglas, visibles (maqueta 12).** La maqueta las muestra solo al operador; la VISION v2 pide que se vean, así que el producto suma la página
  pública **«Cómo revisamos los anuncios»** (`/antifraude`) con los umbrales leídos de las mismas constantes que usa el motor.
- **Reportar exige el WhatsApp verificado**, con un reporte por anuncio y persona y hasta cinco al día; el dueño no sabe quién reportó y la cola
  tampoco lo muestra. Un reporte o una señal **nunca** pausan ni marcan un anuncio por sí solos.
- **La cola suma lo que la maqueta no dibuja:** **«Reactivar el anuncio»** (una pausa sin vuelta sería un error) y que un anuncio con el CTL pedido
  **se queda en la cola** hasta que se verifique, con el texto de WhatsApp ya escrito.
- **La sesión de fotos no tiene maqueta propia** (decisión del plan): se dibujó con el sistema de diseño en «Mi anuncio» y en un panel del operador;
  su aspecto queda para el ensayo general.

## Fuentes, licencias y cómo se regenera

- **Mapa:**
  - Archivo: `assets/mapa-datos.js`, generado por `node scripts/sectores/mapa-maqueta.mjs`. Ver `scripts/sectores/README.md`.
  - Fuente: «Sector catastral» de Catastro Bogotá (UAECD), datos abiertos, **CC BY 4.0**.
  - Regenerarlo da los mismos bytes.
- **Tipografía:** Poppins, los cinco pesos de la app, en subconjunto latino (`assets/fuentes/`). Licencia SIL Open
  Font License 1.1.
- **Tarifas del papeleo y verificación del comprador:** investigación del lado comprador de la planeadora
  (2026-10-17), secciones C y E.
- **Gates en la CI (`pnpm test`):**
  - `tests/unit/controladores-maqueta.test.ts`: todo control tiene su script, y cada atributo `data-*` tiene quien lo lea.
  - `tests/unit/maqueta-bilingue.test.ts`: cada texto en pareja ES/EN, redactado, y ningún texto suelto.

## Registro de la mirada (G-Diseño del comprador)

| Fecha      | Artefacto                                           | Veredicto del usuario | Qué se construye encima                       |
| ---------- | --------------------------------------------------- | --------------------- | --------------------------------------------- |
| 2026-10-17 | `docs/diseno/comprador/` (12 pantallas + recorrido) | «apruebo»             | F2 y F3 del S6; S7–S12 construyen contra ella |
