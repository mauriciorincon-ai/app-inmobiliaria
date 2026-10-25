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
escribe al dueño con un toque; desde el Sprint 008 también se identifica con su cédula y pide una
visita; desde el Sprint 009 también guarda favoritos, compara, comparte listas con notas y recibe
alertas por correo; desde el Sprint 010 también decide con números: ve si un precio está en línea con
su zona y calcula cuánto puede pagar; desde el Sprint 012 también mira vivienda nueva con lo que paga de verdad; desde el Sprint 013 la compara con un usado, ve qué subsidios le sirven y pide visitar la sala de ventas; desde el Sprint 014 también ve el papeleo de la compra: cuánto paga cada parte, qué pedir y cuánto tarda cada paso; desde el Sprint 015 también puede reportar un anuncio que le parezca sospechoso) y el del **operador** (el equipo de Innmobiliaria, que ve los registros en un
panel privado). El dueño decide si los compradores verificados pueden escribirle y recibir
solicitudes de visita.

## Primeros pasos

- **Vendedor:** entra a la página principal desde el teléfono, lee la propuesta y toca
  **"Publica tu inmueble como fundador"**. No necesitas crear cuenta ni contraseña.
- **Comprador:** toca **"Buscar"** arriba (o ve a `/buscar`). No necesitas cuenta. Desde ahí también
  tienes **Guardados**, **Alertas** y **Herramientas** (en el teléfono, una barra abajo).
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
- **Cómo se usa:** toca **"Buscar"** (arriba). Encima de los filtros hay dos pestañas, **Usados** (esta
  búsqueda) y **Nuevos** (vivienda nueva; ver más abajo) →
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
  lista y los filtros siguen funcionando y puedes reintentar. Para guardar un anuncio o recibir
  avisos de tu búsqueda, mira **«Guardar y avisar»** abajo. Para escribirle a un dueño, mira
  **«Escribirle a un dueño»** abajo. Los mapas usan datos de OpenStreetMap
  (calles) y de Catastro Bogotá (barrios, licencia CC BY 4.0).

## Escribirle a un dueño (el comprador verifica su WhatsApp) · desde Sprint 007

- **Qué hace:** antes de escribirle a un dueño, pruebas que tu WhatsApp es tuyo. Así el dueño sabe
  que le escribe una persona real con un número real. Verificar el WhatsApp **no prueba quién
  eres**: para eso, la identificación con tu cédula (más abajo) es aparte y opcional. **Para verificarte, Innmobiliaria no te escribe por WhatsApp:
  eres tú quien nos escribe un código.** (La única vez que el equipo te escribe a mano es si pides visitar la sala de
  ventas de un proyecto nuevo, ya confirmada; ver «Visitas a salas de ventas».)
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

## Identificarte, pedir una visita y agendarla · desde Sprint 008

- **Qué hace:** el comprador puede **identificarse** con su cédula (opcional), **pedir una visita** a
  un inmueble contando para qué lo busca, cuánto dice tener y cómo pagaría, y **agendarla** con el
  dueño. El dueño ve su **tarjeta** antes de decir que sí, le propone hasta 3 horarios, el comprador
  confirma uno y a los dos les llega un **recordatorio por correo el día antes**. Todas las horas son
  de Bogotá. **Innmobiliaria no envía mensajes por WhatsApp:** los avisos van por correo y la
  dirección exacta la da el dueño por su propio WhatsApp.
- **Cómo se identifica el comprador:** en **`/identificarse`** (después de verificar su WhatsApp)
  escribe su número de cédula, la fecha de expedición y su nombre completo como en la cédula, acepta
  y toca **«Validar mi cédula»**. Se contrasta con la Registraduría por un proveedor. Si todo
  coincide queda **«Identificado»**; si no, se le dice cómo corregir. Tiene **3 intentos**, y si el
  servicio no responde no se le descuenta ninguno. El número de cédula y la fecha **no se guardan**:
  solo que salió bien y cuándo. Puede **borrar su identificación** cuando quiera desde la misma
  pantalla. Por ahora, solo cédula de ciudadanía colombiana.
- **Cómo pide la visita:** en la ficha, **«Pedir una visita»** (aparece si el dueño activó el
  contacto) → si no ha verificado su WhatsApp, se le lleva a verificarlo → elige **para vivir** o
  **para invertir**, su presupuesto en millones (opcional; lo declara él y no se verifica), cómo
  pagaría (opcional), un mensaje de hasta 300 caracteres y **su correo**, que se usa solo para los
  avisos de esa visita. Al enviar recibe el enlace a **su solicitud**, que también le llega por correo
  y funciona desde cualquier navegador.
- **Qué ve el dueño:** en **Mi anuncio → «Solicitudes de visita»**, una tarjeta por comprador con su
  nombre, los últimos 4 dígitos de su WhatsApp, si está **identificado**, para qué busca, lo que
  declaró y **«Asistió a N de M visitas»** en Innmobiliaria. **Nunca ve su correo.** Puede **proponer
  horarios** (fecha y hora, hasta 3, entre las 6:00 a. m. y las 9:00 p. m.), **«No me interesa»**
  o, si la solicitud está en espera, **«Aceptar igual»**.
- **«Solo compradores identificados»:** en esa misma sección el dueño puede activar la opción. Con
  ella, la solicitud de quien solo verificó su WhatsApp queda **en espera** hasta que el dueño la
  acepte; quien se identificó entra directo. Quien solo verificó su WhatsApp puede seguir
  escribiéndole.
