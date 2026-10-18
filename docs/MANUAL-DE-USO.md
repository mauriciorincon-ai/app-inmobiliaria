# Innmobiliaria — Manual de uso

> **Documento obligatorio y vivo.** Toda feature que llega a `main` se documenta aquí en el mismo
> sprint (regla 9 del CLAUDE.md). Escrito para el **usuario final** en español llano.

## Qué es esta app

Innmobiliaria es la casa de los **vendedores directos** de inmuebles en Bogotá. Permite publicar un
inmueble como "fundador" —sin comisión y sin intermediarios— y que los compradores lo encuentren.
**Publicar el inmueble ES el registro**: no se pide un correo para una lista de espera,
se pide el inmueble.

Hay tres usos: el del **vendedor** (publica su inmueble), el del **comprador** (desde el Sprint 006
busca y mira los anuncios vivos, sin crear cuenta; desde el Sprint 007, si verifica su WhatsApp, le
escribe al dueño con un toque) y el del **operador** (el equipo de Innmobiliaria, que ve los
registros en un panel privado). El dueño decide si los compradores verificados pueden escribirle;
agenda de visitas, favoritos y alertas todavía no están.

## Primeros pasos

- **Vendedor:** entra a la página principal desde el teléfono, lee la propuesta y toca
  **"Publica tu inmueble como fundador"**. No necesitas crear cuenta ni contraseña.
- **Comprador:** toca **"Buscar"** arriba (o ve a `/buscar`). No necesitas cuenta.
- **Operador:** entra a `/operador`, inicia sesión con el correo y la contraseña del equipo.

## Español e inglés (toda la app) · desde Sprint 005

- **Qué hace:** toda la app —la página principal, el registro, la confirmación, tu anuncio, la
  ficha pública, la renovación, la política de privacidad y el panel del equipo— existe en
  **español y en inglés**. El inglés está pensado para colombianos que viven afuera y para
  extranjeros que compran o arriendan en Bogotá: los términos de aquí (localidad, barrio, CTL,
  matrícula, apartaestudio) se nombran en español y se explican en una línea.
- **Cómo se usa:** al entrar, la página elige el idioma de tu navegador (si tu navegador pide inglés y
  no tiene el español como primera opción, la verás en inglés; en cualquier otro caso, en español). Para cambiarlo toca **ES** o
  **EN** arriba a la derecha: la página se recarga en el otro idioma y **recuerda tu elección** (un
  año). **Los enlaces no cambian:** el mismo enlace de una ficha se ve en el idioma de quien lo abre (la vista previa que WhatsApp arma al pegar un enlace no sabe qué idioma lees: ver la prueba G1 de la guía).
  Tu enlace privado «mi anuncio» tampoco cambia al cambiar de idioma.
- **Los avisos te llegan en el idioma en que publicaste:** el correo de campaña y el mensaje de
  WhatsApp con el que el equipo te escribe salen en ese idioma. La invitación que mandas a otros
  dueños sale en el idioma en que tienes la página abierta, y el mensaje que un interesado te manda
  desde tu ficha sale en el idioma de quien lo envía.
- **Limitaciones conocidas:** el idioma de tus avisos queda fijado al publicar y no se edita
  después. Las **cuatro guías del paquete de fundador siguen en español**; en inglés cada tarjeta
  lo avisa. Los precios se muestran siempre en pesos colombianos (`$420.000.000` en español,
  `COP 420,000,000` en inglés). Un navegador en otro idioma (francés, portugués…) que no acepte
  inglés ve el español, porque el mercado es Bogotá.

## Buscar inmuebles (el comprador) · desde Sprint 006

- **Qué hace:** deja buscar los anuncios **vivos** de dueños directos en Bogotá, por filtros o
  dibujando tu zona en un mapa. No pide cuenta ni datos.
