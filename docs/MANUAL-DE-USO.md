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
- **Limitaciones conocidas:** solo Bogotá en esta etapa; solo español. Sin contadores ni cupos
  (llegarán reales más adelante).

### Publicar = registro (flujo de 3 pasos) · desde Sprint 001

- **Qué hace:** registra tu inmueble como fundador en menos de tres minutos, sin fotos ni
  documentos.
- **Cómo se usa:** Inicio → **"Publica tu inmueble como fundador"** →
  1. **Paso 1 (Tú):** tu nombre, tu WhatsApp y tu ciudad.
  2. **Paso 2 (Tu inmueble):** si es venta o arriendo, el tipo, el barrio, el área, las
     habitaciones y el precio esperado. La dirección aproximada es opcional.
  3. **Paso 3 (Revisa y envía):** revisa el resumen, marca la casilla de autorización de datos
     (Ley 1581) y toca **"Publicar mi inmueble"**.
  - Si cierras la página a mitad, al volver el formulario **retoma donde ibas** (se guarda en tu
    navegador). Al terminar verás una pantalla de confirmación con los próximos pasos.
- **Limitaciones conocidas:** las fotos llegan en la siguiente etapa. Sin la casilla de
  autorización no se puede enviar. Si intentas publicar muchas veces seguidas desde la misma
  conexión, el sistema te pedirá esperar (anti-abuso).

### Confirmación de fundador · desde Sprint 001

- **Qué hace:** confirma que el inmueble quedó registrado y explica qué sigue (fotos, verificación,
  apertura a compradores ~octubre).
- **Cómo se usa:** aparece sola al terminar el registro (`/confirmacion`).

### Política de privacidad (Ley 1581) · desde Sprint 001

- **Qué hace:** explica quién trata los datos, para qué, y los derechos del titular.
- **Cómo se usa:** enlace **"política de privacidad"** en el paso 3 y en el pie de página
  (`/privacidad`).
- **Limitaciones conocidas:** el correo de contacto del responsable es provisional hasta la
  publicación oficial de la landing.

### Panel del operador · desde Sprint 001

- **Qué hace:** muestra al equipo de Innmobiliaria todos los inmuebles registrados (contacto,
  datos del inmueble, estado y fecha), del más reciente al más antiguo.
- **Cómo entra el operador:**
  1. Ve a `/operador` (o `/operador/login`).
  2. Escribe el **correo** autorizado del operador y la **contraseña**.
  3. Toca **"Entrar"**. Verás la tabla de registros. Usa **"Cerrar sesión"** para salir.
  - Solo el correo autorizado puede entrar; no hay registro público de cuentas.
- **Limitaciones conocidas:** es una tabla de solo lectura (aún no se editan estados desde aquí).

## Preguntas frecuentes

- **¿Cuánto cuesta publicar?** Nada. Publicar como fundador es gratis y no cobramos comisión.
- **¿Me piden documentos o el CTL?** No. En el registro solo se pide lo básico.
- **¿Sirve para arriendo?** Sí, aunque el mensaje lidera con la venta directa.

## Historial

| Sprint | Features añadidas a este manual                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| 001    | Landing de expectativa, flujo publicar=registro (3 pasos), confirmación, política de privacidad, panel del operador |