- **Cómo se agenda:** el comprador abre su solicitud, elige uno de los horarios (o **«Ninguno me
  sirve»**, y el dueño propone otros) y **«Confirmar la visita»**. Desde ahí puede **«Agregar a mi
  calendario»** (baja un archivo `.ics` en hora de Bogotá) o cancelar. Solo cuando confirma, el dueño
  ve su **WhatsApp completo** con el botón **«Escribirle por WhatsApp»** para pasarle la dirección
  exacta. Cualquiera de los dos puede cancelar mientras no llegue la hora.
- **El recordatorio:** cada día a las **8:00 a. m. (Bogotá)** el sistema avisa por correo, a ambos, de
  las visitas del día siguiente: **uno por visita y ninguno si se canceló**. Si el dueño no dejó
  correo al publicar, no recibe avisos: ve todo al abrir **Mi anuncio**.
- **Después de la visita:** el dueño marca **«Sí, vino»** o **«No vino»**. Lo que marca aparece en la
  tarjeta del comprador solo como un conteo; nadie ve el detalle.
- **Limitaciones conocidas:** la validación real de cédula y el recordatorio en producción se prueban
  en el ensayo general; hasta entonces, en producción, «Identificarse» responde que no pudo consultar la Registraduría (el simulador es solo de desarrollo y pruebas). No hay selector visual de
  calendario: el dueño escribe la fecha y elige la hora. Si no se identifica con una cédula
  colombiana, no puede identificarse. Un dueño sin correo no recibe avisos.

## Guardar y avisar: favoritos, comparar, listas y alertas · desde Sprint 009

- **Qué hace:** el comprador guarda anuncios con un corazón (sin cuenta), compara hasta 4, arma
  **listas** para decidir con otra persona (con notas) y recibe por **correo** un resumen diario de
  lo nuevo y de lo que bajó de precio en su búsqueda. **Innmobiliaria no envía nada por WhatsApp:**
  los avisos van por correo y, para compartir una lista, tú eliges a quién se la mandas.
- **Navegación:** **Buscar · Guardados · Alertas** (y, desde el Sprint 010, **Herramientas**), arriba
  en el computador y como barra de abajo en el teléfono.
- **Favoritos:** toca el **corazón** de una tarjeta o de la ficha; tócalo de nuevo para quitarlo. No
  necesitas cuenta: se guardan **en este teléfono** (hasta 100). Al **verificar tu WhatsApp** pasan
  a tu cuenta, sin repetirse, y los ves desde cualquier dispositivo donde lo verifiques. Los ves en
  **Guardados → Favoritos**. Si un anuncio ya no está disponible, te lo decimos y puedes quitarlo.
- **Comparar hasta 4:** en **Guardados → Favoritos** marca **«Comparar»** en los anuncios que quieras
  (máximo 4; el quinto avisa que hay que quitar uno) y toca **«Comparar»**. La tabla muestra una
  columna por anuncio con **precio, área, precio por m², habitaciones, el sello del dueño y cuánto
  hace que está vivo**. En el teléfono se desliza de lado. La fila **«¿Está caro?»** llega más
  adelante, con su propia función.
- **Listas compartidas con notas:** en **Guardados → Listas** (pide el WhatsApp verificado) crea una
  lista, agrégale anuncios de tus favoritos y toca **«Compartir por WhatsApp»**: se abre WhatsApp con
  el enlace ya escrito, **sin número** (tú eliges a quién). **Quien abre el enlace ve la lista y las
  notas;** para escribir una nota tiene que verificar su WhatsApp, y en las notas se ve solo su
  **primer nombre**. Tú puedes **«Dejar de compartir»** cuando quieras y el enlace deja de funcionar
  para todos; si compartes de nuevo, el enlace anterior también deja de funcionar. Hasta 10 listas de
  hasta 30 anuncios cada una.
- **Alertas por correo:** en **Buscar** pon tus filtros (o dibuja tu zona) y toca **«Guardar como
  alerta»**. Elige el nombre, qué quieres que te avisemos (**anuncios nuevos** y/o **bajas de
  precio**), escribe tu correo y acepta. **Te llega un correo con «Confirmar»: el enlace te lleva a
  Alertas y ahí tocas «Confirmar mi correo»; hasta entonces no te avisamos de nada** (si nadie lo confirma, la alerta se borra a los 7 días). Después recibes **un
  resumen al día, a las 8:00 de Bogotá, solo si hay algo**.
- **Dejar de recibir, en un clic:** **cada correo** trae **«Dejar de recibirla: un clic»**. No pide
  sesión ni contraseña: abres el enlace y listo. También puedes gestionar la alerta desde el enlace
  del correo.
- **Mis alertas:** en **Alertas** ves las alertas de este teléfono (y las que abras desde el enlace
  «gestionar» de un correo): **pausar y reanudar**, encender o apagar **«anuncios nuevos»** y
  **«bajas de precio»** (siempre queda al menos uno) y **borrar**. Hasta 3 alertas nuevas por correo
  al día.
- **Si eres dueño, el precio:** en **Mi anuncio → Precio** puedes cambiarlo. Si lo **bajas**, quienes
  tienen una alerta que coincide lo reciben en su resumen; si lo subes, no avisamos a nadie. Hasta 5
  cambios por día.
