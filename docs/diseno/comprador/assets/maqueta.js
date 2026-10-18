/* =============================================================================
   Maqueta del lado comprador — script compartido por las 13 páginas (S6)
   =============================================================================
   Script clásico a propósito (no módulo): los módulos ES no cargan desde file://
   y esta maqueta se abre con doble clic. Construye la barra de la maqueta (pantalla,
   estado, idioma, nivel del comprador, marco móvil) y da vida a los controles
   dibujados. Cada atributo data-* de las páginas tiene su lector aquí (el gate
   tests/unit/controladores-maqueta lo exige). Nada de esto es código de producto.
   ============================================================================= */
(function () {
  "use strict";

  var PANTALLAS = [
    { a: "index.html", n: "00", es: "Recorrido", en: "Overview" },
    { a: "01-buscar.html", n: "01", es: "Buscar en el mapa", en: "Map search" },
    {
      a: "02-ficha.html",
      n: "02",
      es: "Ficha del anuncio",
      en: "Listing page",
    },
    {
      a: "03-verificar-whatsapp.html",
      n: "03",
      es: "Verificar WhatsApp",
      en: "Verify WhatsApp",
    },
    {
      a: "04-identificarse.html",
      n: "04",
      es: "Identificarse (cédula)",
      en: "ID check (cédula)",
    },
    {
      a: "05-tarjeta-comprador.html",
      n: "05",
      es: "Tarjeta del comprador",
      en: "Buyer card",
    },
    {
      a: "06-agenda.html",
      n: "06",
      es: "Agenda de visita",
      en: "Viewing schedule",
    },
    {
      a: "07-favoritos.html",
      n: "07",
      es: "Favoritos y listas",
      en: "Saved and lists",
    },
    { a: "08-alertas.html", n: "08", es: "Alertas", en: "Alerts" },
    {
      a: "09-esta-caro.html",
      n: "09",
      es: "¿Está caro?",
      en: "Is it overpriced?",
    },
    {
      a: "10-simulador.html",
      n: "10",
      es: "Simulador de cuota",
      en: "Payment calculator",
    },
    { a: "11-papeleo.html", n: "11", es: "Papeleo", en: "Paperwork" },
    {
      a: "12-reportar.html",
      n: "12",
      es: "Reportar y antifraude",
      en: "Report and anti-fraud",
    },
  ];
  var COMPRADOR = [
    ["c0", "Sin verificar", "Not verified"],
    ["c1", "WhatsApp verificado", "WhatsApp verified"],
    ["c2", "Identificado", "ID checked"],
  ];

  var html = document.documentElement;
  var body = document.body;
  var archivo = (
    location.pathname.split("/").pop() || "index.html"
  ).toLowerCase();

  /* --- Parámetros: URL primero, luego lo recordado (try/catch: file:// y modo privado) */
  var q = new URLSearchParams(location.search);
  function recordado(k) {
    try {
      return localStorage.getItem("maqueta-comprador:" + k);
    } catch {
      return null;
    }
  }
  function recordar(k, v) {
    try {
      localStorage.setItem("maqueta-comprador:" + k, v);
    } catch {
      /* sin almacenamiento: la URL lleva el estado */
    }
  }
  function elegir(k, validos, defecto) {
    var v = q.get(k) || recordado(k);
    return validos.indexOf(v) >= 0 ? v : defecto;
  }

  var estados = [];
  try {
    estados = JSON.parse(body.getAttribute("data-estados") || "[]");
  } catch {
    estados = [];
  }
  var claves = estados.map(function (e) {
    return e[0];
  });

  var S = {
    idioma: elegir("idioma", ["es", "en"], "es"),
    marco: elegir("marco", ["libre", "movil"], "libre"),
    comprador: elegir(
      "comprador",
      ["c0", "c1", "c2"],
      body.getAttribute("data-comprador-inicial") || "c0",
    ),
    estado:
      claves.indexOf(q.get("estado")) >= 0 ? q.get("estado") : claves[0] || "",
  };

  /* --- Iconos (sprite inyectado una vez; las páginas usan <use href="#i-…">) */
  var ICONOS = {
    casa: '<path d="M4 11.5 12 5l8 6.5M6 10.5V19h12v-8.5"/>',
    buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    corazon:
      '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    campana:
      '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0"/>',
    caja: '<path d="M4 7h16v12H4zM4 7l2-3h12l2 3M9 11h6"/>',
    mapa: '<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2ZM9 4v14M15 6v14"/>',
    lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    alerta: '<path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.5M12 17.2h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
    chat: '<path d="M5 18.5 4 21l3.6-1.3A8.5 8.5 0 1 0 5 18.5Z"/><path d="M9 11h6M9 14h4"/>',
    calendario:
      '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    compartir: '<path d="M12 4v11M7.5 8.5 12 4l4.5 4.5M5 13v5.5h14V13"/>',
    bandera: '<path d="M5 21V4.5M5 5h11l-2 4 2 4H5"/>',
    filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    cama: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.5"/>',
    area: '<path d="M4 4h16v16H4zM4 9h5M9 4v5M15 20v-5h5"/>',
    escudo:
      '<path d="M12 3.5 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6l-7-2.5Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    documento: '<path d="M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h5M10 16h5"/>',
    herramientas:
      '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    atras: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    copiar:
      '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    persona:
      '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    candado:
      '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    nota: '<path d="M5 4.5h14v15H5zM8.5 9h7M8.5 12.5h7M8.5 16h4"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
  };
  var sprite =
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    Object.keys(ICONOS)
      .map(function (k) {
        return (
          '<symbol id="i-' +
          k +
          '" viewBox="0 0 24 24">' +
          ICONOS[k] +
          "</symbol>"
        );
      })
      .join("") +
    "</svg>";
  body.insertAdjacentHTML("afterbegin", sprite);

  function t(es, en) {
    return S.idioma === "en" ? en : es;
  }

  /* --- Barra de la maqueta ------------------------------------------------ */
  var barra = document.createElement("div");
  barra.className = "maq";
  barra.setAttribute("role", "region");
  body.insertBefore(barra, body.children[1] || null);

  function boton(attrs, texto, activo) {
    return (
      '<button type="button" ' +
      attrs +
      ' aria-pressed="' +
      (activo ? "true" : "false") +
      '">' +
      texto +
      "</button>"
    );
  }
  function pintarBarra() {
    barra.setAttribute(
      "aria-label",
      t("Controles de la maqueta", "Mockup controls"),
    );
    var i = PANTALLAS.findIndex(function (p) {
      return p.a === archivo;
    });
    var opciones = PANTALLAS.map(function (p) {
      return (
        '<option value="' +
        p.a +
        '"' +
        (p.a === archivo ? " selected" : "") +
        ">" +
        p.n +
        " · " +
        (S.idioma === "en" ? p.en : p.es) +
        "</option>"
      );
    }).join("");
    var ant = PANTALLAS[(i - 1 + PANTALLAS.length) % PANTALLAS.length];
    var sig = PANTALLAS[(i + 1) % PANTALLAS.length];
    var estadosHtml = estados
      .map(function (e) {
        return boton(
          'data-maq-estado="' + e[0] + '"',
          S.idioma === "en" ? e[2] : e[1],
          e[0] === S.estado,
        );
      })
      .join("");
    barra.innerHTML =
      '<div class="maq__fila">' +
      '<span class="maq__tag">' +
      t("Maqueta", "Mockup") +
      "</span>" +
      '<label class="sr" for="maq-pantalla">' +
      t("Pantalla", "Screen") +
      "</label>" +
      '<select id="maq-pantalla" data-maq-pantalla>' +
      opciones +
      "</select>" +
      '<span class="maq__grupo">' +
      '<button type="button" data-maq-ir="' +
      ant.a +
      '" aria-label="' +
      t("Pantalla anterior", "Previous screen") +
      '">◀</button>' +
      '<button type="button" data-maq-ir="' +
      sig.a +
      '" aria-label="' +
      t("Pantalla siguiente", "Next screen") +
      '">▶</button>' +
      "</span>" +
      '<span class="maq__sep"></span>' +
      '<span class="maq__grupo" role="group" aria-label="' +
      t("Idioma", "Language") +
      '">' +
      boton('data-idioma-set="es" lang="es"', "ES", S.idioma === "es") +
      boton('data-idioma-set="en" lang="en"', "EN", S.idioma === "en") +
      "</span>" +
      "</div>" +
      (estados.length
        ? '<div class="maq__fila"><span class="maq__nota">' +
          t("Estado", "State") +
          '</span><div class="maq__estados" role="group" aria-label="' +
          t("Estado de la pantalla", "Screen state") +
          '">' +
          estadosHtml +
          "</div></div>"
        : "") +
      '<div class="maq__fila">' +
      '<span class="maq__nota">' +
      t("Comprador", "Buyer") +
      '</span><span class="maq__grupo" role="group" aria-label="' +
      t("Nivel del comprador", "Buyer level") +
      '">' +
      COMPRADOR.map(function (c) {
        return boton(
          'data-maq-comprador="' + c[0] + '"',
          S.idioma === "en" ? c[2] : c[1],
          c[0] === S.comprador,
        );
      }).join("") +
      "</span>" +
      '<span class="maq__nota">' +
      t("Marco", "Frame") +
      '</span><span class="maq__grupo" role="group" aria-label="' +
      t("Marco", "Frame") +
      '">' +
      boton('data-maq-marco="libre"', t("Libre", "Free"), S.marco === "libre") +
      boton(
        'data-maq-marco="movil"',
        t("Móvil 390", "Phone 390"),
        S.marco === "movil",
      ) +
      "</span>" +
      '<span class="maq__nota">' +
      t(
        "Anuncios, precios y personas: datos de ejemplo. Barrios: reales (Catastro Bogotá).",
        "Listings, prices and people: sample data. Neighborhoods: real (Bogotá cadastre).",
      ) +
      "</span>" +
      "</div>";
  }

  /* --- Encabezado y navegación del PRODUCTO (una sola fuente, no 13 copias) -- */
  var SECCIONES = [
    {
      k: "buscar",
      a: "01-buscar.html",
      i: "buscar",
      es: "Buscar",
      en: "Search",
    },
    {
      k: "guardados",
      a: "07-favoritos.html",
      i: "corazon",
      es: "Guardados",
      en: "Saved",
    },
    {
      k: "alertas",
      a: "08-alertas.html",
      i: "campana",
      es: "Alertas",
      en: "Alerts",
    },
    {
      k: "herramientas",
      a: "10-simulador.html",
      i: "herramientas",
      es: "Herramientas",
      en: "Tools",
    },
  ];
  function pintarCabecera() {
    var app = document.querySelector(".app");
    if (!app) return;
    var seccion = body.getAttribute("data-nav") || "";
    // Una pantalla compartida (agenda, antifraude) cambia de lado según el estado.
    var porEstado = {};
    try {
      porEstado = JSON.parse(body.getAttribute("data-lado-por-estado") || "{}");
    } catch {
      porEstado = {};
    }
    var lado =
      porEstado[S.estado] || body.getAttribute("data-lado") || "comprador";
    var viejo = app.querySelector(":scope > .cab");
    if (viejo) viejo.remove();
    var viejas = app.querySelector(":scope > .tabs");
    if (viejas) viejas.remove();
    var logo =
      '<a class="logo" href="index.html" aria-label="' +
      t("Innmobiliaria — inicio", "Innmobiliaria — home") +
      '"><span class="logo__chip" aria-hidden="true"><svg class="ico"><use href="#i-casa"/></svg></span>Innmobiliaria</a>';
    var idioma =
      '<div class="idioma" role="group" aria-label="' +
      t("Idioma", "Language") +
      '"><button type="button" lang="es" data-idioma-set="es" aria-label="Español" aria-pressed="' +
      (S.idioma === "es") +
      '">ES</button><span aria-hidden="true">|</span><button type="button" lang="en" data-idioma-set="en" aria-label="English" aria-pressed="' +
      (S.idioma === "en") +
      '">EN</button></div>';
    var centro = "";
    var derecha = idioma;
    if (lado === "comprador") {
      centro =
        '<nav class="cab__nav" aria-label="' +
        t("Secciones", "Sections") +
        '">' +
        SECCIONES.map(function (s) {
          return (
            '<a href="' +
            s.a +
            '"' +
            (s.k === seccion ? ' aria-current="page"' : "") +
            ">" +
            t(s.es, s.en) +
            "</a>"
          );
        }).join("") +
        "</nav>";
      var yo =
        S.comprador === "c0"
          ? '<a class="yo yo--no" href="03-verificar-whatsapp.html"><svg class="ico ico--s"><use href="#i-escudo"/></svg><span class="yo__txt">' +
            t("Verifica tu WhatsApp", "Verify your WhatsApp") +
            '</span><span class="sr">' +
            t("Sin verificar", "Not verified") +
            "</span></a>"
          : '<a class="yo yo--si" href="04-identificarse.html"><svg class="ico ico--s"><use href="#i-check"/></svg><span class="yo__txt">' +
            (S.comprador === "c2"
              ? t("Identificado", "ID checked")
              : t("WhatsApp verificado", "WhatsApp verified")) +
            '</span><span class="sr">' +
            t("Verificado", "Verified") +
            "</span></a>";
      derecha = yo + idioma;
    } else if (lado === "dueno" || lado === "operador") {
      centro =
        '<span class="eyebrow" style="margin-left:4px">' +
        (lado === "operador"
          ? t("Panel del operador", "Operator panel")
          : t("Tu anuncio", "Your listing")) +
        "</span>";
    }
    app.insertAdjacentHTML(
      "afterbegin",
      '<header class="cab"><div class="cab__in">' +
        logo +
        centro +
        '<div class="cab__der">' +
        derecha +
        "</div></div></header>",
    );
    if (lado === "comprador") {
      app.insertAdjacentHTML(
        "beforeend",
        '<nav class="tabs" aria-label="' +
          t("Secciones", "Sections") +
          '">' +
          SECCIONES.map(function (s) {
            return (
              '<a href="' +
              s.a +
              '"' +
              (s.k === seccion ? ' aria-current="page"' : "") +
              '><svg class="ico"><use href="#i-' +
              s.i +
              '"/></svg>' +
              t(s.es, s.en) +
              "</a>"
            );
          }).join("") +
          "</nav>",
      );
    }
  }

  /* --- Aplicar el estado a la página -------------------------------------- */
  function contiene(lista, v) {
    return (" " + lista + " ").indexOf(" " + v + " ") >= 0;
  }
  function aplicar() {
    html.setAttribute("data-idioma", S.idioma);
    html.lang = S.idioma === "en" ? "en" : "es-CO";
    html.setAttribute("data-comprador", S.comprador);
    body.classList.toggle("marco-movil", S.marco === "movil");
    body.setAttribute("data-estado", S.estado);
    document.querySelectorAll("[data-para-estado]").forEach(function (el) {
      el.hidden = !contiene(el.getAttribute("data-para-estado"), S.estado);
    });
    document.querySelectorAll("[data-para-comprador]").forEach(function (el) {
      el.hidden = !contiene(
        el.getAttribute("data-para-comprador"),
        S.comprador,
      );
    });
    document.querySelectorAll("[data-idioma-set]").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        b.getAttribute("data-idioma-set") === S.idioma ? "true" : "false",
      );
    });
    // Un control de estado con aria-pressed (pestañas, segmentados) refleja el estado actual.
    document
      .querySelectorAll("[data-ir-estado][aria-pressed]")
      .forEach(function (b) {
        var en =
          b.getAttribute("data-activo-en") || b.getAttribute("data-ir-estado");
        b.setAttribute(
          "aria-pressed",
          contiene(en, S.estado) ? "true" : "false",
        );
      });
    // Texto que no admite marcado (opciones de un select, valores de un input): par de atributos.
    document.querySelectorAll("[data-es][data-en]").forEach(function (el) {
      var txt = el.getAttribute(S.idioma === "en" ? "data-en" : "data-es");
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA")
        el.placeholder = txt;
      else el.textContent = txt;
    });
    document.querySelectorAll("[data-aria-es]").forEach(function (el) {
      el.setAttribute(
        "aria-label",
        el.getAttribute(S.idioma === "en" ? "data-aria-en" : "data-aria-es"),
      );
    });
    var titulo = document.querySelector("title[data-titulo-en]");
    if (titulo) {
      if (!titulo.getAttribute("data-titulo-es"))
        titulo.setAttribute("data-titulo-es", titulo.textContent);
      titulo.textContent = titulo.getAttribute(
        S.idioma === "en" ? "data-titulo-en" : "data-titulo-es",
      );
    }
    pintarBarra();
    pintarCabecera();
    document.querySelectorAll("[data-mapa]").forEach(pintarMapa);
    document.querySelectorAll("[data-simulador]").forEach(simular);
    document.querySelectorAll("[data-papeleo]").forEach(calcularPapeleo);
    aplicarPreset();
    recordar("idioma", S.idioma);
    recordar("marco", S.marco);
    recordar("comprador", S.comprador);
  }

  /* --- Navegación entre páginas: lleva idioma, marco y comprador ----------- */
  function urlDe(destino, estado) {
    var p = new URLSearchParams();
    p.set("idioma", S.idioma);
    p.set("marco", S.marco);
    p.set("comprador", S.comprador);
    if (estado) p.set("estado", estado);
    return destino + "?" + p.toString();
  }

  /* --- Dinero por idioma (lo mismo que formatearCOP de la app) ------------- */
  function cop(n) {
    n = Math.round(n);
    return S.idioma === "en"
      ? "COP " + n.toLocaleString("en-US")
      : "$" + n.toLocaleString("es-CO");
  }
  function pct(n, dec) {
    var s = n.toFixed(dec == null ? 1 : dec);
    return (S.idioma === "en" ? s : s.replace(".", ",")) + " %";
  }

  /* --- Mapa ---------------------------------------------------------------- */
  var dibujo = { activo: false, puntos: [], mapa: null };
  function puntosDe(txt) {
    if (!txt) return [];
    return txt
      .trim()
      .split(/\s+/)
      .map(function (par) {
        var xy = par.split(",");
        return [parseFloat(xy[0]), parseFloat(xy[1])];
      });
  }
  function dentro(p, poli) {
    // Rayo horizontal: el mismo criterio que buscar_inmuebles (centroide del barrio ∈ zona).
    var x = p[0];
    var y = p[1];
    var adentro = false;
    for (var i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      var xi = poli[i][0];
      var yi = poli[i][1];
      var xj = poli[j][0];
      var yj = poli[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        adentro = !adentro;
    }
    return adentro;
  }
  function zonaActual(el) {
    if (el._zona !== undefined) return el._zona;
    var zonas = {};
    try {
      zonas = JSON.parse(el.getAttribute("data-zonas") || "{}");
    } catch {
      zonas = {};
    }
    return puntosDe(zonas[S.estado]);
  }
  function pintarMapa(el) {
    var M = window.MAPA;
    var caido =
      !M || contiene(el.getAttribute("data-mapa-caido") || "", S.estado);
    el.classList.toggle("mapa--caido", caido);
    var lienzo = el.querySelector("[data-mapa-lienzo]");
    if (!M || !lienzo) return;
    var con = {};
    try {
      con = JSON.parse(el.getAttribute("data-con") || "{}");
    } catch {
      con = {};
    }
    var foco = el.getAttribute("data-foco");
    var vista =
      el.getAttribute("data-vista") || "0 0 " + M.ancho + " " + M.alto;
    // Etiquetas y puntos en píxeles de PANTALLA: k = unidades SVG por píxel (el viewBox va en «slice»).
    var vb = vista.split(/\s+/).map(Number);
    var cw = lienzo.clientWidth;
    var ch = lienzo.clientHeight;
    var k = cw && ch ? 1 / Math.max(cw / vb[2], ch / vb[3]) : 1;
    var f = function (v) {
      return Math.round(v * k * 10) / 10;
    };
    var zona = zonaActual(el);
    var cerrada = zona.length >= 3 && !(dibujo.activo && dibujo.mapa === el);
    var conCuenta = contiene(
      el.getAttribute("data-sin-cuentas") || "",
      S.estado,
    )
      ? {}
      : con;
    var partes = [];
    var etiquetas = [];
    M.sectores.forEach(function (s) {
      var clase = "sector";
      if (s.r) clase += " sector--rural";
      if (conCuenta[s.c]) clase += " sector--con";
      if (cerrada && conCuenta[s.c] && dentro([s.x, s.y], zona))
        clase += " sector--dentro";
      if (foco === s.c) clase += " sector--foco";
      partes.push(
        '<path class="' +
          clase +
          '" d="' +
          s.d +
          '"><title>' +
          s.n +
          "</title></path>",
      );
      if (conCuenta[s.c]) {
        var n = String(conCuenta[s.c]);
        var w = f(16 + n.length * 8);
        etiquetas.push(
          '<g class="cuenta"><rect x="' +
            (s.x - w / 2) +
            '" y="' +
            (s.y - f(11)) +
            '" width="' +
            w +
            '" height="' +
            f(22) +
            '" rx="' +
            f(11) +
            '"/><text style="font-size:' +
            f(13) +
            'px" x="' +
            s.x +
            '" y="' +
            s.y +
            '">' +
            n +
            '</text></g><text class="nombre" style="font-size:' +
            f(12) +
            "px;stroke-width:" +
            f(3) +
            'px" x="' +
            s.x +
            '" y="' +
            (s.y + f(26)) +
            '">' +
            s.n +
            "</text>",
        );
      } else if (foco === s.c) {
        etiquetas.push(
          '<text class="nombre" style="font-size:' +
            f(14) +
            "px;stroke-width:" +
            f(3) +
            'px" x="' +
            s.x +
            '" y="' +
            s.y +
            '">' +
            s.n +
            "</text>",
        );
      }
    });
    var zonaSvg = "";
    if (zona.length) {
      var pts = zona
        .map(function (p) {
          return p[0] + "," + p[1];
        })
        .join(" ");
      zonaSvg =
        (cerrada
          ? '<polygon class="zona" points="' + pts + '"/>'
          : '<polyline class="zona" fill="none" points="' + pts + '"/>') +
        zona
          .map(function (p) {
            return (
              '<circle class="zona-punto" r="' +
              f(6) +
              '" cx="' +
              p[0] +
              '" cy="' +
              p[1] +
              '"/>'
            );
          })
          .join("");
    }
    lienzo.innerHTML =
      '<svg viewBox="' +
      vista +
      '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' +
      t("Mapa de barrios de Bogotá", "Map of Bogotá neighborhoods") +
      '">' +
      partes.join("") +
      zonaSvg +
      etiquetas.join("") +
      "</svg>";
    filtrarTarjetas(el, cerrada ? zona : null);
    var listo = el.querySelector("[data-mapa-listo]");
    if (listo)
      listo.setAttribute(
        "aria-disabled",
        dibujo.puntos.length >= 3 ? "false" : "true",
      );
  }
  function filtrarTarjetas(el, zona) {
    var raiz = el.closest("[data-busqueda]") || document;
    var visibles = 0;
    raiz.querySelectorAll("[data-sector]").forEach(function (card) {
      var s = (window.MAPA.sectores || []).find(function (x) {
        return x.c === card.getAttribute("data-sector");
      });
      var ok = !zona || (s && dentro([s.x, s.y], zona));
      card.hidden = !ok;
      if (ok) visibles++;
    });
    raiz.querySelectorAll("[data-conteo]").forEach(function (c) {
      c.textContent = String(visibles);
    });
  }
  function puntoSvg(svg, ev) {
    var pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    var p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [Math.round(p.x), Math.round(p.y)];
  }

  /* --- Simulador de cuota (fórmula francesa: cuota fija) ------------------- */
  function valor(raiz, k) {
    var el = raiz.querySelector('[data-sim="' + k + '"]');
    return el ? parseFloat(String(el.value).replace(/[^\d.]/g, "")) || 0 : 0;
  }
  function salida(raiz, k, txt) {
    raiz.querySelectorAll('[data-sim-out="' + k + '"]').forEach(function (o) {
      o.textContent = txt;
    });
  }
  function simular(raiz) {
    var precio = valor(raiz, "precio");
    var inicialPct = valor(raiz, "inicial");
    var anios = valor(raiz, "plazo");
    var tea = valor(raiz, "tasa") / 100;
    var ingresos = valor(raiz, "ingresos");
    var tope = parseFloat(raiz.getAttribute("data-tope") || "0.3");
    var credito = precio * (1 - inicialPct / 100);
    var n = anios * 12;
    var tm = Math.pow(1 + tea, 1 / 12) - 1;
    var cuota =
      tm > 0 ? (credito * tm) / (1 - Math.pow(1 + tm, -n)) : credito / n;
    salida(raiz, "credito", cop(credito));
    salida(raiz, "inicial", cop(precio - credito));
    salida(raiz, "cuota", tea > 0 ? cop(cuota) : "—");
    salida(raiz, "total", tea > 0 ? cop(cuota * n) : "—");
    salida(raiz, "ingresos-min", tea > 0 ? cop(cuota / tope) : "—");
    salida(
      raiz,
      "proporcion",
      tea > 0 && ingresos > 0 ? pct((cuota / ingresos) * 100, 0) : "—",
    );
    var cabe = tea > 0 && ingresos > 0 && cuota <= ingresos * tope;
    raiz.querySelectorAll("[data-sim-si]").forEach(function (b) {
      var cual = b.getAttribute("data-sim-si");
      b.hidden = !(
        (cual === "cabe" && cabe) ||
        (cual === "no-cabe" && tea > 0 && ingresos > 0 && !cabe) ||
        (cual === "sin-tasa" && !(tea > 0))
      );
    });
  }

  /* --- Papeleo (valores 2026 de la investigación; tabla versionada en el producto) */
  function registroORIP(p) {
    // Res. SNR 2026-001726-6 (desde 2-feb-2026), por rango de cuantía.
    if (p <= 12850000) return 53100;
    if (p <= 192800000) return p * 0.00911;
    if (p <= 334100000) return p * 0.01131;
    if (p <= 494800000) return p * 0.0126;
    return p * 0.01333;
  }
  function calcularPapeleo(raiz) {
    var entrada = raiz.querySelector("[data-papeleo-precio]");
    var p = entrada
      ? parseFloat(String(entrada.value).replace(/[^\d]/g, "")) || 0
      : 0;
    var notaria = (30900 + Math.max(0, p - 259300) * 0.003) * 1.19; // Res. SNR 2026-000964-6 + IVA 19 %
    var lineas = {
      "notaria-c": [notaria / 2, notaria / 2],
      "notaria-v": [notaria / 2, notaria / 2],
      retencion: [p * 0.01, p * 0.01],
      beneficencia: [p * 0.0167, p * 0.02],
      registro: [registroORIP(p), registroORIP(p)],
      ctl: [23000, 23000],
    };
    var tot = { comprador: [0, 0], vendedor: [0, 0] };
    Object.keys(lineas).forEach(function (k) {
      var v = lineas[k];
      raiz
        .querySelectorAll('[data-papeleo-linea="' + k + '"]')
        .forEach(function (o) {
          o.textContent =
            v[0] === v[1] ? cop(v[0]) : cop(v[0]) + " – " + cop(v[1]);
        });
      var quien =
        k === "notaria-v" || k === "retencion" ? "vendedor" : "comprador";
      tot[quien][0] += v[0];
      tot[quien][1] += v[1];
    });
    Object.keys(tot).forEach(function (k) {
      raiz
        .querySelectorAll('[data-papeleo-total="' + k + '"]')
        .forEach(function (o) {
          var v = tot[k];
          o.textContent =
            Math.round(v[0]) === Math.round(v[1])
              ? cop(v[0])
              : cop(v[0]) + " – " + cop(v[1]);
        });
    });
  }

  /* --- Valores por estado (p. ej. el simulador «fuera de capacidad») ------- */
  function aplicarPreset() {
    document.querySelectorAll("[data-preset]").forEach(function (raiz) {
      var p = {};
      try {
        p = JSON.parse(raiz.getAttribute("data-preset"));
      } catch {
        p = {};
      }
      var vals = p[S.estado];
      if (!vals || raiz._preset === S.estado) return;
      raiz._preset = S.estado;
      Object.keys(vals).forEach(function (k) {
        var el = raiz.querySelector('[data-sim="' + k + '"]');
        if (el) el.value = vals[k];
      });
      if (raiz.hasAttribute("data-simulador")) simular(raiz);
    });
  }

  /* --- Comparar: hasta 4 ---------------------------------------------------- */
  function contarComparar() {
    var marcados = document.querySelectorAll("[data-comparar]:checked").length;
    document.querySelectorAll("[data-comparar-cuenta]").forEach(function (c) {
      c.textContent = String(marcados);
    });
    document.querySelectorAll("[data-comparar-ir]").forEach(function (b) {
      b.setAttribute("aria-disabled", marcados >= 2 ? "false" : "true");
    });
  }

  /* --- Delegación de eventos ------------------------------------------------ */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest(
      "[data-maq-estado],[data-maq-comprador],[data-maq-marco],[data-maq-ir],[data-idioma-set],[data-ir-estado],[data-alternar],[data-abre],[data-vista-movil],[data-elegir],[data-mapa-dibujar],[data-mapa-listo],[data-mapa-borrar],[data-mapa-lienzo],[data-copiar],a[href]",
    );
    if (!el) return;

    if (el.matches("a[href]")) {
      var href = el.getAttribute("href");
      if (/^[\w-]+\.html$/.test(href)) {
        ev.preventDefault();
        location.href = urlDe(href, el.getAttribute("data-estado-destino"));
      }
      return;
    }
    if (el.hasAttribute("data-maq-estado"))
      S.estado = el.getAttribute("data-maq-estado");
    else if (el.hasAttribute("data-ir-estado")) {
      ev.preventDefault();
      S.estado = el.getAttribute("data-ir-estado");
    } else if (el.hasAttribute("data-maq-comprador"))
      S.comprador = el.getAttribute("data-maq-comprador");
    else if (el.hasAttribute("data-maq-marco"))
      S.marco = el.getAttribute("data-maq-marco");
    else if (el.hasAttribute("data-idioma-set"))
      S.idioma = el.getAttribute("data-idioma-set");
    else if (el.hasAttribute("data-maq-ir")) {
      location.href = urlDe(el.getAttribute("data-maq-ir"));
      return;
    } else if (el.hasAttribute("data-alternar")) {
      var attr =
        el.getAttribute("role") === "switch" ? "aria-checked" : "aria-pressed";
      el.setAttribute(
        attr,
        el.getAttribute(attr) === "true" ? "false" : "true",
      );
      var dep = el.getAttribute("data-alternar");
      if (dep) {
        var objetivo = document.getElementById(dep);
        if (objetivo) objetivo.hidden = el.getAttribute(attr) !== "true";
      }
      return;
    } else if (el.hasAttribute("data-abre")) {
      var panel = document.getElementById(el.getAttribute("data-abre"));
      if (panel) {
        panel.hidden = !panel.hidden;
        el.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
      }
      return;
    } else if (el.hasAttribute("data-vista-movil")) {
      body.setAttribute(
        "data-vista-movil",
        el.getAttribute("data-vista-movil"),
      );
      document.querySelectorAll("[data-vista-movil]").forEach(function (b) {
        b.setAttribute(
          "aria-pressed",
          b === el ||
            b.getAttribute("data-vista-movil") ===
              el.getAttribute("data-vista-movil")
            ? "true"
            : "false",
        );
      });
      document.querySelectorAll("[data-mapa]").forEach(pintarMapa);
      return;
    } else if (el.hasAttribute("data-elegir")) {
      var grupo = el.getAttribute("data-elegir");
      document
        .querySelectorAll('[data-elegir="' + grupo + '"]')
        .forEach(function (b) {
          b.setAttribute("aria-pressed", b === el ? "true" : "false");
        });
      return;
    } else if (el.hasAttribute("data-copiar")) {
      el.setAttribute("data-copiado", "true");
      var hecho = document.getElementById(el.getAttribute("data-copiar"));
      if (hecho) hecho.hidden = false;
      return;
    } else if (el.hasAttribute("data-mapa-dibujar")) {
      var m = el.closest("[data-mapa]");
      dibujo = { activo: true, puntos: [], mapa: m };
      m._zona = dibujo.puntos;
      m.classList.add("mapa--dibujando");
      m.querySelectorAll("[data-mapa-guia]").forEach(function (g) {
        g.hidden = false;
      });
      pintarMapa(m);
      return;
    } else if (el.hasAttribute("data-mapa-listo")) {
      if (dibujo.puntos.length < 3) return;
      var mm = el.closest("[data-mapa]");
      dibujo.activo = false;
      mm.classList.remove("mapa--dibujando");
      mm.querySelectorAll("[data-mapa-guia]").forEach(function (g) {
        g.hidden = true;
      });
      pintarMapa(mm);
      var hay = Array.prototype.some.call(
        document.querySelectorAll("[data-sector]"),
        function (c) {
          return !c.hidden;
        },
      );
      S.estado = hay ? "resultados" : "sin-resultados";
      var zonaDibujada = mm._zona;
      aplicar();
      mm._zona = zonaDibujada;
      pintarMapa(mm);
      return;
    } else if (el.hasAttribute("data-mapa-borrar")) {
      var mb = el.closest("[data-mapa]");
      dibujo = { activo: false, puntos: [], mapa: null };
      mb._zona = [];
      mb.classList.remove("mapa--dibujando");
      mb.querySelectorAll("[data-mapa-guia]").forEach(function (g) {
        g.hidden = true;
      });
      pintarMapa(mb);
      return;
    } else if (el.hasAttribute("data-mapa-lienzo")) {
      var mapa = el.closest("[data-mapa]");
      if (!dibujo.activo || dibujo.mapa !== mapa) return;
      var svg = el.querySelector("svg");
      if (!svg) return;
      dibujo.puntos.push(puntoSvg(svg, ev));
      pintarMapa(mapa);
      return;
    }
    var cambioEstado =
      el.hasAttribute("data-maq-estado") || el.hasAttribute("data-ir-estado");
    // Cambiar de estado reinicia lo dibujado a mano y vuelve a la zona del estado.
    document.querySelectorAll("[data-mapa]").forEach(function (m) {
      delete m._zona;
      m.classList.remove("mapa--dibujando");
      m.querySelectorAll("[data-mapa-guia]").forEach(function (g) {
        g.hidden = true;
      });
    });
    dibujo = { activo: false, puntos: [], mapa: null };
    aplicar();
    // Lo que el estado nuevo abre (una hoja, un aviso) se trae a la vista.
    if (cambioEstado) {
      var foco = document.querySelector("[data-enfocar]:not([hidden])");
      if (foco) foco.scrollIntoView({ block: "center" });
    }
  });

  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el.matches("[data-maq-pantalla]")) {
      location.href = urlDe(el.value);
    } else if (el.matches("[data-comparar]")) {
      if (
        el.checked &&
        document.querySelectorAll("[data-comparar]:checked").length > 4
      ) {
        el.checked = false;
        document.querySelectorAll("[data-comparar-tope]").forEach(function (m) {
          m.hidden = false;
        });
      }
      contarComparar();
    }
  });
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    var sim = el.closest("[data-simulador]");
    if (sim) simular(sim);
    var pap = el.closest("[data-papeleo]");
    if (pap) calcularPapeleo(pap);
  });

  aplicar();
  contarComparar();
})();