- **Cómo se usa:** toca **"Buscar"** (arriba) →
  1. **Venta / Arriendo:** los dos botones de arriba; volver a tocar el activo lo suelta.
  2. **Filtros:** ábrelos con **"Filtros"** y elige tipo, localidad, precio mínimo y máximo (puedes
     escribirlo con puntos: 300.000.000) y habitaciones. **"Ver resultados"** aplica; cada filtro
     activo aparece como una pastilla con una ✕ que lo quita.
  3. **Dibujar tu zona:** en el mapa toca **"Dibujar zona"**, marca al menos 3 esquinas tocando el
     mapa y toca **"Listo"**: la lista se queda solo con lo que está dentro. **"Borrar zona"** la
     quita. En el teléfono la lista va primero; el mapa se abre con el botón **"Mapa"**.
  4. **Cada tarjeta** muestra el precio, el tipo y el barrio, el área, las habitaciones, el sello
     (⭐ con la fecha del CTL, "re-verificación pendiente" o "fundador") y **"Vivo hace N días"**.
     Tócala para abrir la ficha.
- **Cómo se ubica un anuncio:** por el **área de su barrio** (los barrios son los de Catastro
  Bogotá), **nunca por un punto ni por una dirección**. Un anuncio entra en tu zona si el centro de
  su barrio queda dentro. La dirección exacta no se muestra.
- **La búsqueda se guarda en el enlace:** puedes copiar la dirección de la página y compartirla; al
  abrirla se ve la misma búsqueda. Funciona aun sin el mapa.
- **Limitaciones conocidas:** se muestran los 60 anuncios confirmados más recientemente; afina los
  filtros para ver otros. Un anuncio publicado antes del catálogo de barrios aparece por filtros,
  pero no en una zona dibujada hasta que el operador le asigne su barrio. Si el mapa no carga, la
  lista y los filtros siguen funcionando y puedes reintentar. Por ahora no hay alertas ni favoritos:
  llegan en sprints posteriores. Para escribirle a un dueño, mira **«Escribirle a un dueño»** abajo. Los mapas usan datos de OpenStreetMap
  (calles) y de Catastro Bogotá (barrios, licencia CC BY 4.0).

## Escribirle a un dueño (el comprador verifica su WhatsApp) · desde Sprint 007

- **Qué hace:** antes de escribirle a un dueño, pruebas que tu WhatsApp es tuyo. Así el dueño sabe
  que le escribe una persona real con un número real. **No verificamos quién eres** (cédula,
  documentos): eso es aparte y llega después. **Innmobiliaria nunca te envía mensajes por WhatsApp:
  eres tú quien nos escribe un código.**
- **Cómo se usa:** en la ficha de un anuncio toca **«Escribirle por WhatsApp»** →
  1. Si aún no verificaste, te lo explica y te lleva a **«Verificar mi WhatsApp»**.
  2. Escribe tu nombre y tu celular de Colombia, acepta la política de datos y toca **«Verificar con
     WhatsApp»**.
  3. WhatsApp se abre con un código ya escrito (`INN-` y 6 símbolos) hacia Innmobiliaria: **envíalo
     sin cambiarlo**. Vuelve a la página: en unos segundos dice **«Tu WhatsApp quedó verificado»**.
     Si WhatsApp no se abrió, toca **«No se abrió WhatsApp»**: ahí está el número de Innmobiliaria y
     un botón para copiar el código.
  4. De vuelta en la ficha, **«Escribirle por WhatsApp»** te muestra el mensaje que se abrirá y
     **«Abrir WhatsApp»** abre el chat con el dueño. El contacto queda registrado.
- **Qué ve el dueño:** en **Mi anuncio**, **«Compradores que abrieron tu chat»**: tu nombre, los
  últimos 4 dígitos de tu número y la fecha. Tu número completo no sale en ninguna página pública.
- **Reglas del código:** dura **10 minutos**, sirve **una sola vez** y debe llegar **desde el mismo
  número** que escribiste (si llega de otro, la página lo dice y pides uno nuevo). Si se vence, te
  damos otro. La verificación queda en este navegador: no te la volvemos a pedir.
- **Limitaciones conocidas:** por ahora solo celulares de Colombia. Si borras los datos del
  navegador, hay que verificar de nuevo. Si el dueño no activó el contacto, la ficha lo dice y no
  hay botón. Un anuncio vencido ya no recibe contactos.