- **Limitaciones conocidas:** el aviso es **un resumen al día**, no «en cuanto aparezca». Es **solo
  por correo**. Las alertas no están en una cuenta: viven en el teléfono que las creó y en el enlace
  «gestionar» de cada correo. Hay un tope diario de correos de alertas; los correos de las visitas
  siempre salen primero. En producción las alertas funcionan cuando están puestas las llaves del servicio de correo y del
  servidor (se prueba en el ensayo general); mientras no lo estén, crear una alerta responde que no está
  disponible y no se guarda nada.

## Decidir con números: ¿está caro?, datos de la zona y simulador · desde Sprint 010

- **Qué hace:** te ayuda a decidir con números y no con corazonadas. En cada ficha ves **si el precio
  está en línea con los anuncios parecidos de su zona** y los **datos de la zona**; en
  **Herramientas** calculas **cuánto pagarías al mes**, **hasta qué precio puedes comprar** y, desde el Sprint 14, qué papeleo trae escriturar (ver «Papeleo sin sorpresas»). Es **un
  rango, no un avalúo**, y **un cálculo, no una aprobación de crédito**.
- **¿Está caro? (en la ficha):** debajo del precio y del área hay una tarjeta con una de cuatro
  respuestas, siempre con símbolo y texto (nunca solo color): **En rango**, **Por encima del rango**,
  **Sospechosamente barato** o **Sin datos suficientes**. Toca **«Ver el detalle»** para ver la barra
  del rango, cuántos anuncios entraron, la fecha y la fuente, y **«Cómo lo calculamos»**.
- **Cómo se calcula:** se compara el precio por m² del anuncio con el de los anuncios parecidos
  (mismo tipo y operación, área dentro de ±30 %, vivos hoy). Se quitan los precios que se salen de
  lo normal y el rango va del **percentil 25 al 75**: la mitad central de lo que piden los dueños.
  Primero cuenta los de su **barrio**; si no alcanzan, los de toda la **localidad** y te lo dice.
  **Con menos de 5 anuncios parecidos no damos rango:** te decimos cuántos hay. **Es el precio que
  piden los dueños, no el de cierre, y no es un avalúo.**
- **Sospechosamente barato:** es un precio 30 % o más por debajo de la mediana de su zona. Te lo
  avisamos con el consejo de siempre: visita antes de pagar, pide el CTL y nunca des anticipos.
- **Datos de la zona:** el **m² mediano de oferta** (de los anuncios de Innmobiliaria), la **oferta
  activa** (cuántos anuncios vivos hay) y el **valor de referencia del m² de terreno** de Catastro
  Bogotá (mediana de las manzanas del barrio, vigencia 2026). **El de Catastro es solo del terreno:**
  sirve de referencia, no es el precio de un apartamento ni de una casa. Cada cifra trae su fuente,
  su fecha y su licencia.
- **Herramientas → simulador de cuota:** escribe el **precio**, la **cuota inicial** (%), el **plazo**
  (5 a 30 años), la **tasa** (déjala vacía para usar la de referencia, o escribe la que te ofrece tu
  banco) y los **ingresos del hogar**. Te dice la **cuota mensual**, el crédito, cuánto pagas en total
  y si la cuota **cabe** o **pasa** del **40 % de tus ingresos**, el tope que fija el Decreto 583 de 2025. También avisa si con tu cuota inicial el crédito pasaría del **70 %** del valor (el máximo para
  vivienda que no es de interés social; en VIS la norma permite hasta 80 %, pero el simulador no
  decide si un inmueble es VIS). Cada norma está citada en la pantalla.
- **La tasa de referencia:** es el promedio de lo que cobraron los bancos por créditos de vivienda
  (no VIS, en pesos, tasa fija) según los datos abiertos de la Superintendencia Financiera. **Siempre
  se muestra con su fecha de corte** (suele ir una o dos semanas atrás); si tiene más de 30 días te
  avisa que puede estar desactualizada. Tu banco fija la tasa real.
- **Lo que puedes pagar:** con tus ingresos, el simulador calcula el precio máximo (redondeado hacia
  abajo al millón). **«Ver lo que puedo pagar»** abre **Buscar** ya filtrado por ese precio, con el
  rótulo «Hasta $X · lo que puedes pagar»; **«Avísame de lo que puedo pagar»** abre una **alerta
  nueva** con ese precio.
- **Tus ingresos no salen de tu teléfono:** se guardan solo en este teléfono y ninguna petición los
  lleva; en los enlaces viaja únicamente el **precio máximo**. **«Borrar mis números de este
  teléfono»** los quita cuando quieras.
- **En la ficha de una venta:** la tarjeta **«Tu cuota»** usa ese cálculo guardado y dice cuánto sería
  la cuota de ese anuncio y si **cabe** o **pasa** de lo que puedes pagar. Si aún no has calculado,
  **«Calcula tu cuota»** te lleva a Herramientas con el precio ya puesto.
- **Si eres dueño:** al **publicar** (paso 2) y en **Mi anuncio → Precio** ves el mismo rango de tu
  zona y si tu precio queda dentro, por encima o muy por debajo, para poner un precio con datos. No
  es un avalúo.
- **Limitaciones conocidas:** el rango sale **solo de los anuncios de Innmobiliaria**, no de todo el
  mercado, y mejora con la cantidad de anuncios: al comienzo muchas zonas dirán «sin datos
  suficientes». El simulador no incluye subsidios, UVR ni leasing, y no es una oferta ni una
  aprobación. Las normas se verificaron en octubre de 2026; si cambian, el simulador se actualiza.

## Vivienda nueva: lo que pagas de verdad · desde Sprint 012

