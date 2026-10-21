# Maqueta de vivienda nueva — Innmobiliaria (S11)

Maqueta navegable del módulo de vivienda nueva, con las cifras **reales** de la edición 187 de la revista (procesada) y
calculadas por los motores de `src/engine/vivienda-nueva/`. Es la base de los sprints S12 y S13. **No es código de
producto:** HTML autocontenido que se abre con doble clic en `index.html`.

## Cómo abrirla

- **En el computador:** doble clic en `docs/diseno/vivienda-nueva/index.html`. Funciona sin internet.
- **Como teléfono:** en la barra negra, «Marco → Móvil 390».
- **En el teléfono:** pásate la carpeta `docs/diseno/` **entera**: esta maqueta usa el estilo, las fuentes y el script de
  `docs/diseno/comprador/assets/`.

La barra negra es de la maqueta. En cada pantalla cambia el **estado**, el **idioma** (ES/EN), el **nivel del comprador**
y el **marco**.

**Real y de ejemplo:**

- **Reales:** los 143 proyectos de la edición 187 (nombre, constructora, zona y cifras, sin fotos, logos, textos de avisos,
  teléfonos, direcciones ni webs), las tarifas de escrituración de 2026 y los programas de subsidio con su norma y su
  fecha.
- **De ejemplo:** el hogar (ingresos de $8 M, 30 % de cuota inicial, 20 años), el arriendo de $1.800.000, los hogares de
  «te alcanza» y los usados de «nuevo o usado». En el producto, el ingreso y el arriendo los escribe el comprador y no
  salen de su teléfono; los usados son los anuncios verificados de la búsqueda.
- **Fecha de corte:** 20 de octubre de 2026 (perilla del generador, nunca el reloj). El estado «mes sin edición» usa el
  20 de noviembre.

## Pantalla → funcionalidad de la VISION v2.1.0 (§ Vivienda nueva real)

| Pantalla                | Funcionalidad                                                                                                                             | Estados diseñados                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `01-indice.html`        | **Índice** (mediana del m² privado por zona, franja y segmento; entregas inmediatas) · **«Lo que puedes pagar»** filtra la vivienda nueva | edición vigente · lo que puedes pagar · mes sin edición                          |
| `02-proyecto.html`      | **Precio verdadero** · **La espera** · **Ficha honesta** · acceso a la visita                                                             | con más datos · el que más calla (dato que falta) · fuera de lo que puedes pagar |
| `03-nuevo-o-usado.html` | **Nuevo o usado** con el mismo presupuesto y la misma zona                                                                                | con usados · sin usados comparables                                              |
| `04-te-alcanza.html`    | **¿Te alcanza con subsidio?** (programas vigentes, sin cupos y no verificados)                                                            | hogar de $4 M · de $6 M · de $8 M (pasa el tope de ingresos)                     |
| `05-visita.html`        | **Visita a la sala de ventas**                                                                                                            | pedir · solicitada · confirmada; sin WhatsApp verificado                         |

Toda tarjeta del índice abre la ficha de ejemplo (`02`), que muestra tres proyectos reales elegidos por el generador: el
de Bogotá con más datos que imprime su entrega (hoy, Madrigal), el que más calla y uno que no cabe en lo que puedes
pagar.

## Decisiones de diseño (las que esta maqueta pone a tu juicio)

1. **Vivienda nueva vive dentro de Buscar** («Usados | Nuevos»), no como una quinta sección: la barra sigue en 4.
2. **El número que manda es «pagas al menos»**, no el «desde». Suma el precio, los derechos de registro (Resolución
   2026-001726-6, a cargo de quien registra) y el parqueadero que se paga aparte si el aviso da su precio. Lo que no se
   puede saber se **nombra** y no se suma:
   - los derechos notariales, que se reparten según la promesa (se da su total);
   - el impuesto de registro y la beneficencia, y el IVA notarial (no verificados);
   - lo que puede subir durante la obra si el precio no es fijo;
   - la hipoteca.
3. **El m² es «aproximado»** y lo dice: el precio «desde» y el área «desde» no siempre son de la misma unidad. Sin área
   privada se usa la construida y se dice.
4. **Un «VIS» por encima del tope de 2026** ($262,6 M en Bogotá y su aglomeración) se calcula como vivienda general y la
   ficha pide preguntar en qué año se liquida el precio.
5. **El índice exige 5 proyectos** por zona, como el «¿Está caro?». Hoy casi ninguna localidad los tiene, porque los avisos
   rara vez imprimen la localidad: la pantalla lo dice en vez de inventar una mediana. Solo cuenta vivienda (sin locales,
   oficinas ni lotes).
6. **Quién coordina la visita:** mientras la constructora no esté en la plataforma, **Innmobiliaria** escribe a la sala
   de ventas y confirma por WhatsApp; la dirección llega con la confirmación. Nunca se publican los teléfonos ni las
   direcciones de la revista. Pedir la visita exige el WhatsApp verificado, como en los usados.
7. **Subsidios:**
   - Solo programas verificados en su norma, con la fecha de su estado. «Sin cupos» se dice; lo no verificado (cajas de
     compensación de 2026, cobertura de tasa) no se muestra.
   - No se suman programas entre sí; el «mejor caso» es el mayor y queda «por confirmar» si el proyecto debe estar inscrito.
8. **Los nombres de proyectos y constructoras salen con sus cifras** (decisión del 2026-10-20). Si la editorial objeta,
   se pasa al índice agregado.

## Fuentes y cómo se regenera

- **Datos:** `assets/datos-187.js`, generado por
  `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/vivienda-nueva/maqueta.mjs` a partir de la transcripción
  privada (`scripts/vivienda-nueva/crudo/`, ignorada) y de `src/data/`. Regenerarlo da los mismos bytes
  (`maqueta.mjs --comprobar`). «Fuente: Estrenar Vivienda, edición 187.»
- **Pintado:** `assets/vivienda-nueva.js` solo formatea lo que trae `datos-187.js`; no calcula nada.
- **Script compartido:** `../comprador/assets/maqueta.js` con la configuración de `assets/config.js` (pantallas, nota de
  datos, secciones y almacén). Sin configuración, la maqueta del comprador se ve igual: 26 de 26 capturas idénticas
  byte a byte antes y después de la enmienda.

## G-Diseño del módulo

**Aprobada el 2026-10-20**, sin cambios, con la frase del usuario: «Sonnet listo construye», dicha tras ver las cinco
pantallas con sus estados y las ocho decisiones de arriba. Con ella se abrió la F3.