## Features

### Landing de expectativa (seller-first) · desde Sprint 001

- **Qué hace:** presenta la propuesta a vendedores directos de Bogotá (vender sin comisión), con
  los dolores reales del mercado, cómo funciona el registro, lo que viene (fotos, compradores
  verificados, avalúo) y preguntas frecuentes.
- **Cómo se usa:** es la página principal (`/`). Desplázate para conocer la propuesta; los botones
  **"Publica tu inmueble como fundador"** (arriba y al final) llevan al registro.
- **Limitaciones conocidas:** solo Bogotá en esta etapa. Está en español y en inglés (ver «Español e inglés (toda la app)»).

### Publicar = registro (flujo de 3 pasos) · desde Sprint 001

- **Qué hace:** registra tu inmueble como fundador en menos de tres minutos, sin fotos ni
  documentos.
- **Cómo se usa:** Inicio → **"Publica tu inmueble como fundador"** →
  1. **Paso 1 (Tú):** tu nombre, tu WhatsApp y tu ciudad.
  2. **Paso 2 (Tu inmueble):** si es venta o arriendo, el tipo, la **localidad** y el **barrio** (se
     elige de la lista oficial de Catastro Bogotá: primero la localidad, luego el barrio), el área,
     las habitaciones y el precio esperado. La dirección aproximada es opcional y **nunca se
     muestra**: en el mapa tu anuncio aparece como el área de tu barrio, no como un punto.
  3. **Paso 3 (Revisa y envía):** revisa el resumen, marca la casilla de autorización de datos
     (Ley 1581) y toca **"Publicar mi inmueble"**. Puedes dejar tu **correo (opcional)** si quieres
     recibir avisos sobre tu publicación (fotos, sello y vigencia); sin correo publicas igual y te
     escribimos por WhatsApp.
  - Si llegaste por el **enlace de invitación** de otro dueño, tu registro queda atribuido a quien te
    invitó, sin que tengas que hacer nada (desde el Sprint 003).
  - Si cierras la página a mitad, al volver el formulario **retoma donde ibas** (se guarda en tu
    navegador). Al terminar verás una pantalla de confirmación con los próximos pasos.
- **Limitaciones conocidas:** el barrio tiene que ser uno de la lista (si el tuyo no aparece, elige el
  más cercano; el operador puede ajustarlo). Sin la casilla de autorización no se puede enviar. Si intentas publicar muchas veces seguidas desde la misma
  conexión, el sistema te pedirá esperar (anti-abuso).

### Confirmación de fundador · desde Sprint 001 (mejorado en S2)

- **Qué hace:** confirma que el inmueble quedó registrado y explica qué sigue. **Desde el S2
  muestra tu enlace privado "mi anuncio"** para que lo guardes y completes tu anuncio cuando
  quieras.
- **Cómo se usa:** aparece sola al terminar el registro (`/confirmacion`). Copia el enlace (botón
  **"Copiar enlace"**) o toca **"Completar mi anuncio ahora"**. Guárdalo: es solo tuyo.

### Completar tu anuncio: fotos + descripción · desde Sprint 002

- **Qué hace:** con tu enlace privado, subes fotos y escribes la descripción; una barra muestra
  qué tan completo está tu anuncio y sube en vivo a medida que avanzas.
- **Cómo se usa:** abre tu enlace **"mi anuncio"** (de la confirmación) desde el teléfono.
  1. **Fotos:** toca "agregar fotos" y elige de tu cámara o galería (hasta 12). Cada foto se
     comprime sola. Puedes elegir la **portada** y **eliminar** las que no quieras. Una foto muy
     pequeña se rechaza con un aviso claro.
  2. **Descripción:** escribe al menos unas líneas siguiendo la guía; toca **"Guardar"**.
  3. **Contacto:** activa la casilla si quieres que los compradores que verificaron su WhatsApp
     puedan escribirte desde tu anuncio (es opcional y reversible). Tu número nunca se ve en la
     página pública.
- **Limitaciones conocidas:** necesitas tu enlace privado para entrar (viene en la confirmación o
  te lo reenvía el operador). Las fotos se guardan comprimidas para cargar rápido.