- **Qué hace:** en **Buscar** hay dos pestañas, **Usados** y **Nuevos**. «Nuevos» muestra los proyectos de vivienda
  nueva de Bogotá y la Sabana de la edición vigente de la revista Estrenar Vivienda, con **lo que pagas de verdad**: el
  aviso dice «desde $X», pero comprar cuesta más. No necesitas cuenta. La barra de abajo sigue con sus cuatro secciones.
- **Siempre con su fuente:** cada pantalla dice «Fuente: Estrenar Vivienda, edición N» y, en la ficha, las páginas de la
  revista de donde sale el proyecto. Solo mostramos lo que la revista **imprime** (nombre, constructora, zona y cifras): no
  hay fotos, logos, textos de avisos, teléfonos ni direcciones. Una edición se publica solo cuando una persona del equipo
  revisó una muestra de cinco proyectos contra sus páginas.
- **El índice:** arriba, la **mediana del m² privado** de Bogotá y de la Sabana, y en «Por zona, franja de precio y
  segmento» el detalle. **Con menos de 5 proyectos no damos mediana** y te decimos cuántos hay: hoy casi ninguna localidad los
  tiene porque los avisos rara vez imprimen el barrio. Un proyecto cuyas páginas imprimen cifras distintas no entra al m².
- **La lista:** cada tarjeta trae el **«desde»** del aviso y, más grande, **«Pagas al menos»**. Filtra por zona, franja de
  precio, VIS o No VIS, etapa y año de entrega; «Ver más proyectos» es un enlace y los filtros funcionan sin JavaScript.
- **La ficha del proyecto** (toca una tarjeta):
  - **El precio verdadero.** «Pagas al menos» suma el precio «desde», los **derechos de registro** (Resolución 2026-001726-6 de la
    Superintendencia de Notariado y Registro, a cargo de quien registra) y el **parqueadero que se paga aparte** si el aviso da su
    precio. Cada peso trae su norma y la fecha en que la consultamos. **Es un mínimo, no un total:** lo que falta se **nombra y no
    se suma** (los derechos notariales, que se reparten como diga la promesa de compraventa; el impuesto de registro (la gente lo
    llama «beneficencia»), que se parte entre comprador y vendedor y se ve con tu precio en **Papeleo**, y el IVA de la notaría, que no
    pudimos verificar; el parqueadero sin precio; que el precio puede subir mientras
    se construye si el aviso no dice que es fijo; la hipoteca si compras con crédito).
  - **El m² es «aproximado»** y lo dice: el precio «desde» y el área «desde» no siempre son de la misma unidad. Sin área privada se
    usa la construida y también se dice.
  - **La espera.** Mientras construyen sigues pagando arriendo: te decimos los **meses hasta la entrega** y, si escribes tu
    arriendo, cuánto cuesta esa espera. **Tu arriendo se guarda solo en este teléfono** y ninguna petición lo lleva; «Borrar mi
    arriendo de este teléfono» lo quita cuando quieras.
  - **La ficha honesta.** Cada dato que necesitas para decidir (precio, áreas, VIS o No VIS, etapa, entrega, parqueadero, precio
    fijo, subsidio) aparece como **«Lo dice»**, **«No lo dice»**, **«Ilegible en la revista»** o **«Dos páginas imprimen cifras
    distintas»**. Lo que el aviso no dice **no se adivina**. Los mensajes de venta («Lanzamiento», «Últimas unidades»…) van aparte
    porque no son datos.
- **Lo que puedes pagar también filtra los nuevos:** en **Herramientas** calculas tu precio máximo y, con la pestaña «Nuevos», la
  lista se separa en lo que **cabe**, lo que **no cabe** y lo que **no trae precio**. Se compara con «pagas al menos», no con el
  «desde». Tus ingresos no salen de tu teléfono: solo viaja el tope.
- **Mes sin edición:** las ediciones tienen vigencia (la del 15 de un mes al 15 del siguiente). Pasada la fecha, la pantalla dice
  **«Mes sin edición»**, cuántos días lleva vencida y que los precios pueden haber cambiado; el índice no se presenta como de hoy.
- **Limitaciones conocidas:** solo la revista de un mes, solo Bogotá y la Sabana en el índice, y los proyectos que la revista no
  imprime no existen aquí. Las cifras son un **estimado**: la escritura real la liquidan la notaría y la oficina de registro. Si la
  editorial pide retirar los nombres, la edición se retira de inmediato (un índice sin nombres está pensado, pero no construido).

#### ¿Nuevo o usado? · desde Sprint 013

- **Qué hace:** con **tu presupuesto** y en la **misma zona** (Bogotá o la Sabana), compara los **apartamentos nuevos** que caben, por su
  precio verdadero («pagas al menos»), con los **apartamentos usados en venta** de Innmobiliaria: cuántos hay, el **m² mediano** de cada
  lado y cuánto más (o menos) cuesta el m² estrenando. Entras desde un botón en la pestaña **Nuevos** o desde la ficha de un proyecto.
- **Cómo se usa:** en **Herramientas** calculas lo que puedes pagar y vuelves aquí con ese tope (`Tu presupuesto: $…`). Cambias de zona
  con los dos botones de arriba. Cada apartamento nuevo que cabe sale en una tarjeta, con los **meses de espera** hasta la entrega.
- **Cuándo NO compara, y lo dice:** con **menos de 5 usados comparables** en tu presupuesto y zona («No hay comparación honesta»); con
  menos de 5 apartamentos nuevos que quepan y tengan área privada; en la **Sabana**, porque Innmobiliaria publica solo en Bogotá; y si no
  pudimos leer los usados («No pudimos leer los usados»: eso no quiere decir que no haya).
