/* =============================================================================
   Maqueta de vivienda nueva (S11) — pinta los datos de la edición 187
   =============================================================================
   Script clásico (la maqueta se abre con doble clic, sin servidor). Corre ANTES
   de ../comprador/assets/maqueta.js: llena los huecos [data-vn] con lo que trae
   window.DATOS_187 y deja todo en pares <t-es>/<t-en> y bloques
   data-para-estado, que la maqueta compartida muestra u oculta. Aquí NO se
   calcula nada: cada cifra viene hecha de los motores (scripts/vivienda-nueva/
   maqueta.mjs); este archivo solo la formatea. Nada de esto es código de producto.
   ============================================================================= */
(function () {
  "use strict";

  var D = window.DATOS_187;
  if (!D) return;

  /* --- Utilidades ----------------------------------------------------------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function par(es, en) {
    return "<t-es>" + es + "</t-es><t-en>" + en + "</t-en>";
  }
  function miles(n, sep) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function cop(n) {
    return par("$" + miles(n, "."), "COP " + miles(n, ","));
  }
  function millones(n) {
    var x = (n / 1e6).toFixed(1);
    return par("$" + x.replace(".", ",") + " M", "COP " + x + "M");
  }
  function m2(n) {
    var x = (n / 1e6).toFixed(2);
    return par("$" + x.replace(".", ",") + " M/m²", "COP " + x + "M/m²");
  }
  var MESES = [
    ["enero", "January"],
    ["febrero", "February"],
    ["marzo", "March"],
    ["abril", "April"],
    ["mayo", "May"],
    ["junio", "June"],
    ["julio", "July"],
    ["agosto", "August"],
    ["septiembre", "September"],
    ["octubre", "October"],
    ["noviembre", "November"],
    ["diciembre", "December"],
  ];
  function diaEs(iso) {
    var p = iso.split("-");
    return Number(p[2]) + " de " + MESES[Number(p[1]) - 1][0] + " de " + p[0];
  }
  function diaEn(iso) {
    var p = iso.split("-");
    return MESES[Number(p[1]) - 1][1] + " " + Number(p[2]) + ", " + p[0];
  }
  function dia(iso) {
    return par(diaEs(iso), diaEn(iso));
  }
  function mes(aaaamm, precision) {
    var p = aaaamm.split("-");
    var m = MESES[Number(p[1]) - 1];
    if (precision === "anio") return par("durante " + p[0], "during " + p[0]);
    if (precision === "mes")
      return par(m[0] + " de " + p[0], m[1] + " " + p[0]);
    return par("hasta " + m[0] + " de " + p[0], "by " + m[1] + " " + p[0]);
  }
  function lista(ids) {
    var porId = {};
    D.proyectos.forEach(function (p) {
      porId[p.id] = p;
    });
    return ids.map(function (id) {
      return porId[id];
    });
  }
  function proyecto(id) {
    return lista([id])[0];
  }
  function vacio(v) {
    return v === "no_lo_dice" || v === "ilegible";
  }
  var FUENTE = par(
    "Fuente: Estrenar Vivienda, edición " + D.edicion.numero,
    "Source: Estrenar Vivienda, edition " + D.edicion.numero,
  );

  /* --- Diccionario de identificadores de los motores ----------------------- */
  var T = {
    region: {
      bogota: ["Bogotá", "Bogotá city"],
      sabana: ["Sabana de Bogotá", "Bogotá savanna"],
      otra: ["Otras regiones", "Other regions"],
      sin_ciudad: ["Sin ciudad impresa", "No city printed"],
    },
    segmento: {
      VIS: ["VIS", "VIS (social housing)"],
      VIP: ["VIP", "VIP (priority housing)"],
      "No VIS": ["No VIS", "Non-VIS"],
      mixto: ["VIS y No VIS", "VIS and non-VIS"],
      no_lo_dice: ["No dice si es VIS", "VIS status not stated"],
      ilegible: ["Segmento ilegible", "Segment illegible"],
    },
    etapa: {
      sobre_planos: ["Sobre planos", "Off-plan"],
      en_construccion: ["En construcción", "Under construction"],
      entrega_inmediata: ["Entrega inmediata", "Ready to move in"],
    },
    parqueadero: {
      incluido: ["Incluido", "Included"],
      adicional: ["Se paga aparte", "Paid separately"],
      hay_sin_precio: [
        "Hay, sin decir si va incluido",
        "Available, inclusion not stated",
      ],
    },
    partida: {
      precio_desde: ["Precio «desde» del aviso", "The ad's «from» price"],
      derechos_registro: [
        "Derechos de registro (estimado, a cargo de quien registra)",
        "Registration fees (estimate, paid by whoever registers)",
      ],
      parqueadero: [
        "Parqueadero que se paga aparte",
        "Parking paid separately",
      ],
    },
    campo: {
      precio_desde: ["Precio desde", "Price from"],
      area_privada_desde: ["Área privada", "Private area"],
      area_construida_desde: ["Área construida", "Built area"],
      segmento: ["VIS o No VIS", "VIS or non-VIS"],
      etapa: ["Etapa de la obra", "Construction stage"],
      entrega: ["Fecha de entrega", "Handover date"],
      parqueadero: ["Parqueadero", "Parking"],
      precio_fijo: ["Precio fijo", "Fixed price"],
      subsidio_anunciado: ["Subsidio", "Subsidy"],
      area_privada_hasta: ["Área privada máxima", "Largest private area"],
      area_construida_hasta: ["Área construida máxima", "Largest built area"],
      sector: ["Barrio", "Neighborhood"],
      ciudad: ["Ciudad", "City"],
      constructora: ["Constructora", "Builder"],
    },
    clase: {
      verificable: ["Lo dice", "Stated"],
      no_lo_dice: ["No lo dice", "Not stated"],
      ilegible: ["Ilegible en la revista", "Illegible in the magazine"],
      en_conflicto: [
        "Dos páginas imprimen cifras distintas",
        "Two pages print different figures",
      ],
    },
    rotulo: {
      lanzamiento: ["Lanzamiento", "Launch"],
      ultimas_unidades: ["Últimas unidades", "Last units"],
      descuento: ["Descuento", "Discount"],
      cuota_inicial_flexible: [
        "Cuota inicial flexible",
        "Flexible down payment",
      ],
      mejor_precio: ["«El mejor precio»", "«The best price»"],
      mejor_ubicacion: ["«La mejor ubicación»", "«The best location»"],
      renta_turistica: ["Para rentar a turistas", "For short-term rentals"],
      financiacion_directa: ["Financiación directa", "Developer financing"],
    },
    motivo: {
      ingreso: [
        "Tus ingresos pasan el tope del programa",
        "Your income is above the program cap",
      ],
      fuera_de_bogota: [
        "Solo para proyectos en Bogotá",
        "Only for projects in Bogotá",
      ],
      no_vis: ["El proyecto no es VIS", "The project is not VIS"],
      segmento_no_lo_dice: [
        "El aviso no dice si es VIS",
        "The ad does not say whether it is VIS",
      ],
      supera_tope_vis: [
        "El precio pasa el tope VIS de 2026",
        "The price is above the 2026 VIS cap",
      ],
      proyecto_inscrito: [
        "El proyecto debe estar inscrito en el programa: pregúntalo en la sala",
        "The project must be enrolled in the program: ask at the sales room",
      ],
      sin_cupos: [
        "Sin cupos a la fecha de la fuente",
        "No places as of the source date",
      ],
      suspendido: ["Suspendido", "Suspended"],
    },
    estadoPrograma: {
      aplica: ["Aplica", "Applies"],
      por_confirmar: ["Por confirmar", "To be confirmed"],
      no_aplica: ["No aplica", "Does not apply"],
      sin_cupos: ["Sin cupos", "No places"],
    },
  };
  function tr(grupo, id) {
    var x = T[grupo][id];
    return x ? par(x[0], x[1]) : esc(id);
  }

  function faltante(f, p) {
    switch (f.id) {
      case "derechos_registro":
        return par(
          "Derechos de registro: no pudimos verificar la tarifa en la norma, no se suman.",
          "Registration fees: we could not verify the rate in the rule, so they are not added.",
        );
      case "derechos_notariales":
        if (f.monto === undefined)
          return par(
            "Derechos notariales: no los pudimos verificar en la norma para este caso, no se suman.",
            "Notary fees: we could not verify them in the rule for this case, so they are not added.",
          );
        return par(
          "Derechos notariales de la compraventa: " +
            "<span class=num>$" +
            miles(f.monto, ".") +
            "</span>. Se reparten como diga la promesa de compraventa.",
          "Notary fees for the sale: <span class=num>COP " +
            miles(f.monto, ",") +
            "</span>. They are split as the purchase promise says.",
        );
      case "impuesto_registro":
        return par(
          "Impuesto de registro y beneficencia: no los pudimos verificar en la norma, no se suman.",
          "Registration tax and charity levy: we could not verify them in the rule, so they are not added.",
        );
      case "iva_notarial":
        return par(
          "IVA y hojas de la notaría: no verificados.",
          "Notary VAT and paper: not verified.",
        );
      case "parqueadero_sin_precio":
        return par(
          "Parqueadero: el aviso no da su precio.",
          "Parking: the ad gives no price.",
        );
      case "parqueadero_no_lo_dice":
        return par(
          "Parqueadero: el aviso no dice si va incluido.",
          "Parking: the ad does not say whether it is included.",
        );
      case "parqueadero_en_conflicto":
        return par(
          "Parqueadero: dos páginas de la revista imprimen datos distintos, no se suma.",
          "Parking: two pages of the magazine print different figures, so it is not added.",
        );
      case "clase_en_conflicto":
        return par(
          "Dos páginas de la revista imprimen datos distintos sobre si es VIS o sobre la ciudad: el registro se calculó con el caso más barato y puede costar más.",
          "Two pages of the magazine print different figures on whether it is VIS or on the city: registration was computed with the cheapest case and may cost more.",
        );
      case "subidas_en_obra":
        return par(
          "El aviso no dice que el precio sea fijo: puede subir mientras se construye.",
          "The ad does not say the price is fixed: it may rise during construction.",
        );
      case "hipoteca":
        return par(
          "Si compras con crédito, la hipoteca suma derechos de notaría y de registro.",
          "If you buy with a loan, the mortgage adds notary and registration fees.",
        );
      case "segmento_no_lo_dice":
        return par(
          "El aviso no dice si es VIS: el registro se calculó como VIS, el caso más barato. Si no lo es, cuesta el doble.",
          "The ad does not say whether it is VIS: registration was computed as VIS, the cheapest case. If it is not, it costs twice as much.",
        );
      case "exencion_vip_con_subsidio":
        return par(
          "VIP: el registro queda exento solo si recibes subsidio.",
          "VIP: registration is exempt only if you get a subsidy.",
        );
      case "registro_sin_subsidio":
        if (f.monto === undefined)
          return par(
            "VIS: el registro se sumó con la mitad, que es solo con subsidio de vivienda del Estado o de una caja de compensación. Sin subsidio cuesta más; la tarifa general no está verificada para este año.",
            "VIS: registration was added at half, which only applies with a housing subsidy from the State or a family compensation fund. Without a subsidy it costs more; the general rate is not verified for this year.",
          );
        return par(
          "VIS: el registro se sumó con la mitad, que es solo con subsidio de vivienda del Estado o de una caja de compensación. Sin subsidio, el registro cuesta " +
            "<span class=num>$" +
            miles(f.monto, ".") +
            "</span> (Res. SNR 2026-001726-6, art. 17, parágrafo 2).",
          "VIS: registration was added at half, which only applies with a housing subsidy from the State or a family compensation fund. Without a subsidy, registration costs <span class=num>COP " +
            miles(f.monto, ",") +
            "</span> (SNR Res. 2026-001726-6, art. 17, paragraph 2).",
        );
      case "supera_tope_vis":
        return par(
          "Se anuncia como VIS, pero su precio pasa el tope VIS de 2026 en " +
            esc(p.ciudad) +
            ": se calculó como vivienda general. Pregunta en qué año se liquida el precio.",
          "It is advertised as VIS, but its price is above the 2026 VIS cap in " +
            esc(p.ciudad) +
            ": computed as regular housing. Ask which year the price is set in.",
        );
      default:
        return esc(f.id);
    }
  }

  /* --- Bloques -------------------------------------------------------------- */
  function zonaTexto(p) {
    var partes = [];
    if (!vacio(p.sector)) partes.push(esc(p.sector));
    if (!vacio(p.ciudad)) partes.push(esc(p.ciudad));
    return partes.length
      ? partes.join(" · ")
      : par("Sin zona impresa", "No area printed");
  }

  function etiquetaSegmento(p) {
    return '<span class="chip">' + tr("segmento", p.segmento) + "</span>";
  }

  function tarjeta(p, conTope) {
    var pv = p.precioVerdadero;
    var cuerpo =
      '<p class="eyebrow" style="margin:0">' +
      zonaTexto(p) +
      "</p>" +
      '<h3 class="h2" style="margin:2px 0 0">' +
      (vacio(p.nombre)
        ? par("Nombre ilegible en la revista", "Name illegible in the magazine")
        : esc(p.nombre)) +
      "</h3>" +
      '<p class="mute" style="margin:0">' +
      (vacio(p.constructora)
        ? par("Constructora no impresa", "Builder not printed")
        : esc(p.constructora)) +
      "</p>" +
      '<div class="chips" style="margin:6px 0">' +
      etiquetaSegmento(p) +
      (p.ficha.faltan > 0
        ? '<span class="chip">' +
          par(
            "Calla " +
              p.ficha.faltan +
              " de " +
              p.ficha.datos.length +
              " datos",
            "Silent on " +
              p.ficha.faltan +
              " of " +
              p.ficha.datos.length +
              " facts",
          ) +
          "</span>"
        : "") +
      "</div>";
    if (pv.estado === "calculado") {
      cuerpo +=
        '<p style="margin:0">' +
        par("Desde", "From") +
        ' <span class="num">' +
        millones(pv.desde) +
        "</span></p>" +
        '<p style="margin:0"><strong>' +
        par("Pagas al menos", "You pay at least") +
        ' <span class="num">' +
        millones(pv.alMenos) +
        "</span></strong></p>" +
        (pv.m2.base
          ? '<p class="mute" style="margin:0">≈ <span class="num">' +
            m2(pv.m2.valor) +
            "</span> " +
            (pv.m2.base === "privada"
              ? par("de área privada", "of private area")
              : par("de área construida", "of built area")) +
            "</p>"
          : '<p class="mute" style="margin:0">' +
            (pv.m2.razon === "en_conflicto"
              ? par(
                  "Cifras en conflicto: no hay m²",
                  "Conflicting figures: no price per m²",
                )
              : par("Sin área: no hay m²", "No area: no price per m²")) +
            "</p>");
    } else {
      cuerpo +=
        '<p style="margin:0"><strong>' +
        (pv.estado === "en_conflicto"
          ? par(
              "Las páginas imprimen precios distintos",
              "The pages print different prices",
            )
          : par("El aviso no da precio", "The ad gives no price")) +
        "</strong></p>";
    }
    var clase =
      "card caja pila vn-tarjeta" +
      (conTope === "no" ? " vn-tarjeta--fuera" : "");
    return (
      '<a class="' + clase + '" href="02-proyecto.html">' + cuerpo + "</a>"
    );
  }

  /** Las primeras `n` tarjetas a la vista y el resto tras un botón (la lista entera es larga para revisarla). */
  function rejilla(items, conTope, id, n) {
    var html =
      n > 0
        ? '<div class="rejilla-anuncios">' +
          items
            .slice(0, n)
            .map(function (p) {
              return tarjeta(p, conTope);
            })
            .join("") +
          "</div>"
        : "";
    var resto = items.slice(n);
    if (resto.length) {
      html +=
        '<button type="button" class="btn btn--sec btn--peq vn-mas" data-abre="' +
        id +
        '" aria-expanded="false">' +
        (n > 0
          ? par(
              "Ver los otros " + resto.length,
              "See the other " + resto.length,
            )
          : par("Ver los " + resto.length, "See all " + resto.length)) +
        '</button><div id="' +
        id +
        '" hidden><div class="rejilla-anuncios">' +
        resto
          .map(function (p) {
            return tarjeta(p, conTope);
          })
          .join("") +
        "</div></div>";
    }
    return html;
  }

  function grupoIndice(g, nombre) {
    var cifra =
      g.estado === "mediana"
        ? '<span class="num vn-cifra">' + m2(g.medianaM2) + "</span>"
        : '<span class="vn-sindatos">' +
          par("Sin datos suficientes", "Not enough data") +
          "</span>";
    var detalle =
      g.estado === "mediana"
        ? par(
            g.n +
              " proyectos · " +
              g.conArea +
              " traen área privada · mediana de " +
              g.usados,
            g.n +
              " projects · " +
              g.conArea +
              " give private area · median of " +
              g.usados,
          )
        : par(
            g.n +
              (g.n === 1 ? " proyecto · " : " proyectos · ") +
              g.conArea +
              " con área privada · hacen falta " +
              g.minimo,
            g.n +
              (g.n === 1 ? " project · " : " projects · ") +
              g.conArea +
              " with private area · " +
              g.minimo +
              " needed",
          );
    return (
      "<tr><th scope=row>" +
      nombre +
      "</th><td>" +
      cifra +
      '</td><td class="mute">' +
      detalle +
      "</td></tr>"
    );
  }

  var FRANJAS = {
    hasta_150: ["Hasta $150 M", "Up to COP 150M"],
    hasta_tope_vis: [
      "De $150 M al tope VIS ($262,6 M)",
      "COP 150M to the VIS cap (262.6M)",
    ],
    hasta_400: ["Del tope VIS a $400 M", "VIS cap to COP 400M"],
    mas_de_400: ["Más de $400 M", "Over COP 400M"],
    sin_precio: ["Sin precio en el aviso", "No price in the ad"],
  };

  function nombreZona(clave) {
    if (FRANJAS[clave]) return par(FRANJAS[clave][0], FRANJAS[clave][1]);
    if (clave === "bogota:sin_localidad")
      return par(
        "Bogotá, sin localidad impresa",
        "Bogotá, no locality printed",
      );
    if (clave === "no_lo_dice")
      return par("No dice si es VIS", "VIS status not stated");
    var i = clave.indexOf(":");
    if (i >= 0) return esc(clave.slice(i + 1));
    return tr("segmento", clave);
  }

  /* --- Pantallas ------------------------------------------------------------- */
  var pintores = {
    fuente: function () {
      return (
        FUENTE +
        " · " +
        par("vigente del ", "valid from ") +
        dia(D.edicion.desde) +
        par(" al ", " to ") +
        dia(D.edicion.hasta)
      );
    },
    "sin-edicion": function () {
      var x = D.estadoEdicion.despues;
      return par(
        "La edición de este mes todavía no llega. Lo que ves es la " +
          D.edicion.numero +
          ", que venció hace " +
          x.dias +
          " días: los precios pueden haber cambiado y el índice no se presenta como de hoy.",
        "This month's edition has not arrived yet. What you see is edition " +
          D.edicion.numero +
          ", which expired " +
          x.dias +
          " days ago: prices may have changed and the index is not presented as current.",
      );
    },
    "indice-resumen": function () {
      return (
        '<div class="rejilla-2">' +
        ["bogota", "sabana"]
          .map(function (k) {
            var g = D.indice[k];
            return (
              '<section class="card caja pila"><p class="eyebrow" style="margin:0">' +
              tr("region", k) +
              "</p>" +
              (g.estado === "mediana"
                ? '<p class="num vn-cifra" style="margin:0">' +
                  m2(g.medianaM2) +
                  '</p><p class="mute" style="margin:0">' +
                  par(
                    "mediana del m² privado «desde» de " +
                      g.usados +
                      " proyectos (" +
                      g.n +
                      " en la edición)",
                    "median «from» private m² of " +
                      g.usados +
                      " projects (" +
                      g.n +
                      " in the edition)",
                  ) +
                  "</p>"
                : '<p class="vn-sindatos">' +
                  par("Sin datos suficientes", "Not enough data") +
                  "</p>") +
              "</section>"
            );
          })
          .join("") +
        "</div>"
      );
    },
    "indice-zonas": function () {
      return (
        '<div class="tabla-scroll"><table class="tabla"><thead><tr><th scope=col>' +
        par("Zona", "Area") +
        "</th><th scope=col>" +
        par("m² privado (mediana)", "Private m² (median)") +
        "</th><th scope=col>" +
        par("Con qué", "Based on") +
        "</th></tr></thead><tbody>" +
        D.indice.porZona
          .map(function (g) {
            return grupoIndice(g, nombreZona(g.clave));
          })
          .join("") +
        "</tbody></table></div>"
      );
    },
    "indice-franjas": function () {
      return (
        '<div class="tabla-scroll"><table class="tabla"><thead><tr><th scope=col>' +
        par("Franja de precio «desde»", "«From» price band") +
        "</th><th scope=col>" +
        par("m² privado (mediana)", "Private m² (median)") +
        "</th><th scope=col>" +
        par("Con qué", "Based on") +
        "</th></tr></thead><tbody>" +
        D.indice.porFranja
          .map(function (g) {
            return grupoIndice(g, nombreZona(g.clave));
          })
          .join("") +
        "</tbody></table></div>" +
        '<p class="mute">' +
        par(
          D.indice.entregasInmediatas +
            " proyectos de vivienda se anuncian con entrega inmediata.",
          D.indice.entregasInmediatas +
            " housing projects are advertised as ready to move in.",
        ) +
        "</p>"
      );
    },
    "indice-segmentos": function () {
      return (
        '<div class="tabla-scroll"><table class="tabla"><thead><tr><th scope=col>' +
        par("Segmento impreso", "Printed segment") +
        "</th><th scope=col>" +
        par("m² privado (mediana)", "Private m² (median)") +
        "</th><th scope=col>" +
        par("Con qué", "Based on") +
        "</th></tr></thead><tbody>" +
        D.indice.porSegmento
          .map(function (g) {
            return grupoIndice(g, nombreZona(g.clave));
          })
          .join("") +
        "</tbody></table></div>"
      );
    },
    tope: function () {
      var h = D.hogar;
      return par(
        "Lo que puedes pagar: <b class=num>$" +
          miles(h.tope, ".") +
          "</b>, con ingresos de ejemplo de $" +
          miles(h.ingresos, ".") +
          " al mes, " +
          Math.round(h.inicial * 100) +
          " % de cuota inicial, " +
          h.plazoAnos +
          " años y la tasa de " +
          String(D.tasa.tasaEA).replace(".", ",") +
          " % E.A. del " +
          diaEs(D.tasa.fechaCorte) +
          ". Se compara con el precio verdadero, no con el «desde».",
        "What you can afford: <b class=num>COP " +
          miles(h.tope, ",") +
          "</b>, with a sample income of COP " +
          miles(h.ingresos, ",") +
          " a month, a " +
          Math.round(h.inicial * 100) +
          "% down payment, " +
          h.plazoAnos +
          " years and the " +
          D.tasa.tasaEA +
          "% APR rate of " +
          diaEn(D.tasa.fechaCorte) +
          ". It is compared with the true price, not the «from» price.",
      );
    },
    lista: function (el) {
      var cerca = lista(
        D.alcanza.caben.concat(D.alcanza.noCaben, D.alcanza.sinPrecio),
      );
      var caben = lista(D.alcanza.caben);
      var noCaben = lista(D.alcanza.noCaben);
      el.setAttribute("aria-live", "polite");
      return (
        '<div data-para-estado="vigente sin-edicion">' +
        rejilla(cerca, "si", "vn-todos", 12) +
        "</div>" +
        '<div data-para-estado="tope"><p class="mute">' +
        par(
          caben.length +
            " caben · " +
            noCaben.length +
            " no caben · " +
            D.alcanza.sinPrecio.length +
            " sin precio en el aviso",
          caben.length +
            " fit · " +
            noCaben.length +
            " do not fit · " +
            D.alcanza.sinPrecio.length +
            " without a price in the ad",
        ) +
        "</p>" +
        rejilla(caben, "si", "vn-caben", 12) +
        '<h3 class="h2">' +
        par("Fuera de lo que puedes pagar", "Beyond what you can afford") +
        "</h3>" +
        rejilla(noCaben, "no", "vn-nocaben", 0) +
        "</div>"
      );
    },
    ficha: function (el) {
      var cual = el.getAttribute("data-vn-proyecto");
      var p = proyecto(D.destacados[cual]);
      if (!p) return "";
      var pv = p.precioVerdadero;
      var html =
        '<p class="eyebrow">' +
        zonaTexto(p) +
        " · " +
        FUENTE +
        ", " +
        par("p. ", "p. ") +
        p.paginas.join(par(" y ", " and ")) +
        "</p>" +
        '<h1 style="margin:4px 0">' +
        esc(p.nombre) +
        "</h1>" +
        '<p class="bajada" style="margin:0">' +
        (vacio(p.constructora)
          ? par("Constructora no impresa", "Builder not printed")
          : esc(p.constructora)) +
        "</p>" +
        '<div class="chips" style="margin:8px 0 16px">' +
        etiquetaSegmento(p) +
        (vacio(p.etapa)
          ? ""
          : '<span class="chip">' + tr("etapa", p.etapa) + "</span>") +
        "</div>";
      if (cual === "fuera") {
        html +=
          '<div class="aviso aviso--aviso"><svg class="ico"><use href="#i-alerta"/></svg><div><strong>' +
          par("Fuera de lo que puedes pagar", "Beyond what you can afford") +
          "</strong>" +
          par(
            "Pagas al menos $" +
              miles(pv.alMenos, ".") +
              " y lo que puedes pagar es $" +
              miles(D.hogar.tope, ".") +
              ": faltan $" +
              miles(pv.alMenos - D.hogar.tope, ".") +
              " antes de sumar lo que el aviso calla.",
            "You pay at least COP " +
              miles(pv.alMenos, ",") +
              " and you can afford COP " +
              miles(D.hogar.tope, ",") +
              ": COP " +
              miles(pv.alMenos - D.hogar.tope, ",") +
              " short before adding what the ad leaves out.",
          ) +
          "</div></div>";
      }
      // Precio verdadero
      html +=
        '<div class="rejilla-2" style="margin-top:16px"><section class="card caja pila"><h2 class="h2" style="margin:0">' +
        par("El precio verdadero", "The true price") +
        "</h2>";
      if (pv.estado === "calculado") {
        html +=
          '<p style="margin:0">' +
          par("Pagas al menos", "You pay at least") +
          '</p><p class="num vn-cifra" style="margin:0">' +
          cop(pv.alMenos) +
          "</p>" +
          '<ul class="vn-lista">' +
          pv.partidas
            .map(function (x) {
              return (
                "<li><span>" +
                tr("partida", x.id) +
                '</span><span class="num">' +
                cop(x.monto) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>" +
          '<p style="margin:8px 0 0"><strong>' +
          par(
            "Lo que falta sumar (no se inventa)",
            "What is still missing (never invented)",
          ) +
          "</strong></p>" +
          '<ul class="vn-faltan">' +
          pv.faltantes
            .map(function (f) {
              return "<li>" + faltante(f, p) + "</li>";
            })
            .join("") +
          "</ul>" +
          (pv.m2.base
            ? '<p class="mute" style="margin:8px 0 0">' +
              par(
                "m² aproximado: $" +
                  miles(pv.m2.valor, ".") +
                  " por m² " +
                  (pv.m2.base === "privada" ? "privado" : "construido") +
                  " (" +
                  String(pv.m2.area).replace(".", ",") +
                  " m²). Aproximado porque el precio «desde» y el área «desde» no siempre son de la misma unidad" +
                  (pv.m2.base === "construida"
                    ? ", y el aviso no da el área privada"
                    : "") +
                  ".",
                "Approximate m²: COP " +
                  miles(pv.m2.valor, ",") +
                  " per " +
                  (pv.m2.base === "privada" ? "private" : "built") +
                  " m² (" +
                  pv.m2.area +
                  " m²). Approximate because the «from» price and the «from» area are not always the same unit" +
                  (pv.m2.base === "construida"
                    ? ", and the ad gives no private area"
                    : "") +
                  ".",
              ) +
              "</p>"
            : "") +
          '<p class="mute" style="margin:6px 0 0">' +
          par(
            "Tarifas: Resoluciones 2026-001726-6 y 2026-000964-6 de la Superintendencia de Notariado y Registro, consultadas el 20 de octubre de 2026. Estimado.",
            "Fees: Resolutions 2026-001726-6 and 2026-000964-6 of the Superintendencia de Notariado y Registro, consulted on October 20, 2026. Estimate.",
          ) +
          "</p>";
      } else {
        html +=
          "<p>" +
          (pv.estado === "en_conflicto"
            ? par(
                "Dos páginas de la revista imprimen precios distintos: no elegimos uno, así que no hay cuenta que hacer.",
                "Two pages of the magazine print different prices: we do not pick one, so there is nothing to compute.",
              )
            : par(
                "El aviso no da precio: no hay cuenta que hacer.",
                "The ad gives no price: there is nothing to compute.",
              )) +
          "</p>";
      }
      html += "</section>";
      // La espera
      var e = p.espera;
      html +=
        '<section class="card caja pila"><h2 class="h2" style="margin:0">' +
        par("La espera", "The wait") +
        "</h2>";
      if (e.estado === "calculada") {
        html +=
          '<p style="margin:0">' +
          par(
            "Mientras construyen sigues pagando arriendo. Con un arriendo de ejemplo de $" +
              miles(D.arriendo, ".") +
              ":",
            "While it is built you keep paying rent. With a sample rent of COP " +
              miles(D.arriendo, ",") +
              ":",
          ) +
          "</p>" +
          '<p class="num vn-cifra" style="margin:0">' +
          cop(e.total) +
          "</p>" +
          '<p class="mute" style="margin:0">' +
          par(
            e.meses + " meses hasta la entrega, ",
            e.meses + " months until handover, ",
          ) +
          mes(p.entrega, p.entregaPrecision) +
          (e.aproximada
            ? par(
                ". Aproximado: la revista imprime la entrega sin el mes.",
                ". Approximate: the magazine prints the handover without the month.",
              )
            : ".") +
          "</p>" +
          '<p class="mute" style="margin:0">' +
          par(
            "Tu arriendo lo escribes tú y no sale de tu teléfono.",
            "You type your own rent and it never leaves your phone.",
          ) +
          "</p>";
      } else if (e.estado === "inmediata") {
        html +=
          "<p>" +
          par(
            "Entrega inmediata: no hay espera que pagar.",
            "Ready to move in: no wait to pay for.",
          ) +
          "</p>";
      } else {
        html +=
          '<div class="aviso aviso--info"><svg class="ico"><use href="#i-info"/></svg><div>' +
          par(
            "El aviso no dice cuándo entregan: la espera no se puede calcular. Pregúntalo antes de firmar.",
            "The ad does not say when it is handed over: the wait cannot be computed. Ask before you sign.",
          ) +
          "</div></div>";
      }
      html += "</section></div>";
      // Ficha honesta
      var f = p.ficha;
      html +=
        '<section class="card caja pila" style="margin-top:16px"><h2 class="h2" style="margin:0">' +
        par("La ficha honesta", "The honest sheet") +
        "</h2>" +
        '<p class="mute" style="margin:0">' +
        par(
          "El aviso dice " +
            f.verificables +
            " de " +
            f.datos.length +
            " datos que necesitas para decidir. Lo que no dice, no se adivina.",
          "The ad states " +
            f.verificables +
            " of the " +
            f.datos.length +
            " facts you need to decide. What it does not state is never guessed.",
        ) +
        "</p>" +
        '<div class="tabla-scroll"><table class="tabla"><tbody>' +
        f.datos
          .map(function (d) {
            var marca =
              d.clase === "verificable"
                ? "✓"
                : d.clase === "ilegible"
                  ? "?"
                  : d.clase === "en_conflicto"
                    ? "≠"
                    : "—";
            return (
              "<tr><th scope=row>" +
              tr("campo", d.campo) +
              '</th><td class="vn-clase vn-clase--' +
              d.clase +
              '"><span aria-hidden="true">' +
              marca +
              "</span> " +
              tr("clase", d.clase) +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>" +
        (f.mensajes.length || f.otrosMensajes
          ? '<p style="margin:8px 0 0"><strong>' +
            par(
              "Mensajes de venta (no son datos)",
              "Sales messages (not facts)",
            ) +
            '</strong></p><div class="chips">' +
            f.mensajes
              .map(function (r) {
                return '<span class="chip">' + tr("rotulo", r) + "</span>";
              })
              .join("") +
            (f.otrosMensajes
              ? '<span class="chip">' +
                par(
                  "+" + f.otrosMensajes + " otro",
                  "+" + f.otrosMensajes + " other",
                ) +
                "</span>"
              : "") +
            "</div>"
          : "") +
        (p.discrepancias.length
          ? '<div class="aviso aviso--info" style="margin-top:8px"><svg class="ico"><use href="#i-info"/></svg><div>' +
            par(
              "Dos páginas de la revista imprimen cifras distintas en: ",
              "Two pages of the magazine print different figures for: ",
            ) +
            p.discrepancias
              .map(function (c) {
                return tr("campo", c);
              })
              .join(", ") +
            ".</div></div>"
          : "") +
        "</section>";
      return html;
    },
    "nuevo-usado": function (el) {
      var zona = el.getAttribute("data-vn-zona");
      var z = D.nuevoOUsado.filter(function (x) {
        return x.zona === zona;
      })[0];
      if (!z) return "";
      var r = z.resultado;
      var nuevos =
        '<section class="card caja pila"><p class="eyebrow" style="margin:0">' +
        par("Nuevos que caben", "New homes that fit") +
        "</p>" +
        '<p class="num vn-cifra" style="margin:0">' +
        r.nuevos.n +
        "</p>" +
        '<p class="mute" style="margin:0">' +
        par(
          "por su precio verdadero (" + FUENTE_TXT.es + ")",
          "by their true price (" + FUENTE_TXT.en + ")",
        ) +
        "</p>" +
        (r.nuevos.medianaM2 !== null
          ? '<p style="margin:6px 0 0">' +
            par(
              "m² privado aproximado, mediana: ",
              "Approximate private m², median: ",
            ) +
            '<span class="num">' +
            m2(r.nuevos.medianaM2) +
            "</span></p>"
          : '<p class="vn-sindatos">' +
            par(
              "Menos de 5 con área privada: sin mediana",
              "Fewer than 5 with private area: no median",
            ) +
            "</p>") +
        "</section>";
      var u = r.usados;
      var usados =
        '<section class="card caja pila"><p class="eyebrow" style="margin:0">' +
        par(
          "Usados verificados en Innmobiliaria",
          "Verified resale homes on Innmobiliaria",
        ) +
        "</p>" +
        (u.estado === "con_datos"
          ? '<p class="num vn-cifra" style="margin:0">' +
            u.n +
            "</p>" +
            '<p style="margin:0">' +
            par("m² mediano: ", "Median m²: ") +
            '<span class="num">' +
            m2(u.medianaM2) +
            "</span></p>" +
            '<p class="mute" style="margin:0">' +
            par("La mitad entre ", "Half between ") +
            '<span class="num">' +
            m2(u.p25M2) +
            "</span>" +
            par(" y ", " and ") +
            '<span class="num">' +
            m2(u.p75M2) +
            "</span></p>"
          : '<p class="vn-sindatos" style="margin:0">' +
            par("Sin datos suficientes", "Not enough data") +
            "</p>" +
            '<p class="mute" style="margin:0">' +
            par(
              "Hay " +
                u.n +
                " usados en tu presupuesto y zona; hacen falta " +
                u.minimo +
                " para comparar.",
              "There are " +
                u.n +
                " resale homes in your budget and area; " +
                u.minimo +
                " are needed to compare.",
            ) +
            "</p>") +
        '<p class="mute" style="margin:6px 0 0">' +
        par(
          "Usados de ejemplo en esta maqueta (en el producto: los anuncios verificados de la búsqueda, con su fecha).",
          "Sample resale homes in this mockup (in the product: verified listings from search, with their date).",
        ) +
        "</p>" +
        "</section>";
      var veredicto =
        r.diferencia !== null
          ? '<div class="aviso aviso--info"><svg class="ico"><use href="#i-info"/></svg><div><strong>' +
            par(
              "Estrenar cuesta " +
                Math.abs(r.diferencia) +
                " % " +
                (r.diferencia >= 0 ? "más" : "menos") +
                " por m²",
              "A new home costs " +
                Math.abs(r.diferencia) +
                "% " +
                (r.diferencia >= 0 ? "more" : "less") +
                " per m²",
            ) +
            "</strong>" +
            par(
              "Medianas de lo que cabe en $" +
                miles(r.presupuesto, ".") +
                ". Lo nuevo se entrega después y calla datos; lo usado se ve hoy.",
              "Medians of what fits in COP " +
                miles(r.presupuesto, ",") +
                ". New homes are handed over later and leave facts out; resale homes can be seen today.",
            ) +
            "</div></div>"
          : '<div class="aviso aviso--aviso"><svg class="ico"><use href="#i-alerta"/></svg><div><strong>' +
            par("No hay comparación honesta", "No honest comparison") +
            "</strong>" +
            par(
              "Con menos de 5 usados comparables no se compara: se dice.",
              "With fewer than 5 comparable resale homes there is no comparison: we say so.",
            ) +
            "</div></div>";
      return '<div class="rejilla-2">' + nuevos + usados + "</div>" + veredicto;
    },
    subsidio: function (el) {
      var id = el.getAttribute("data-vn-hogar");
      var h = D.subsidio.filter(function (x) {
        return x.id === id;
      })[0];
      if (!h) return "";
      var ejemplo =
        h.porProyecto.filter(function (x) {
          return x.id === D.destacados.completo;
        })[0] || h.porProyecto[0];
      var pe = proyecto(ejemplo.id);
      var sin = h.porProyecto.filter(function (x) {
        return x.cabeSinSubsidio;
      }).length;
      var con = h.porProyecto.filter(function (x) {
        return x.cabeConSubsidio;
      }).length;
      var porPrograma = {};
      D.programas.forEach(function (p) {
        porPrograma[p.id] = p;
      });
      var filas = ejemplo.resultados
        .map(function (r) {
          var p = porPrograma[r.id];
          var monto =
            p.minimo !== null
              ? par(
                  "$" + miles(p.minimo, ".") + " a $" + miles(p.maximo, "."),
                  "COP " + miles(p.minimo, ",") + " to " + miles(p.maximo, ","),
                )
              : par(
                  "hasta $" + miles(p.maximo, "."),
                  "up to COP " + miles(p.maximo, ","),
                );
          return (
            "<tr><th scope=row>" +
            par(esc(p.nombre.es), esc(p.nombre.en)) +
            '<br><span class="mute">' +
            esc(p.normas.join(" · ")) +
            "</span></th><td class=num>" +
            monto +
            '</td><td class="vn-programa vn-programa--' +
            r.estado +
            '">' +
            tr("estadoPrograma", r.estado) +
            (r.motivos.length
              ? '<br><span class="mute">' +
                r.motivos
                  .map(function (m) {
                    return tr("motivo", m);
                  })
                  .join(" · ") +
                "</span>"
              : "") +
            '</td><td class="mute">' +
            par("estado al ", "status as of ") +
            dia(p.estadoAl) +
            "</td></tr>"
          );
        })
        .join("");
      return (
        '<p class="bajada">' +
        par(
          "Hogar de ejemplo con $" +
            miles(h.ingresos, ".") +
            " al mes: puedes pagar hasta <b class=num>$" +
            miles(h.tope, ".") +
            "</b> (simulador, " +
            Math.round(D.hogar.inicial * 100) +
            " % de cuota inicial, " +
            D.hogar.plazoAnos +
            " años).",
          "Sample household earning COP " +
            miles(h.ingresos, ",") +
            " a month: you can afford up to <b class=num>COP " +
            miles(h.tope, ",") +
            "</b> (calculator, " +
            Math.round(D.hogar.inicial * 100) +
            "% down, " +
            D.hogar.plazoAnos +
            " years).",
        ) +
        "</p>" +
        '<div class="rejilla-2"><section class="card caja pila"><p class="eyebrow" style="margin:0">' +
        par("Sin subsidio te alcanzan", "Without a subsidy you can afford") +
        '</p><p class="num vn-cifra" style="margin:0">' +
        sin +
        '</p><p class=mute style="margin:0">' +
        par(
          "de " +
            h.porProyecto.length +
            " proyectos de Bogotá y la Sabana con precio",
          "of " +
            h.porProyecto.length +
            " projects in Bogotá and the savanna with a price",
        ) +
        "</p></section>" +
        '<section class="card caja pila"><p class="eyebrow" style="margin:0">' +
        par("Con el mejor caso de subsidio", "With the best-case subsidy") +
        '</p><p class="num vn-cifra" style="margin:0">' +
        con +
        '</p><p class=mute style="margin:0">' +
        par(
          "por confirmar: el proyecto debe estar inscrito y no se suman programas entre sí",
          "to be confirmed: the project must be enrolled and programs are not added together",
        ) +
        "</p></section></div>" +
        '<h2 class="h2">' +
        par(
          "Los programas, para " + esc(pe.nombre),
          "The programs, for " + esc(pe.nombre),
        ) +
        "</h2>" +
        '<p class="mute">' +
        zonaTexto(pe) +
        " · " +
        tr("segmento", pe.segmento) +
        " · " +
        par("desde ", "from ") +
        millones(pe.precioDesde) +
        "</p>" +
        '<div class="tabla-scroll"><table class="tabla"><thead><tr><th scope=col>' +
        par("Programa y norma", "Program and rule") +
        "</th><th scope=col>" +
        par("Monto 2026", "2026 amount") +
        "</th><th scope=col>" +
        par("Para ti", "For you") +
        "</th><th scope=col>" +
        par("Fecha", "Date") +
        "</th></tr></thead><tbody>" +
        filas +
        "</tbody></table></div>"
      );
    },
    "visita-proyecto": function () {
      var p = proyecto(D.destacados.completo);
      return (
        esc(p.nombre) +
        " · " +
        (vacio(p.constructora) ? "" : esc(p.constructora)) +
        " · " +
        zonaTexto(p)
      );
    },
  };
  var FUENTE_TXT = {
    es: "Estrenar Vivienda, edición " + D.edicion.numero,
    en: "Estrenar Vivienda, edition " + D.edicion.numero,
  };

  document.querySelectorAll("[data-vn]").forEach(function (el) {
    var pintor = pintores[el.getAttribute("data-vn")];
    if (pintor) el.innerHTML = pintor(el);
  });
})();
