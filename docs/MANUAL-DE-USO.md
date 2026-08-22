# Innmobiliaria — Manual de uso

> **Documento obligatorio y vivo.** Toda feature que llega a `main` se documenta aquí en el mismo
> sprint (regla 9 del CLAUDE.md). Escrito para el **usuario final** en español llano.

## Qué es esta app

Innmobiliaria es la casa de los **vendedores directos** de inmuebles en Bogotá. Permite publicar un
inmueble como "fundador" —sin comisión y sin intermediarios— antes de que la plataforma abra a los
compradores. **Publicar el inmueble ES el registro**: no se pide un correo para una lista de espera,
se pide el inmueble.

En esta primera etapa hay dos usos: el del **vendedor** (publica su inmueble) y el del **operador**
(el equipo de Innmobiliaria, que ve los registros en un panel privado).

## Primeros pasos

- **Vendedor:** entra a la página principal desde el teléfono, lee la propuesta y toca
  **"Publica tu inmueble como fundador"**. No necesitas crear cuenta ni contraseña.
- **Operador:** entra a `/operador`, inicia sesión con el correo y la contraseña del equipo.

## Features

### Landing de expectativa (seller-first) · desde Sprint 001

- **Qué hace:** presenta la propuesta a vendedores directos de Bogotá (vender sin comisión), con
  los dolores reales del mercado, cómo funciona el registro, lo que viene (fotos, compradores
  verificados, avalúo) y preguntas frecuentes.
- **Cómo se usa:** es la página principal (`/`). Desplázate para conocer la propuesta; los botones
  **"Publica tu inmueble como fundador"** (arriba y al final) llevan al registro.
- **Limitaciones conocidas:** solo Bogotá en esta etapa; solo español.

### Publicar = registro (flujo de 3 pasos) · desde Sprint 001

- **Qué hace:** registra tu inmueble como fundador en menos de tres minutos, sin fotos ni
  documentos.
- **Cómo se usa:** Inicio → **"Publica tu inmueble como fundador"** →
  1. **Paso 1 (Tú):** tu nombre, tu WhatsApp y tu ciudad.
  2. **Paso 2 (Tu inmueble):** si es venta o arriendo, el tipo, el barrio, el área, las
     habitaciones y el precio esperado. La dirección aproximada es opcional.
  3. **Paso 3 (Revisa y envía):** revisa el resumen, marca la casilla de autorización de datos
     (Ley 1581) y toca **"Publicar mi inmueble"**. Puedes dejar tu **correo (opcional)** si quieres
     recibir el paquete de fundador y los avisos; sin correo publicas igual.
  - Si llegaste por el **enlace de invitación** de otro dueño, tu registro queda atribuido a quien te
    invitó, sin que tengas que hacer nada (desde el Sprint 003).
  - Si cierras la página a mitad, al volver el formulario **retoma donde ibas** (se guarda en tu
    navegador). Al terminar verás una pantalla de confirmación con los próximos pasos.
- **Limitaciones conocidas:** las fotos llegan en la siguiente etapa. Sin la casilla de
  autorización no se puede enviar. Si intentas publicar muchas veces seguidas desde la misma
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
  3. **Contacto:** activa la casilla si quieres que tu WhatsApp aparezca en la ficha pública (es
     opcional y reversible).
- **Limitaciones conocidas:** necesitas tu enlace privado para entrar (viene en la confirmación o
  te lo reenvía el operador). Las fotos se guardan comprimidas para cargar rápido.

### Ficha pública compartible · desde Sprint 002

- **Qué hace:** cada inmueble tiene una página propia (`/i/…`) que puedes compartir por WhatsApp;
  al pegar el enlace se ve una vista previa con la foto de portada, el barrio y el precio.
- **Cómo se usa:** comparte el enlace de tu ficha con quien quieras. Muestra las fotos, los datos
  y —solo si tú lo activaste— un botón para escribirte por WhatsApp.
- **Limitaciones conocidas:** en esta etapa las fichas no aparecen en buscadores (es privado
  hasta el lanzamiento). Tu correo y el número de matrícula nunca son públicos.

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
  asesoría de un abogado ni de un notario.

### Política de privacidad (Ley 1581) · desde Sprint 001

- **Qué hace:** explica quién trata los datos, para qué, y los derechos del titular.
- **Cómo se usa:** enlace **"política de privacidad"** en el paso 3 y en el pie de página
  (`/privacidad`).
- **Limitaciones conocidas:** el correo de contacto del responsable es provisional hasta la
  publicación oficial de la landing.

### Panel del operador · desde Sprint 001 (ampliado en S2)

- **Qué hace:** muestra al equipo de Innmobiliaria todos los inmuebles registrados (contacto,
  datos, número de fotos, nivel y fecha). **Desde el S2** trae la **cola de verificación**
  (filtros "Por verificar" / "Verificados"), el botón para **verificar** un inmueble y el de
  **re-contactar** al vendedor por WhatsApp.
- **Cómo entra el operador:**
  1. Ve a `/operador` (o `/operador/login`).
  2. Escribe el **correo** autorizado del operador y la **contraseña**.
  3. Toca **"Entrar"**. Usa **"Cerrar sesión"** para salir. Solo el correo autorizado puede entrar.
- **Verificar un inmueble (nivel 2 ⭐):** el vendedor te comparte su Certificado de Tradición y
  Libertad (CTL); tú lo **ves** (nunca se sube a la app), confirmas que el titular coincide, y en
  la fila tocas **"Verificar ⭐"**, escribes el **número de matrícula** y marcas "Vi el CTL
  original". El inmueble gana el sello **"Propietario verificado"** en su ficha. Solo se guardan
  la matrícula y la fecha; el documento nunca se almacena.
- **Re-contactar a un fundador:** el botón **"Re-contactar por WhatsApp"** genera un enlace nuevo
  para su anuncio y abre WhatsApp con un mensaje listo que lo invita a completar sus fotos.
- **Limitaciones conocidas:** la verificación la hace una persona (no es automática).

### Panel de campaña del operador · desde Sprint 003

- **Qué hace:** muestra el embudo real de la campaña (cuántos publicaron → cuántos tienen fotos →
  cuántos están verificados) y permite enviar correos por lotes a los fundadores que dejaron su
  correo.
- **Cómo se usa:** en el panel, pestaña **"Campaña"** (`/operador/campana`).
  1. Mira el embudo con las cifras reales del momento.
  2. Para un envío: elige una de las tres plantillas (**completa tu anuncio**, **gana tu sello**,
     **renueva tu vigencia**), revisa cuántos destinatarios trae, y toca **"Enviar"**.
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
- **¿Quién ve mi WhatsApp?** Nadie en la ficha pública, a menos que tú actives esa opción.

## Historial

| Sprint | Features añadidas a este manual                                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001    | Landing de expectativa, flujo publicar=registro (3 pasos), confirmación, política de privacidad, panel del operador                                                                            |
| 002    | Completar anuncio (fotos + descripción + score), enlace privado "mi anuncio", ficha pública compartible, verificación 2 niveles y re-contacto en el panel                                      |
| 003    | Cupos de fundador por zona, invitación por WhatsApp (referido), vigencia renovable, paquete de fundador (4 guías), panel de campaña y zonas/cupos del operador, correo opcional en el registro |