- **Los usados son anuncios vivos hoy** en Innmobiliaria (su área y su precio), con la fecha de la lectura; no son una tasación. Solo se
  comparan apartamentos con apartamentos. La cuota inicial durante la obra **no** la imprime la revista y no se inventa.

#### ¿Te alcanza con subsidio? · desde Sprint 013

- **Qué hace:** muestra **qué subsidios existen** para comprar vivienda nueva y si **te sirven**, con tres hogares de ejemplo ($4 M, $6 M y $8 M
  al mes) y **«Tu hogar»**, que se calcula con lo que guardaste en «lo que puedes pagar». Entras desde un botón en la pestaña **Nuevos** o
  desde la ficha de un proyecto.
- **Cómo leerlo:** arriba, cuántos proyectos de Bogotá y la Sabana te alcanzan **sin subsidio** y cuántos con **el mejor caso** (el mayor
  subsidio de compra que aplica; queda **por confirmar** porque el proyecto debe estar inscrito en el programa). **Los programas jamás se
  suman entre sí.** La tabla muestra cada programa con su **norma**, su **monto**, lo que dice para el hogar (**Aplica**, **Por confirmar**,
  **No aplica** o **Sin cupos**, siempre con símbolo y texto) y la **fecha de su estado**. «Reduce tu Cuota» alivia la cuota, no el precio.
- **Lo que no mostramos:** un programa que no pudimos verificar en la norma primaria **solo se nombra**, sin monto ni estado.
  Un programa **sin cupos** se dice como tal y no suma.
- **Tus ingresos no salen de tu teléfono:** «Tu hogar» se calcula **en este teléfono** con el mismo motor de los hogares de ejemplo; ninguna
  petición lleva tus ingresos. Si no has calculado «lo que puedes pagar», la sección te invita a hacerlo.
- **Limitaciones conocidas:** las cifras son las de 2026 y las normas se verificaron en octubre de 2026; si un programa cambia, la
  pantalla se actualiza con la nueva fecha. Es un cálculo, **no una aprobación** del subsidio ni del crédito.

#### Visitar la sala de ventas de un proyecto nuevo · desde Sprint 013

- **Qué hace:** en la ficha de un proyecto, **«Pedir una visita»** lleva a la pantalla de la sala de ventas. Mientras la constructora no esté en
  Innmobiliaria, **coordinamos nosotros**: le escribimos a la sala, te proponemos horarios y te confirmamos por WhatsApp. **Ningún dato tuyo
  va a la constructora sin que lo aceptes.**
- **Cómo se usa:**
  1. Necesitas tu **WhatsApp verificado** (como al pedir una visita a un usado); si no lo tienes, la pantalla te lleva a verificarlo y vuelves.
  2. Elige **cuándo te sirve** (entre semana, sábado o domingo), escribe tu **correo** (solo sirve para los avisos de esta visita) y acepta.
     La solicitud lleva solo eso: el proyecto, la franja y el correo.
  3. Recibes un correo con el enlace de **tu solicitud** (`Ver mi solicitud`). Cuando el equipo tenga horarios de la sala, te escribimos y **eliges uno**
     (o dices que ninguno te sirve); queda **confirmada** y puedes agregarla a tu calendario o cancelarla.
  4. La **dirección de la sala te llega por WhatsApp** con la confirmación. Los teléfonos y direcciones de las salas **no se publican ni salen por correo**.
  5. Si en **dos días hábiles** (hora de Bogotá, sin contar festivos) la sala no responde, te avisamos por correo. La solicitud sigue abierta.
- **Mes sin edición:** con la edición vencida la pantalla dice **«Mes sin edición»** y **no ofrece** pedir la visita: los datos pueden haber cambiado.
- **Limitaciones conocidas:** hasta 5 solicitudes abiertas a la vez; una por proyecto; si no se pudo concretar, puedes pedirla de nuevo pasados 14 días.
  El plazo de dos días hábiles no descuenta festivos (el aviso puede llegar un día antes, nunca después). Aún no hay botón para marcar que fuiste.

## Papeleo sin sorpresas · desde Sprint 014

- **Qué hace:** en **Herramientas** hay un selector **Simulador | Papeleo**. «Papeleo» te dice, **antes de firmar la promesa**, cuánto paga el
  comprador y cuánto el vendedor al escriturar, qué documentos pedir, cuánto tarda cada paso y qué dice cada documento. No necesitas cuenta.
  **El precio que escribes se queda en tu teléfono:** ninguna petición lo lleva y no se guarda en ninguna parte.
- **Cómo se usa:**
  1. Escribe el **precio de la compraventa**, elige la **ciudad** del inmueble y el **tipo** de vivienda (normal, VIS o VIP). Si es VIS o VIP,
     marca si tienes un **subsidio** del Estado o de una caja de compensación: sin él, el registro no tiene la tarifa reducida.
  2. En **Ajustes** dices quién vende (una persona o una empresa), cómo se reparten la notaría y el impuesto de registro (por mitades, como dice
     la norma, o todo uno de los dos si así lo pactan), el **avalúo catastral** si lo conoces y si compras con **crédito**.
  3. Cuatro secciones: **Gastos** (una tarjeta «Paga el comprador» y otra «Paga el vendedor»), **Documentos** (qué pedir antes de firmar; las
     casillas son solo para ti y no se guardan), **Plazos** (la línea de tiempo) y **Qué dice cada documento** (las cláusulas más comunes de la
     promesa, la escritura y el registro, con el artículo de donde sale cada una).
  4. En la ficha de un proyecto nuevo y en la de un anuncio usado, el enlace **«Lo que te cuesta escriturar este»** abre la pantalla con el precio,
     la ciudad y el tipo ya puestos.
