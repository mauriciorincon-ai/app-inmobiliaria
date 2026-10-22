/* Configuración de la maqueta compartida (../comprador/assets/maqueta.js) para la maqueta de vivienda nueva (S11):
   sus pantallas, su nota de datos, a dónde llevan las secciones del producto y su propio almacén local. */
window.MAQUETA_CONFIG = {
  almacen: "maqueta-vivienda-nueva",
  pantallas: [
    { a: "index.html", n: "00", es: "Recorrido", en: "Overview" },
    {
      a: "01-indice.html",
      n: "01",
      es: "Índice de vivienda nueva",
      en: "New-home index",
    },
    {
      a: "02-proyecto.html",
      n: "02",
      es: "Ficha del proyecto",
      en: "Project page",
    },
    {
      a: "03-nuevo-o-usado.html",
      n: "03",
      es: "¿Nuevo o usado?",
      en: "New or resale?",
    },
    {
      a: "04-te-alcanza.html",
      n: "04",
      es: "¿Te alcanza con subsidio?",
      en: "Can a subsidy get you there?",
    },
    {
      a: "05-visita.html",
      n: "05",
      es: "Visita a la sala de ventas",
      en: "Sales-room visit",
    },
  ],
  nota: {
    es: "Proyectos y cifras: reales (Estrenar Vivienda, edición 187, procesada). Hogar, arriendo y usados: de ejemplo.",
    en: "Projects and figures: real (Estrenar Vivienda, edition 187, processed). Household, rent and resale homes: sample data.",
  },
  secciones: {
    buscar: "01-indice.html",
    guardados: "../comprador/07-favoritos.html",
    alertas: "../comprador/08-alertas.html",
    herramientas: "../comprador/10-simulador.html",
  },
};