### Ficha pública compartible · desde Sprint 002

- **Qué hace:** cada inmueble tiene una página propia (`/i/…`) que puedes compartir por WhatsApp;
  al pegar el enlace se ve una vista previa con la foto de portada, el barrio y el precio. **Desde el
  Sprint 006** muestra además **cuánto hace que el dueño lo confirmó** («Vivo: el dueño confirmó
  hace 2 días»), el **sello** con su explicación y **dónde queda** (barrio y localidad).
- **El sello (un solo sello, tres estados):**
  - **⭐ Propietario verificado:** el equipo vio el Certificado de Tradición y Libertad (CTL) y la
    ficha dice **la fecha en que se expidió** (máximo 30 días cuando se vio).
  - **Re-verificación pendiente:** el dueño fue verificado antes de que el sello llevara fecha; la
    ficha lo dice en vez de inventar una fecha, hasta que llegue un CTL nuevo.
  - **Fundador:** todavía sin CTL verificado.
- **Cómo se usa:** comparte el enlace de tu ficha con quien quieras. Muestra las fotos, los datos
  y —solo si tú lo activaste— un botón **«Escribirle por WhatsApp»** para compradores que verificaron
  su WhatsApp (tu número no está en la página). En **Mi anuncio** ves tu propio sello, si tienes CTL
  su fecha, y **quién te escribió**.
- **Limitaciones conocidas:** las fichas no aparecen en buscadores externos (es privado hasta el
  lanzamiento). Tu correo, tu dirección y el número de matrícula nunca son públicos.

### Cupos de fundador por zona · desde Sprint 003

- **Qué hace:** en la página principal muestra cuántos cupos de fundador quedan en tu localidad
  (por ejemplo, "Quedan 7 cupos de fundador en Chapinero").
- **Cómo se usa:** aparece sola en el inicio (`/`), debajo de la presentación. Toca **"Asegura tu
  cupo"** para ir al registro.
- **Limitaciones conocidas:** **los números son reales o no aparecen.** La banda solo se muestra en
  las localidades donde el equipo fijó un cupo; si no hay cupos fijados, no se muestra nada. Aquí no
  se inventan contadores ni urgencias.

### Invita a otro dueño (referido por WhatsApp) · desde Sprint 003

- **Qué hace:** te da un enlace propio para invitar a otros dueños; quien publique con tu enlace
  queda registrado como invitado tuyo, y tú ves cuántos van.
- **Cómo se usa:** en la confirmación o en tu anuncio, busca **"Invita y asegura tu cupo"** y toca
  **"Invitar por WhatsApp"**: se abre WhatsApp con el mensaje y tu enlace listos para enviar.
- **Limitaciones conocidas:** el conteo es de invitados **reales** que ya publicaron. Nunca se
  muestra quién es la otra persona ni sus datos; solo el número.

### Tu anuncio siempre vivo (vigencia y renovación) · desde Sprint 003

- **Qué hace:** cada anuncio tiene una fecha de vigencia (60 días). Antes de vencerse te avisa, y lo
  renuevas con un clic por 60 días más. Aquí no hay anuncios "zombie": lo publicado está vivo.