- **Cada cifra con su norma:** cada línea dice la norma de donde sale y el año de la tarifa; los documentos y los plazos llevan un sello con
  símbolo y texto: **✓ Norma leída**, **● Práctica, no norma** (lo piden la notaría, el banco o la costumbre, no una ley que hayamos consultado)
  o **▲ No verificado**. Lo que no pudimos verificar **se nombra sin cifra**, con quién lo cobra, y el total dice cuántos conceptos faltan: es **lo
  mínimo que pagas**, no el total.
- **Lo que no calculamos, y lo dice:** el **IVA de los derechos notariales** (no encontramos una norma clara), el impuesto de registro **fuera de
  Bogotá y Cundinamarca** (depende de cada departamento), la **retención de una empresa o constructora**, los costos de la **hipoteca** y la
  **ganancia ocasional** del vendedor. Cada hoja adicional de la escritura tiene un cobro aparte que no podemos saber de antemano.
- **«Beneficencia»:** la gente llama así al impuesto de registro; es **un solo impuesto** del departamento (1 % del valor, que en Bogotá y
  Cundinamarca se paga por partes iguales salvo pacto), no un cobro aparte.
- **Tarifas de un año:** las cifras son las de **2026**, leídas de sus resoluciones en octubre de 2026. **Desde el 1 de enero de 2027 la pantalla
  no muestra ninguna cifra de 2026**: dice de qué año son las tarifas que tiene y te manda a la notaría o al liquidador de la Superintendencia de
  Notariado y Registro.
- **Qué dice cada documento:** es un **texto fijo**, sin inteligencia artificial y **sin leer tu documento**. Cada cláusula explica lo que dice la
  norma y qué mirar en tu promesa o tu escritura; **no es asesoría legal**, y cada documento lo repite. Si vende una constructora, las arras y la
  cláusula penal pueden regirse por el Código de Comercio: la cláusula lo dice.
- **Limitaciones conocidas:** es un **estimado** hasta validarlo con el liquidador de la Superintendencia de Notariado y Registro. La tarifa
  notarial única de la VIS no se calcula. Las ciudades salen de las listas del tope de la vivienda de interés social; las demás caen en «Otra
  ciudad». El lector de certificados de tradición está construido, pero **apagado** hasta validarlo con certificados reales: esta pantalla no lo
  muestra.
- **VIS y VIP (desde el Sprint 015):** una **VIP** tiene su propio tope, de **90 salarios mínimos**; por encima se liquida como VIS y lo dice. Una
  VIS o una VIP **sin subsidio** paga el registro completo (la mitad es solo con subsidio) y la notaría de una VIS, porque el artículo de la
  resolución que la rebaja no pide subsidio; que una VIP cuente como VIS ahí es nuestra lectura de la norma, y la pantalla te dice que lo confirmes en la notaría.

## Antifraude, reportar y sesión de fotos · desde Sprint 015

- **Qué hace:** cuatro reglas escritas señalan anuncios al equipo, cualquier comprador con el WhatsApp verificado puede **reportar** un anuncio y el
  dueño puede pedir una **sesión de fotos** desde «Mi anuncio». **Una señal o un reporte jamás ocultan un anuncio**: lo revisa una persona del
  equipo, que decide.
- **Las reglas, a la vista:** la página **«Cómo revisamos los anuncios»** (se llega desde la página de reportar) explica en palabras simples las cuatro
  reglas: un precio **30 % o más por debajo** de la mediana de los anuncios parecidos (con al menos 5 para comparar; con menos, la regla no dice
  nada), una **foto** que se parece a la de otro anuncio con otro teléfono, la **misma matrícula** con otro teléfono y el **mismo WhatsApp** con dos
  nombres o más. Un dueño con dos inmuebles y su propio nombre no cuenta.
- **Reportar un anuncio (el comprador):** en la ficha, **«Reportar este anuncio»**. Hace falta el WhatsApp verificado (si no lo tienes, la página
  te lleva a verificarlo). Eliges uno o varios motivos de una lista, puedes contar más (hasta 500 caracteres) y envías. Un reporte por anuncio y hasta
  **5 al día**. **El dueño no sabe quién reportó**, y el equipo tampoco ve tu nombre ni tu número en la cola. El anuncio sigue igual hasta que el
  equipo decida.
- **Lo que hace el equipo (el operador):** en el panel, **Antifraude** muestra cada anuncio con sus señales (qué vio cada regla) y los reportes
  (motivos y detalle). Tres acciones, cada una con el WhatsApp del dueño y el texto **ya escrito, en su idioma** (la app no envía nada sola):
  **Pausar** (sale de la búsqueda, de su enlace, del contacto y de las visitas; **Reactivar** lo devuelve), **Pedir el CTL al dueño** (el anuncio sigue
  visible; si era verificado queda en «re-verificación pendiente» hasta que lo verifiques de nuevo con un CTL de 30 días o menos, y se queda en la
  cola hasta entonces) y **Descartar** con una razón de la lista y una nota opcional (queda el registro y la señal no vuelve). **Revisar reglas ahora**
  evalúa las reglas en el momento (también corren con el trabajo diario). **Huellar fotos pendientes** calcula en tu navegador la huella de las
  fotos subidas antes de este sprint.
- **El dueño (Mi anuncio):** si el equipo **pausó** el anuncio o **pidió el CTL**, «Mi anuncio» lo dice arriba, sin acusar. Renovar un anuncio en
  pausa le da más días, pero sigue en pausa, y la tarjeta lo dice.
- **Sesión de fotos (el dueño):** en «Mi anuncio», **Sesión de fotos**: eliges la franja (entre semana, sábado o domingo) y la pides; el equipo te
  escribe por WhatsApp para acordar el día. Ves el estado con símbolo y texto (**Pedida → Agendada → Hecha**, o **Cancelada**), la fecha en hora de
  Bogotá y puedes **cancelarla** mientras esté abierta. Una abierta por anuncio y hasta 3 en 30 días. **Pedirla no te cuesta nada ni te compromete.**
- **Sesión de fotos (el operador):** el panel **Sesiones de fotos** lista las abiertas primero. **Agendar** pide la fecha y la hora (de 6:00 a. m. a
  9:00 p. m., hasta 60 días), **Marcar como hecha** y **Cancelar** (el dueño puede pedir otra). Cada tarjeta trae el enlace de WhatsApp con el texto
  ya escrito.
- **Limitaciones conocidas:** las reglas son señales, no pruebas: pueden marcar un anuncio legítimo y por eso las decide una persona. La regla del
  precio solo funciona con 5 o más anuncios parecidos. Las fotos subidas antes de este sprint no tienen huella hasta que el operador las procesa. El
  **lector de certificados de tradición** (pegar el texto del certificado y ver hipotecas, embargos, medidas cautelares, vivienda familiar,
  patrimonio de familia y falsa tradición, cada una con su norma) está construido, pero **apagado** hasta validarlo con certificados reales; cuando
  se encienda aparecerá como una quinta sección en **Papeleo** y lo pegado no saldrá de tu teléfono.

## Features

### Landing de expectativa (seller-first) · desde Sprint 001

- **Qué hace:** presenta la propuesta a vendedores directos de Bogotá (vender sin comisión), con
  los dolores reales del mercado, cómo funciona el registro, lo que ya funciona y lo que sigue
  (compradores verificados, visitas, fotos) y preguntas frecuentes.
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
     recibir avisos sobre tu publicación (fotos, sello y vigencia); sin correo publicas igual, pero no
     recibes avisos automáticos: lo ves todo al abrir tu enlace privado.
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
  hace 2 días»), el **sello** con su explicación y **dónde queda** (barrio y localidad). **Desde el
  Sprint 010** trae también **«¿Está caro?»** y, en una venta, **«Tu cuota»** (ver «Decidir con
  números»).
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

#### Visitas a salas de ventas (panel del operador) · desde Sprint 013

- **Qué hace:** la pestaña **«Visitas a salas»** (`/operador/salas`) es la cola de las solicitudes de visita a salas de ventas de vivienda nueva.
  Cada solicitud trae el **proyecto**, la **página de la revista** donde aparece, el comprador como en el panel de los anuncios (**nombre y los
  4 últimos dígitos** de su WhatsApp hasta que la visita se confirma), la **franja** que pidió y **cuándo vence el plazo** de dos días hábiles.
- **Cómo se usa:**
  1. **Guarda el contacto de la sala** (una vez por proyecto): toca la línea «Falta el contacto de la sala» y escribe el teléfono (con indicativo,
     solo números) y la dirección que encuentres en la revista o en su página. **Solo tú lo ves**; no está en el repositorio ni en ningún lugar público.
     Con los dos campos vacíos se borra.
  2. **«Escribirle a la sala por WhatsApp»** abre WhatsApp con un mensaje ya escrito (el proyecto y la franja, **sin ningún dato del comprador**). Lo envías tú
     desde tu teléfono: **el sistema no manda ningún WhatsApp**.
  3. Con lo que te responda la sala, **«Proponer horarios»** (de 1 a 3, en hora de Bogotá): al comprador le llega un correo con el enlace para elegir.
     Si dice «ninguno me sirve», la solicitud vuelve a **Por atender**.
  4. Confirmada la visita, **«Mandarle la dirección al comprador por WhatsApp»** abre WhatsApp con la dirección de la sala (necesitas haberla guardado) en
     el idioma del comprador. Aquí sí ves su número completo.
  5. **«Rechazar la solicitud»** (si no se pudo concretar) o **«Cancelar la visita»** (si ya estaba confirmada) avisan al comprador por correo.
- **Grupos:** Por atender · Con horarios propuestos · Confirmadas · Cerradas (últimos 30 días). Si pasó el plazo, la fila dice que el comprador ya recibió el aviso de que la sala no responde.
- **Limitaciones conocidas:** el plazo no descuenta festivos; no hay «marcar asistencia» para las salas; el contacto de cada sala lo escribe una persona (la revista no lo trae).

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
- **¿Las alertas me escriben por WhatsApp?** No. Solo por correo, con un resumen al día; la alerta
  nunca usa WhatsApp.
- **¿Reportar un anuncio lo oculta?** No. Lo revisa una persona del equipo, que decide si lo pausa, le pide el CTL al dueño o descarta el reporte.
  El dueño no sabe quién reportó.