- **Cómo se usa:** abre tu enlace privado **"mi anuncio"** y mira el bloque de vigencia ("tu anuncio
  está vivo hasta el —"). Toca **"Renovar 60 días"**. También puedes hacerlo desde la página
  `/renovar` con tu enlace.
- **Limitaciones conocidas:** si se vence, tu anuncio deja de verse públicamente hasta que lo
  renueves (no se borra). Renovar necesita tu enlace privado.

### Paquete de fundador (4 guías gratis) · desde Sprint 003

- **Qué hace:** cuatro guías gratuitas para vender directo: **guía fotográfica**, **checklist legal y
  notarial**, **"saca tu CTL en 10 minutos"** y **cómo fijar tu precio**. Es lo que la inmobiliaria
  cobraba dentro de su comisión.
- **Cómo se usa:** busca **"Tu paquete de fundador"** en el inicio, en la confirmación o en tu
  anuncio, y toca la guía que quieras: se abre en una pestaña nueva y puedes guardarla.
- **Limitaciones conocidas:** son guías informativas con sus fuentes citadas; no reemplazan la
  asesoría de un abogado ni de un notario. Están en español también cuando la página está en inglés.

### Política de privacidad (Ley 1581) · desde Sprint 001

- **Qué hace:** explica quién trata los datos, para qué, y los derechos del titular.
- **Cómo se usa:** enlace **"política de privacidad"** en el paso 3 y en el pie de página
  (`/privacidad`).
- **Limitaciones conocidas:** el correo de contacto del responsable es provisional hasta la
  publicación oficial de la landing. Desde el S5 incluye cómo se tratan el número de matrícula y el
  idioma que eliges, y existe también en inglés.

### Panel del operador · desde Sprint 001 (ampliado en S2)

- **Qué hace:** muestra al equipo de Innmobiliaria todos los inmuebles registrados (contacto,
  datos, número de fotos, nivel y fecha). **Desde el S2** trae la **cola de verificación**
  (filtros "Por verificar" / "Verificados"), el botón para **verificar** un inmueble y el de
  **re-contactar** al vendedor por WhatsApp.
- **Cómo entra el operador:**
  1. Ve a `/operador` (o `/operador/login`).
  2. Escribe el **correo** autorizado del operador y la **contraseña**.
  3. Toca **"Entrar"**. Usa **"Cerrar sesión"** para salir. Solo el correo autorizado puede entrar.
  4. El panel también tiene el selector **ES / EN**. Junto al nombre de cada vendedor ves el idioma
     en que publicó (ES o EN): es el idioma de sus avisos.
- **Verificar un inmueble (nivel 2 ⭐):** el vendedor te comparte su Certificado de Tradición y
  Libertad (CTL); tú lo **ves** (nunca se sube a la app), confirmas que el titular coincide, y en
  la fila tocas **"Verificar ⭐"**, escribes el **número de matrícula** y **la fecha en que se
  expidió el CTL** (máximo 30 días: si es más viejo, el formulario lo avisa y no deja confirmar) y
  marcas "Vi el CTL original". El inmueble gana el sello **"Propietario verificado"** y la ficha
  muestra esa fecha. Solo se guardan la matrícula y las fechas; el documento nunca se almacena.
- **Re-verificación pendiente (desde el S6):** los inmuebles verificados antes de que el sello
  llevara fecha aparecen como **"Re-verificación pendiente"**. En su fila tocas **"Registrar CTL
  nuevo"** con el CTL que te lleve el dueño. En **Campaña** hay una plantilla de correo para
  pedirlo («Re-verifica tu sello ⭐») con su filtro «verificados sin fecha de CTL».
- **Anuncios sin barrio del catálogo (desde el S6):** si un anuncio es de antes del catálogo y su
  barrio escrito a mano no coincide con ninguno, la fila dice **"Sin barrio del catálogo"** y
  tiene el botón **"Asignar barrio"**: eliges la localidad y el barrio y desde ese momento el
  anuncio aparece en el área de ese barrio en el mapa de búsqueda.
- **Re-contactar a un fundador:** el botón **"Re-contactar por WhatsApp"** genera un enlace nuevo
  para su anuncio y abre WhatsApp con un mensaje listo que lo invita a completar sus fotos. El
  mensaje sale en el **idioma del vendedor** (el que guardó al publicar), no en el del panel.
- **Limitaciones conocidas:** la verificación la hace una persona (no es automática).

### Panel de campaña del operador · desde Sprint 003

- **Qué hace:** muestra el embudo real de la campaña (cuántos publicaron → cuántos tienen fotos →
  cuántos están verificados) y permite enviar correos por lotes a los fundadores que dejaron su
  correo.
- **Cómo se usa:** en el panel, pestaña **"Campaña"** (`/operador/campana`).
  1. Mira el embudo con las cifras reales del momento.
  2. Para un envío: elige una de las tres plantillas (**completa tu anuncio**, **gana tu sello**,
     **renueva tu vigencia**), revisa cuántos destinatarios trae (y cuántos reciben la versión en
     español y cuántos la inglesa), y toca **"Enviar lote"**. Cada vendedor recibe el correo en el
     idioma en que publicó; la vista previa se ve en el idioma del panel.
  3. Abajo queda el registro de los envíos hechos.
- **Limitaciones conocidas:** se envía por tandas de máximo 300 al día (límite del proveedor de
  correo) y la pantalla indica cuántos quedan. Solo reciben quienes dejaron correo (es opcional).

### Zonas, cupos y densidad · desde Sprint 003

- **Qué hace:** permite fijar cuántos cupos de fundador hay en cada localidad de Bogotá (eso es lo
  que alimenta la banda de cupos del inicio) y ver la densidad de inmuebles por localidad, tipo y
  rango de precio.
- **Cómo se usa:** en el panel, pestaña **"Zonas y cupos"** (`/operador/zonas`): escribe el cupo de
  la localidad y guarda. Si una localidad no tiene cupo fijado, **no se muestra ningún contador** en
  la página principal.
- **Limitaciones conocidas:** el cupo es una decisión del equipo; el número de publicados es real y
  no se puede editar.

## Preguntas frecuentes

- **¿Cuánto cuesta publicar?** Nada. Publicar como fundador es gratis y no cobramos comisión.
- **¿Me piden documentos o el CTL?** No para publicar. El CTL es opcional y solo si quieres el
  sello "Propietario verificado"; lo muestras una vez y nunca se sube a la app.
- **¿Sirve para arriendo?** Sí, aunque el mensaje lidera con la venta directa.
- **¿Quién ve mi WhatsApp?** Nadie en la ficha pública. Solo lo recibe un comprador que verificó su
  propio WhatsApp, y solo si tú activaste el contacto; cada vez que alguien abre el chat contigo lo ves en
  **Mi anuncio** (nombre, últimos 4 dígitos y fecha).
- **¿Innmobiliaria me escribe por WhatsApp para verificarme?** No: eres tú quien nos manda el código.
  Nosotros solo lo recibimos y nunca respondemos por ahí.
- **¿Se ve mi dirección en el mapa?** No. Tu anuncio aparece como el área de su barrio, nunca como un
  punto, y la dirección no se publica.
- **¿Por qué mi sello dice «re-verificación pendiente»?** Fuiste verificado antes de que el sello
  mostrara la fecha del CTL. Con un CTL nuevo (de máximo 30 días) el sello vuelve a mostrarse completo.
- **¿La página está en inglés y la quiero en español (o al revés)?** Toca **ES** o **EN** arriba a
  la derecha; la página recuerda tu elección.

## Historial

| Sprint | Features añadidas a este manual                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001    | Landing de expectativa, flujo publicar=registro (3 pasos), confirmación, política de privacidad, panel del operador                                                                                                                                                                   |
| 002    | Completar anuncio (fotos + descripción + score), enlace privado "mi anuncio", ficha pública compartible, verificación 2 niveles y re-contacto en el panel                                                                                                                             |
| 003    | Cupos de fundador por zona, invitación por WhatsApp (referido), vigencia renovable, paquete de fundador (4 guías), panel de campaña y zonas/cupos del operador, correo opcional en el registro                                                                                        |
| 005    | Español e inglés: selector ES/EN, idioma por navegador y recordado, avisos (correo y WhatsApp) en el idioma del vendedor, política de privacidad en inglés, panel del operador en los dos idiomas                                                                                     |
| 006    | Buscar (comprador): filtros, lista y mapa con zona dibujada; el anuncio se ubica por el barrio del catálogo de Catastro Bogotá (select en publicar); sello con fecha del CTL y «re-verificación pendiente»; «vivo hace N días»; asignar barrio y registrar CTL nuevo en el panel      |
| 007    | Comprador verificado: verificar tu WhatsApp enviando un código (Innmobiliaria solo recibe), contactar al dueño con un toque, «Compradores que abrieron tu chat» en Mi anuncio; el WhatsApp del dueño ya no está en la ficha pública; el sello solo se escribe por el registro del CTL |