- **¿Cuesta la sesión de fotos?** Pedirla no te cuesta nada ni te compromete: el equipo te escribe para acordar el día.
- **¿Cómo dejo de recibir una alerta?** Con el enlace **«Dejar de recibirla: un clic»** que trae cada
  correo (no pide sesión) o desde **Alertas**, con **Borrar**.
- **¿«¿Está caro?» es un avalúo?** No. Es un rango de lo que piden otros dueños por anuncios
  parecidos, con cuántos son, de qué fecha y de dónde salen. Con menos de 5 anuncios parecidos no da
  rango.
- **¿Dónde quedan mis ingresos cuando uso el simulador?** Solo en tu teléfono. Ninguna petición los
  lleva; al buscar o crear una alerta solo viaja el precio máximo. Puedes borrarlos desde Herramientas.
- **¿Se ve mi dirección en el mapa?** No. Tu anuncio aparece como el área de su barrio, nunca como un
  punto, y la dirección no se publica.
- **¿Por qué mi sello dice «re-verificación pendiente»?** Fuiste verificado antes de que el sello
  mostrara la fecha del CTL. Con un CTL nuevo (de máximo 30 días) el sello vuelve a mostrarse completo.
- **¿La página está en inglés y la quiero en español (o al revés)?** Toca **ES** o **EN** arriba a
  la derecha; la página recuerda tu elección.

## Historial

| Sprint | Features añadidas a este manual                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001    | Landing de expectativa, flujo publicar=registro (3 pasos), confirmación, política de privacidad, panel del operador                                                                                                                                                                                                                                                                                                               |
| 002    | Completar anuncio (fotos + descripción + score), enlace privado "mi anuncio", ficha pública compartible, verificación 2 niveles y re-contacto en el panel                                                                                                                                                                                                                                                                         |
| 003    | Cupos de fundador por zona, invitación por WhatsApp (referido), vigencia renovable, paquete de fundador (4 guías), panel de campaña y zonas/cupos del operador, correo opcional en el registro                                                                                                                                                                                                                                    |
| 005    | Español e inglés: selector ES/EN, idioma por navegador y recordado, avisos (correo y WhatsApp) en el idioma del vendedor, política de privacidad en inglés, panel del operador en los dos idiomas                                                                                                                                                                                                                                 |
| 006    | Buscar (comprador): filtros, lista y mapa con zona dibujada; el anuncio se ubica por el barrio del catálogo de Catastro Bogotá (select en publicar); sello con fecha del CTL y «re-verificación pendiente»; «vivo hace N días»; asignar barrio y registrar CTL nuevo en el panel                                                                                                                                                  |
| 007    | Comprador verificado: verificar tu WhatsApp enviando un código (Innmobiliaria solo recibe), contactar al dueño con un toque, «Compradores que abrieron tu chat» en Mi anuncio; el WhatsApp del dueño ya no está en la ficha pública; el sello solo se escribe por el registro del CTL                                                                                                                                             |
| 008    | La visita: identificarte con tu cédula (opcional, el número no se guarda), pedir una visita contando para qué buscas y cómo pagarías, tarjeta del comprador y «solo compradores identificados» en Mi anuncio, proponer hasta 3 horarios, confirmar, calendario `.ics`, recordatorio por correo el día antes y «asistió / no asistió»                                                                                              |
| 009    | Guardar y avisar: favoritos sin cuenta (pasan a tu cuenta al verificar), comparar hasta 4, listas compartidas con notas, alertas por correo con doble confirmación y baja en un clic, resumen diario, navegación Buscar · Guardados · Alertas y precio editable en Mi anuncio                                                                                                                                                     |
| 010    | Decidir con números: «¿Está caro?» como rango P25–P75 con su N, fecha y fuente (nunca un avalúo), datos de la zona, simulador de cuota con el tope del 40 % del Decreto 583 de 2025 y la tasa con su fecha, «lo que puedes pagar» en Buscar y en las alertas, el rango del dueño al publicar, la fila de Comparar y la sección Herramientas                                                                                       |
| 012    | Vivienda nueva: pestaña «Nuevos» en Buscar con el índice de la edición vigente (mediana del m² privado, solo con 5 o más proyectos), la lista con «pagas al menos» y filtros, la ficha del proyecto con cada peso y su norma, lo que falta sumar nombrado, «la espera» con tu arriendo solo en el teléfono, la ficha honesta, «lo que puedes pagar» y «mes sin edición»                                                           |
| 013    | Nuevo o usado: «¿Nuevo o usado?» (apartamentos nuevos frente a usados en venta, mismo presupuesto y zona, con la regla de 5 comparables), «¿Te alcanza con subsidio?» (programas con su norma, año y estado con fecha; «tu hogar» se calcula en el teléfono) y la visita a la sala de ventas (WhatsApp verificado, horarios, confirmación, aviso si la sala no responde en dos días hábiles) con su cola en el panel del operador |
| 014    | Papeleo sin sorpresas: «Papeleo» en Herramientas (junto al simulador) con los gastos de escriturar por actor y su norma, qué pedir, plazos y qué dice cada documento; el precio se queda en el teléfono; lo no verificado se nombra sin cifra; enlace desde las fichas                                                                                                                                                            |
| 015    | Antifraude con reglas a la vista: las cuatro reglas en palabras simples, «Reportar este anuncio» (WhatsApp verificado, el dueño no sabe quién reportó), la cola del operador con pausar, reactivar, pedir el CTL y descartar con razón, avisos del equipo en «Mi anuncio» y la sesión de fotos (pedir, agendar, hecha); el lector de certificados queda construido y apagado |
