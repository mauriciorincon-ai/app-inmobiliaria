-- ═══════════════════════════════════════════════════════════════════════════════
-- Migración 8 (Sprint 006) — «Encontrar»: catálogo de barrios, búsqueda pública y fecha del CTL.
--
-- Por qué: el comprador busca por filtros y por una zona dibujada en el mapa (S6). El anuncio se ubica
-- por el BARRIO del catálogo catastral y nunca por un punto (G-Plan 1a): la dirección no sale de la BD
-- por ninguna RPC pública. Además el sello ⭐ guarda la fecha del CTL, para que el comprador vea cuán
-- reciente es la verificación.
--
-- TODO es ADITIVO (aprobado en el G-Plan, 2a): tabla, columnas, trigger, funciones nuevas y
-- `create or replace` con la misma firma. No se toca ninguna firma existente: `registrar_fundador` y
-- `marcar_verificado` siguen igual, así que el Worker desplegado antes del `db push` sigue funcionando.
--
-- Qué hace:
--   1. `sectores` (1 230 sectores catastrales de Bogotá, Catastro Bogotá CC BY 4.0, versión 09.26) con
--      su punto interior en `centroide` (tipo `point` nativo; sin PostGIS: basta `polygon @> point`).
--   2. `inmuebles.sector_codigo` (referencia al catálogo) e `inmuebles.ctl_expedido_el` (fecha del CTL).
--      Un trigger fija el sector por coincidencia EXACTA de nombre + localidad (sin tildes ni
--      mayúsculas): el wizard elige el barrio del catálogo, así que los nuevos casan siempre; los
--      anuncios de antes se rellenan aquí mismo y el resto queda sin sector (cola del operador).
--   3. `marcar_verificado_ctl(uuid, text, date)`: como `marcar_verificado`, pero exige y guarda la fecha
--      del CTL, que no puede tener más de 30 días. Solo `authenticated` (operador).
--   4. `buscar_inmuebles(...)`: la búsqueda pública, SECURITY DEFINER con LISTA BLANCA de campos. Jamás
--      devuelve `direccion_aproximada` ni nada del vendedor.
--   5. `obtener_ficha` y `obtener_mi_anuncio` (misma firma) suman la vigencia, la fecha del CTL y el
--      barrio del catálogo; `obtener_lote` suma el filtro `re-verificar`.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Catálogo de sectores ────────────────────────────────────────────────────

-- Llave de comparación de un barrio: sin tildes ni eñe, minúsculas, solo letras y números. Espejo de
-- `clave()` en scripts/sectores/convertir.mjs. Interna: nadie la llama por la API.
create function public.clave_barrio(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(translate(p_texto, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

create table public.sectores (
  codigo    text primary key check (codigo ~ '^[0-9]{6}$'),
  nombre    text not null check (length(btrim(nombre)) between 2 and 80),
  localidad text not null,
  tipo      text not null check (tipo in ('urbano', 'rural', 'mixto')),
  -- Punto interior del sector (x = longitud, y = latitud). Una zona dibujada incluye el anuncio si
  -- contiene este punto.
  centroide point not null
);

-- Dentro de una localidad el nombre identifica al sector (el trigger lo usa para emparejar).
create unique index sectores_localidad_nombre_idx
  on public.sectores (localidad, public.clave_barrio(nombre));

-- BEGIN GENERADO: sectores (1230 filas; scripts/sectores/convertir.mjs, no editar a mano)
insert into public.sectores (codigo, nombre, localidad, tipo, centroide) values
  ('001101', 'Las Brisas', 'San Cristóbal', 'urbano', point(-74.081627, 4.58322)),
  ('001102', 'Buenos Aires', 'San Cristóbal', 'urbano', point(-74.08057, 4.579395)),
  ('001103', 'Vitelma', 'San Cristóbal', 'urbano', point(-74.077079, 4.575928)),
  ('001104', 'Molinos de Oriente', 'San Cristóbal', 'urbano', point(-74.069397, 4.567727)),
  ('001106', 'San Blas', 'San Cristóbal', 'urbano', point(-74.083629, 4.56795)),
  ('001107', 'Las Mercedes', 'San Cristóbal', 'urbano', point(-74.080602, 4.566895)),
  ('001108', 'San Cristóbal Sur', 'San Cristóbal', 'urbano', point(-74.080252, 4.57118)),
  ('001109', 'La María', 'San Cristóbal', 'urbano', point(-74.081413, 4.576022)),
  ('001110', 'San Javier', 'San Cristóbal', 'urbano', point(-74.084443, 4.579696)),
  ('001111', 'Santa Ana Sur', 'San Cristóbal', 'urbano', point(-74.085232, 4.576998)),
  ('001112', 'Primero de Mayo', 'San Cristóbal', 'urbano', point(-74.089727, 4.572761)),
  ('001113', 'San Blas II', 'San Cristóbal', 'urbano', point(-74.079548, 4.562565)),
  ('001114', 'Velódromo', 'San Cristóbal', 'urbano', point(-74.08742, 4.573069)),
  ('001115', 'Monte Carlo', 'San Cristóbal', 'urbano', point(-74.071514, 4.569293)),
  ('001116', 'Tibaque Urbano', 'San Cristóbal', 'urbano', point(-74.074358, 4.567976)),
  ('001118', 'Los Laureles Sur Oriental I', 'San Cristóbal', 'urbano', point(-74.067724, 4.566275)),
  ('001119', 'Aguas Claras I', 'San Cristóbal', 'urbano', point(-74.068425, 4.562167)),
  ('001121', 'El Triángulo I', 'San Cristóbal', 'urbano', point(-74.075645, 4.566382)),
  ('001201', 'Sevilla', 'Antonio Nariño', 'urbano', point(-74.090812, 4.588729)),
  ('001202', 'Ciudad Berna', 'Antonio Nariño', 'urbano', point(-74.091275, 4.585063)),
  ('001203', 'Caracas', 'Antonio Nariño', 'urbano', point(-74.093059, 4.583268)),
  ('001204', 'Ciudad Jardín Sur', 'Antonio Nariño', 'urbano', point(-74.09619, 4.580597)),
  ('001205', 'Sociego', 'San Cristóbal', 'urbano', point(-74.091354, 4.576677)),
  ('001206', 'Quinta Ramos', 'San Cristóbal', 'urbano', point(-74.088244, 4.578909)),
  ('001207', 'Nariño Sur', 'San Cristóbal', 'urbano', point(-74.087739, 4.5816)),
  ('001208', 'La Hortúa', 'Antonio Nariño', 'urbano', point(-74.08765, 4.589615)),
  ('001209', 'Modelo Sur', 'San Cristóbal', 'urbano', point(-74.08552, 4.586057)),
  ('001210', 'Calvo Sur', 'San Cristóbal', 'urbano', point(-74.083769, 4.584614)),
  ('001211', 'Policarpa', 'Antonio Nariño', 'urbano', point(-74.088598, 4.587051)),
  ('001301', 'Granada Sur', 'San Cristóbal', 'urbano', point(-74.08999, 4.56948)),
  ('001302', 'Montebello', 'San Cristóbal', 'urbano', point(-74.089831, 4.566737)),
  ('001303', 'Córdoba', 'San Cristóbal', 'urbano', point(-74.091175, 4.564863)),
  ('001304', 'Bello Horizonte', 'San Cristóbal', 'urbano', point(-74.093244, 4.561702)),
  ('001305', 'Atenas', 'San Cristóbal', 'urbano', point(-74.092908, 4.557178)),
  ('001306', 'San Pedro', 'San Cristóbal', 'urbano', point(-74.084725, 4.563869)),
  ('001307', 'Ramajal', 'San Cristóbal', 'urbano', point(-74.0821, 4.559761)),
  ('001308', 'Santa Inés Sur', 'San Cristóbal', 'urbano', point(-74.086383, 4.558042)),
  ('001309', 'San Vicente', 'San Cristóbal', 'urbano', point(-74.088624, 4.554749)),
  ('001310', 'La Victoria', 'San Cristóbal', 'urbano', point(-74.092221, 4.551783)),
  ('001311', 'La Gloria Occidental', 'San Cristóbal', 'urbano', point(-74.09656, 4.54807)),
  ('001312', 'Los Alpes', 'San Cristóbal', 'urbano', point(-74.083163, 4.553941)),
  ('001313', 'Bellavista Sur', 'San Cristóbal', 'urbano', point(-74.088598, 4.550667)),
  ('001314', 'San José Sur Oriental', 'San Cristóbal', 'urbano', point(-74.087064, 4.547348)),
  ('001315', 'Altamira', 'San Cristóbal', 'urbano', point(-74.08569, 4.542118)),
  ('001316', 'Moralba', 'San Cristóbal', 'urbano', point(-74.079702, 4.544763)),
  ('001317', 'Puente Colorado', 'San Cristóbal', 'urbano', point(-74.082904, 4.541955)),
  ('001318', 'Quindío', 'San Cristóbal', 'urbano', point(-74.080249, 4.538097)),
  ('001319', 'La Gloria Oriental', 'San Cristóbal', 'urbano', point(-74.091222, 4.545521)),
  ('001320', 'Nueva Gloria', 'San Cristóbal', 'urbano', point(-74.089514, 4.540679)),
  ('001321', 'San Martín Sur', 'San Cristóbal', 'urbano', point(-74.0996, 4.551156)),
  ('001322', 'San Rafael Usme', 'San Cristóbal', 'urbano', point(-74.084507, 4.530016)),
  ('001323', 'Nueva Delhi', 'San Cristóbal', 'urbano', point(-74.088039, 4.529578)),
  ('001324', 'El Pinar', 'San Cristóbal', 'urbano', point(-74.088335, 4.536337)),
  ('001325', 'Juan Rey (La Paz)', 'San Cristóbal', 'urbano', point(-74.089871, 4.524913)),
  ('001327', 'Los Libertadores', 'San Cristóbal', 'urbano', point(-74.089482, 4.533182)),
  ('001328', 'Santa Rita Sur Oriental', 'San Cristóbal', 'urbano', point(-74.093143, 4.538799)),
  ('001329', 'El Paraíso', 'San Cristóbal', 'urbano', point(-74.09192, 4.540863)),
  ('001330', 'Cañada O Guira', 'San Cristóbal', 'urbano', point(-74.099052, 4.545316)),
  ('001331', 'Altos del Zuque', 'San Cristóbal', 'urbano', point(-74.079144, 4.542073)),
  ('001332', 'Villabel', 'San Cristóbal', 'urbano', point(-74.095296, 4.538673)),
  ('001333', 'Altos del Poblado', 'San Cristóbal', 'urbano', point(-74.087097, 4.54885)),
  ('001334', 'Las Gaviotas', 'San Cristóbal', 'urbano', point(-74.082835, 4.532486)),
  ('001335', 'Villa Diana', 'Usme', 'urbano', point(-74.090293, 4.5018)),
  ('001336', 'Juan José Rondón I', 'Usme', 'urbano', point(-74.08654, 4.498801)),
  ('001337', 'San Pedro Sur', 'Usme', 'urbano', point(-74.086444, 4.507272)),
  ('001338', 'La Belleza', 'San Cristóbal', 'urbano', point(-74.093334, 4.530472)),
  ('001339', 'Bosque de los Alpes', 'San Cristóbal', 'urbano', point(-74.082719, 4.549209)),
  ('001340', 'Tihuaque', 'Usme', 'urbano', point(-74.08287, 4.502042)),
  ('001342', 'Altos del Zipa', 'San Cristóbal', 'urbano', point(-74.079202, 4.548914)),
  ('001344', 'Los Soches', 'Usme', 'urbano', point(-74.088688, 4.499816)),
  ('001345', 'Doña Liliana', 'Usme', 'urbano', point(-74.09311, 4.510574)),
  ('001346', 'Ciudad Londres I', 'San Cristóbal', 'urbano', point(-74.087294, 4.519536)),
  ('001347', 'Juan Rey Sur', 'Usme', 'urbano', point(-74.092121, 4.51577)),
  ('001348', 'La Cabaña', 'Usme', 'urbano', point(-74.091243, 4.513076)),
  ('001350', 'Yomasa', 'San Cristóbal', 'urbano', point(-74.092441, 4.520888)),
  ('001352', 'Las Guacamayas II', 'San Cristóbal', 'urbano', point(-74.098579, 4.554601)),
  ('001353', 'Las Guacamayas IV', 'San Cristóbal', 'urbano', point(-74.10065, 4.556662)),
  ('001354', 'Las Guacamayas III', 'San Cristóbal', 'urbano', point(-74.100464, 4.558134)),
  ('001355', 'Las Guacamayas I', 'San Cristóbal', 'urbano', point(-74.095965, 4.554314)),
  ('001356', 'Villa del Cerro', 'San Cristóbal', 'urbano', point(-74.095019, 4.544384)),
  ('001357', 'Santa Inés Sur II', 'San Cristóbal', 'urbano', point(-74.088208, 4.561216)),
  ('001358', 'Chiguaza Urbano', 'San Cristóbal', 'urbano', point(-74.081419, 4.534949)),
  ('001362', 'Arboleda Santa Teresita', 'San Cristóbal', 'urbano', point(-74.085872, 4.526416)),
  ('001363', 'Colmena I los Pinares', 'San Cristóbal', 'urbano', point(-74.08568, 4.536859)),
  ('001401', 'San José Sur', 'Rafael Uribe Uribe', 'urbano', point(-74.101643, 4.577806)),
  ('001402', 'Gustavo Restrepo', 'Rafael Uribe Uribe', 'urbano', point(-74.108142, 4.576089)),
  ('001403', 'Hospital San Carlos', 'Rafael Uribe Uribe', 'urbano', point(-74.107914, 4.571777)),
  ('001404', 'Sosiego Sur', 'Rafael Uribe Uribe', 'urbano', point(-74.099396, 4.573007)),
  ('001405', 'Veinte de Julio', 'San Cristóbal', 'urbano', point(-74.096233, 4.570555)),
  ('001406', 'San Isidro', 'San Cristóbal', 'urbano', point(-74.100331, 4.566282)),
  ('001407', 'Suramerica', 'San Cristóbal', 'urbano', point(-74.0958, 4.56589)),
  ('001408', 'Villa de los Alpes', 'San Cristóbal', 'urbano', point(-74.096991, 4.559446)),
  ('001409', 'Las Lomas', 'San Cristóbal', 'urbano', point(-74.102405, 4.562897)),
  ('001410', 'Marco Fidel Suárez', 'Rafael Uribe Uribe', 'urbano', point(-74.120666, 4.569206)),
  ('001411', 'San Jorge Sur', 'Rafael Uribe Uribe', 'urbano', point(-74.120593, 4.571672)),
  ('001412', 'Granjas San Pablo', 'Rafael Uribe Uribe', 'urbano', point(-74.116849, 4.573065)),
  ('001413', 'La Resurrección', 'Rafael Uribe Uribe', 'urbano', point(-74.111473, 4.566827)),
  ('001414', 'Molinos del Sur', 'Rafael Uribe Uribe', 'urbano', point(-74.11868, 4.556499)),
  ('001415', 'Marco Fidel Suárez I', 'Rafael Uribe Uribe', 'urbano', point(-74.12224, 4.566779)),
  ('001416', 'San Agustín', 'Rafael Uribe Uribe', 'urbano', point(-74.112158, 4.550406)),
  ('001417', 'Los Molinos', 'Rafael Uribe Uribe', 'urbano', point(-74.109642, 4.555672)),
  ('001418', 'Marruecos', 'Rafael Uribe Uribe', 'urbano', point(-74.114623, 4.553038)),
  ('001419', 'Callejón Santa Bárbara', 'Rafael Uribe Uribe', 'urbano', point(-74.113547, 4.557482)),
  ('001420', 'El Playón', 'Rafael Uribe Uribe', 'urbano', point(-74.121205, 4.561102)),
  ('001421', 'Diana Turbay', 'Rafael Uribe Uribe', 'urbano', point(-74.108292, 4.547822)),
  ('001422', 'Diana Turbay Arrayanes', 'Rafael Uribe Uribe', 'urbano', point(-74.106654, 4.544766)),
  ('001423', 'Arboleda Sur', 'Rafael Uribe Uribe', 'urbano', point(-74.11839, 4.563548)),
  ('001424', 'Barcelona Sur', 'San Cristóbal', 'urbano', point(-74.103881, 4.564893)),
  ('001425', 'Granjas de Santa Sofía', 'Rafael Uribe Uribe', 'urbano', point(-74.112007, 4.570717)),
  ('001426', 'San Luis', 'Rafael Uribe Uribe', 'urbano', point(-74.104653, 4.567107)),
  ('001427', 'Puerto Rico', 'Rafael Uribe Uribe', 'urbano', point(-74.109757, 4.560888)),
  ('001428', 'Cerros de Oriente', 'Rafael Uribe Uribe', 'urbano', point(-74.105199, 4.555786)),
  ('001429', 'Guiparma', 'Rafael Uribe Uribe', 'urbano', point(-74.118032, 4.560317)),
  ('001430', 'Villa de los Alpes I', 'San Cristóbal', 'urbano', point(-74.098986, 4.562295)),
  ('001431', 'La Resurrección I', 'Rafael Uribe Uribe', 'urbano', point(-74.108795, 4.566168)),
  ('001432', 'Diana Turbay Cultivos', 'Rafael Uribe Uribe', 'urbano', point(-74.104365, 4.541656)),
  ('001434', 'Carmen del Sol', 'Rafael Uribe Uribe', 'urbano', point(-74.113022, 4.563879)),
  ('001435', 'Los Arrayanes II', 'Rafael Uribe Uribe', 'urbano', point(-74.107508, 4.542783)),
  ('002101', 'La Fraguita', 'Antonio Nariño', 'urbano', point(-74.099551, 4.593102)),
  ('002102', 'San Antonio', 'Antonio Nariño', 'urbano', point(-74.094762, 4.589938)),
  ('002103', 'Restrepo', 'Antonio Nariño', 'urbano', point(-74.100511, 4.585239)),
  ('002104', 'Restrepo Occidental', 'Antonio Nariño', 'urbano', point(-74.104198, 4.589455)),
  ('002105', 'Santander', 'Antonio Nariño', 'urbano', point(-74.10949, 4.592503)),
  ('002106', 'Sena', 'Antonio Nariño', 'urbano', point(-74.11067, 4.596572)),
  ('002107', 'La Fragua', 'Antonio Nariño', 'urbano', point(-74.106779, 4.595166)),
  ('002201', 'Olaya', 'Rafael Uribe Uribe', 'urbano', point(-74.10683, 4.582031)),
  ('002202', 'Quiroga', 'Rafael Uribe Uribe', 'urbano', point(-74.113297, 4.580207)),
  ('002203', 'Quiroga Central', 'Rafael Uribe Uribe', 'urbano', point(-74.116314, 4.579329)),
  ('002204', 'Quiroga Sur', 'Rafael Uribe Uribe', 'urbano', point(-74.120391, 4.578425)),
  ('002205', 'Santa Lucía', 'Rafael Uribe Uribe', 'urbano', point(-74.12551, 4.574507)),
  ('002209', 'Quiroga I', 'Rafael Uribe Uribe', 'urbano', point(-74.110676, 4.581038)),
  ('002301', 'Eduardo Frey', 'Antonio Nariño', 'urbano', point(-74.116206, 4.592142)),
  ('002302', 'Santander Sur', 'Antonio Nariño', 'urbano', point(-74.112584, 4.590837)),
  ('002303', 'Centenario', 'Rafael Uribe Uribe', 'urbano', point(-74.10811, 4.585725)),
  ('002304', 'Santiago Pérez', 'Rafael Uribe Uribe', 'urbano', point(-74.110379, 4.587081)),
  ('002305', 'Libertador', 'Rafael Uribe Uribe', 'urbano', point(-74.114197, 4.585943)),
  ('002306', 'Bravo Páez', 'Rafael Uribe Uribe', 'urbano', point(-74.120542, 4.586448)),
  ('002307', 'Inglés', 'Rafael Uribe Uribe', 'urbano', point(-74.12328, 4.584302)),
  ('002308', 'Claret', 'Rafael Uribe Uribe', 'urbano', point(-74.127783, 4.5832)),
  ('002309', 'Villa Mayor Oriental', 'Antonio Nariño', 'urbano', point(-74.1227, 4.591989)),
  ('002310', 'Murillo Toro', 'Rafael Uribe Uribe', 'urbano', point(-74.117901, 4.585346)),
  ('002311', 'Villa Mayor', 'Rafael Uribe Uribe', 'urbano', point(-74.126576, 4.589539)),
  ('002401', 'Tunal Oriental', 'Tunjuelito', 'urbano', point(-74.132267, 4.576126)),
  ('002402', 'San Vicente Ferrer', 'Tunjuelito', 'urbano', point(-74.139891, 4.581233)),
  ('002403', 'Venecia Occidental', 'Tunjuelito', 'urbano', point(-74.143481, 4.591586)),
  ('002404', 'Venecia', 'Tunjuelito', 'urbano', point(-74.138661, 4.59224)),
  ('002405', 'Escuela General Santander', 'Tunjuelito', 'urbano', point(-74.131919, 4.589753)),
  ('002406', 'Samore', 'Tunjuelito', 'urbano', point(-74.132634, 4.583035)),
  ('002407', 'El Carmen', 'Tunjuelito', 'urbano', point(-74.13571, 4.581312)),
  ('002408', 'Fátima', 'Tunjuelito', 'urbano', point(-74.13801, 4.587155)),
  ('002409', 'Nuevo Muzu', 'Tunjuelito', 'urbano', point(-74.148132, 4.587511)),
  ('002410', 'Parque el Tunal', 'Tunjuelito', 'urbano', point(-74.135908, 4.571732)),
  ('002411', 'Isla del Sol', 'Tunjuelito', 'urbano', point(-74.151164, 4.591809)),
  ('002412', 'Verona', 'Ciudad Bolívar', 'urbano', point(-74.156664, 4.577454)),
  ('002413', 'Muzu', 'Tunjuelito', 'urbano', point(-74.14525, 4.580321)),
  ('002414', 'Ismael Perdomo', 'Ciudad Bolívar', 'urbano', point(-74.16965, 4.582145)),
  ('002415', 'Madelena', 'Ciudad Bolívar', 'urbano', point(-74.157226, 4.591786)),
  ('002416', 'El Ensueño', 'Ciudad Bolívar', 'urbano', point(-74.159476, 4.583952)),
  ('002417', 'Barlovento', 'Ciudad Bolívar', 'urbano', point(-74.166789, 4.592419)),
  ('002418', 'La Estancia', 'Ciudad Bolívar', 'urbano', point(-74.174663, 4.594385)),
  ('002419', 'Rincón de la Valvanera', 'Ciudad Bolívar', 'urbano', point(-74.162764, 4.592604)),
  ('002420', 'La Coruña', 'Ciudad Bolívar', 'urbano', point(-74.152514, 4.578825)),
  ('002421', 'Rafael Escamilla', 'Ciudad Bolívar', 'urbano', point(-74.159868, 4.59418)),
  ('002422', 'Atlanta', 'Ciudad Bolívar', 'urbano', point(-74.15311, 4.584389)),
  ('002423', 'Espino', 'Ciudad Bolívar', 'urbano', point(-74.17268, 4.583915)),
  ('002424', 'Rincón de Galicia', 'Ciudad Bolívar', 'urbano', point(-74.174311, 4.587601)),
  ('002426', 'Santo Domingo', 'Ciudad Bolívar', 'urbano', point(-74.177503, 4.579815)),
  ('002427', 'Galicia', 'Ciudad Bolívar', 'urbano', point(-74.170664, 4.590748)),
  ('002428', 'Primavera II', 'Ciudad Bolívar', 'urbano', point(-74.180585, 4.593714)),
  ('002429', 'María Caño', 'Ciudad Bolívar', 'urbano', point(-74.176094, 4.589835)),
  ('002430', 'Las Brisas', 'Ciudad Bolívar', 'urbano', point(-74.165937, 4.57097)),
  ('002431', 'Potosí', 'Ciudad Bolívar', 'urbano', point(-74.17035, 4.569169)),
  ('002432', 'Arborizadora Baja', 'Ciudad Bolívar', 'urbano', point(-74.148366, 4.574495)),
  ('002433', 'El Peñón del Cortijo', 'Ciudad Bolívar', 'urbano', point(-74.166049, 4.584358)),
  ('002434', 'Jerusalén', 'Ciudad Bolívar', 'urbano', point(-74.157928, 4.572664)),
  ('002435', 'El Chircal Sur', 'Ciudad Bolívar', 'urbano', point(-74.144764, 4.570502)),
  ('002436', 'Bellavista', 'Ciudad Bolívar', 'urbano', point(-74.160565, 4.575496)),
  ('002437', 'La Pradera', 'Ciudad Bolívar', 'urbano', point(-74.162336, 4.571731)),
  ('002438', 'Sierra Morena', 'Ciudad Bolívar', 'urbano', point(-74.163641, 4.579599)),
  ('002439', 'Sierra Morena (2)', 'Ciudad Bolívar', 'urbano', point(-74.167398, 4.580192)),
  ('002440', 'Sierra Morena (3)', 'Ciudad Bolívar', 'urbano', point(-74.170004, 4.576389)),
  ('002441', 'Los Tres Reyes I', 'Ciudad Bolívar', 'urbano', point(-74.178787, 4.58715)),
  ('002442', 'Santa Viviana', 'Ciudad Bolívar', 'urbano', point(-74.174189, 4.576902)),
  ('002443', 'La Primavera I', 'Ciudad Bolívar', 'urbano', point(-74.174106, 4.591097)),
  ('002444', 'Sierra Morena II', 'Ciudad Bolívar', 'urbano', point(-74.167515, 4.576481)),
  ('002445', 'Caracoli', 'Ciudad Bolívar', 'urbano', point(-74.172097, 4.573171)),
  ('002446', 'Los Tres Reyes', 'Ciudad Bolívar', 'urbano', point(-74.179937, 4.589524)),
  ('002447', 'El Mirador de la Estancia', 'Ciudad Bolívar', 'urbano', point(-74.178518, 4.585172)),
  ('002448', 'Perdomo Alto', 'Ciudad Bolívar', 'urbano', point(-74.174195, 4.586006)),
  ('002449', 'Espino I', 'Ciudad Bolívar', 'urbano', point(-74.177402, 4.583202)),
  ('002450', 'Perdomo Alto (2)', 'Ciudad Bolívar', 'urbano', point(-74.166953, 4.586946)),
  ('002451', 'San Antonio del Mirador', 'Ciudad Bolívar', 'urbano', point(-74.173157, 4.580788)),
  ('002453', 'Ciudad Bolívar', 'Ciudad Bolívar', 'urbano', point(-74.172187, 4.559657)),
  ('002455', 'La Valvanera', 'Ciudad Bolívar', 'urbano', point(-74.164881, 4.590197)),
  ('002456', 'Quiba I', 'Ciudad Bolívar', 'urbano', point(-74.140532, 4.541521)),
  ('002460', 'Arborizadora Alta I', 'Ciudad Bolívar', 'urbano', point(-74.156332, 4.568357)),
  ('002461', 'Arborizadora Alta II', 'Ciudad Bolívar', 'urbano', point(-74.155389, 4.571008)),
  ('002501', 'San Carlos', 'Tunjuelito', 'urbano', point(-74.131215, 4.566608)),
  ('002502', 'Millan', 'Ciudad Bolívar', 'urbano', point(-74.146133, 4.559606)),
  ('002503', 'La Aurora', 'Usme', 'urbano', point(-74.121019, 4.522342)),
  ('002504', 'Compartir', 'Ciudad Bolívar', 'urbano', point(-74.145934, 4.557109)),
  ('002505', 'Nuevo San Andrés', 'Usme', 'urbano', point(-74.119824, 4.52516)),
  ('002506', 'Gran Yomasa', 'Usme', 'urbano', point(-74.110645, 4.508166)),
  ('002507', 'Abraham Lincoln', 'Tunjuelito', 'urbano', point(-74.123793, 4.557517)),
  ('002508', 'Tunjuelito', 'Tunjuelito', 'urbano', point(-74.127932, 4.561614)),
  ('002509', 'San Benito', 'Tunjuelito', 'urbano', point(-74.135645, 4.563896)),
  ('002510', 'La Picota Oriental', 'Rafael Uribe Uribe', 'urbano', point(-74.113155, 4.545083)),
  ('002511', 'La Picota', 'Rafael Uribe Uribe', 'urbano', point(-74.118265, 4.547495)),
  ('002512', 'Area Artillería', 'Tunjuelito', 'urbano', point(-74.126984, 4.552178)),
  ('002513', 'Las Acacias', 'Ciudad Bolívar', 'urbano', point(-74.144201, 4.562729)),
  ('002514', 'Meissen', 'Ciudad Bolívar', 'urbano', point(-74.13581, 4.559142)),
  ('002515', 'San Francisco', 'Ciudad Bolívar', 'urbano', point(-74.149083, 4.562546)),
  ('002516', 'México', 'Ciudad Bolívar', 'urbano', point(-74.136094, 4.554629)),
  ('002517', 'Lucero del Sur', 'Ciudad Bolívar', 'urbano', point(-74.141236, 4.551248)),
  ('002518', 'Ronda', 'Ciudad Bolívar', 'urbano', point(-74.141113, 4.565541)),
  ('002519', 'Danubio', 'Usme', 'urbano', point(-74.115816, 4.539259)),
  ('002520', 'Las Manas', 'Ciudad Bolívar', 'urbano', point(-74.166516, 4.567262)),
  ('002521', 'Lucero Alto', 'Ciudad Bolívar', 'urbano', point(-74.13998, 4.55792)),
  ('002522', 'El Mochuelo Oriental', 'Ciudad Bolívar', 'urbano', point(-74.125094, 4.536289)),
  ('002523', 'La Alameda', 'Ciudad Bolívar', 'urbano', point(-74.138556, 4.549636)),
  ('002524', 'La Andrea', 'Usme', 'urbano', point(-74.112844, 4.512579)),
  ('002525', 'Barranquillita', 'Usme', 'urbano', point(-74.116535, 4.523736)),
  ('002526', 'Santa Librada', 'Usme', 'urbano', point(-74.119063, 4.516821)),
  ('002527', 'La Cabaña (2)', 'Usme', 'urbano', point(-74.107965, 4.511777)),
  ('002528', 'Santa Librada Norte', 'Usme', 'urbano', point(-74.113724, 4.516998)),
  ('002529', 'La Marichuela', 'Usme', 'urbano', point(-74.118575, 4.510267)),
  ('002530', 'Quiba', 'Ciudad Bolívar', 'urbano', point(-74.14241, 4.538499)),
  ('002531', 'Candelaria la Nueva', 'Ciudad Bolívar', 'urbano', point(-74.150589, 4.566721)),
  ('002532', 'Quintas del Sur', 'Ciudad Bolívar', 'urbano', point(-74.139756, 4.546515)),
  ('002533', 'Sotavento', 'Ciudad Bolívar', 'urbano', point(-74.139152, 4.544369)),
  ('002534', 'Casa de Teja', 'Ciudad Bolívar', 'urbano', point(-74.135705, 4.541279)),
  ('002535', 'Palermo Sur', 'Rafael Uribe Uribe', 'urbano', point(-74.109357, 4.541662)),
  ('002536', 'Monteblanco', 'Usme', 'urbano', point(-74.117894, 4.504962)),
  ('002537', 'Chuniza', 'Usme', 'urbano', point(-74.109061, 4.505055)),
  ('002538', 'Usminia', 'Usme', 'urbano', point(-74.116276, 4.494309)),
  ('002539', 'San Rafael', 'Ciudad Bolívar', 'urbano', point(-74.149526, 4.547794)),
  ('002540', 'Estrella del Sur', 'Ciudad Bolívar', 'urbano', point(-74.144714, 4.544774)),
  ('002541', 'Granada Sur', 'Usme', 'urbano', point(-74.122882, 4.518089)),
  ('002542', 'Serranias', 'Usme', 'urbano', point(-74.113775, 4.499363)),
  ('002543', 'Comuneros', 'Usme', 'urbano', point(-74.109115, 4.498311)),
  ('002544', 'Los Laureles II', 'Ciudad Bolívar', 'urbano', point(-74.152407, 4.57162)),
  ('002545', 'El Satélite', 'Ciudad Bolívar', 'urbano', point(-74.147659, 4.56847)),
  ('002546', 'Naciones Unidas', 'Ciudad Bolívar', 'urbano', point(-74.149026, 4.541444)),
  ('002547', 'El Tesoro', 'Ciudad Bolívar', 'urbano', point(-74.148943, 4.536667)),
  ('002548', 'El Virrey', 'Usme', 'urbano', point(-74.113137, 4.502513)),
  ('002549', 'Villa Gloria', 'Ciudad Bolívar', 'urbano', point(-74.151649, 4.549735)),
  ('002550', 'Duitama', 'Usme', 'urbano', point(-74.11399, 4.527362)),
  ('002551', 'Alaska', 'Usme', 'urbano', point(-74.111246, 4.529911)),
  ('002552', 'Juan Pablo II', 'Ciudad Bolívar', 'urbano', point(-74.149969, 4.554142)),
  ('002553', 'Sumapaz', 'Ciudad Bolívar', 'urbano', point(-74.146815, 4.554146)),
  ('002554', 'Gibraltar Sur', 'Ciudad Bolívar', 'urbano', point(-74.142475, 4.555343)),
  ('002555', 'San Juan Bautista', 'Usme', 'urbano', point(-74.119956, 4.514002)),
  ('002556', 'Desarrollo Brazuelos I', 'Usme', 'urbano', point(-74.117524, 4.497552)),
  ('002557', 'Juan José Rondón', 'Ciudad Bolívar', 'urbano', point(-74.152956, 4.563509)),
  ('002558', 'Villas el Diamante', 'Ciudad Bolívar', 'urbano', point(-74.153755, 4.550523)),
  ('002559', 'Los Alpes Sur', 'Ciudad Bolívar', 'urbano', point(-74.153776, 4.543051)),
  ('002560', 'Bellavista Lucero Alto', 'Ciudad Bolívar', 'urbano', point(-74.145729, 4.548436)),
  ('002561', 'Cordillera del Sur', 'Ciudad Bolívar', 'urbano', point(-74.15344, 4.539961)),
  ('002562', 'Central de Mezclas', 'Ciudad Bolívar', 'urbano', point(-74.132554, 4.547196)),
  ('002563', 'El Pedregal', 'Usme', 'urbano', point(-74.113799, 4.522369)),
  ('002564', 'El Minuto de María', 'Ciudad Bolívar', 'urbano', point(-74.142315, 4.536172)),
  ('002565', 'Paraíso Quiba', 'Ciudad Bolívar', 'urbano', point(-74.161956, 4.551564)),
  ('002566', 'La Paz', 'Rafael Uribe Uribe', 'urbano', point(-74.114749, 4.542091)),
  ('002568', 'Arborizadora Alta', 'Ciudad Bolívar', 'urbano', point(-74.163488, 4.565137)),
  ('002569', 'Arborizadora Alta (2)', 'Ciudad Bolívar', 'urbano', point(-74.166371, 4.562678)),
  ('002570', 'El Mirador', 'Ciudad Bolívar', 'urbano', point(-74.15635, 4.553551)),
  ('002571', 'Antonio José de Sucre', 'Usme', 'urbano', point(-74.114611, 4.492646)),
  ('002572', 'Salazar Usme', 'Usme', 'urbano', point(-74.113801, 4.518388)),
  ('002573', 'Arborizadora Alta (3)', 'Ciudad Bolívar', 'urbano', point(-74.159063, 4.5674)),
  ('002574', 'Cedritos del Sur', 'Ciudad Bolívar', 'urbano', point(-74.145233, 4.540283)),
  ('002575', 'Cerro Colorado', 'Ciudad Bolívar', 'urbano', point(-74.157703, 4.56161)),
  ('002576', 'Serranias I', 'Usme', 'urbano', point(-74.111616, 4.497696)),
  ('002577', 'Danubio II', 'Usme', 'urbano', point(-74.111413, 4.538979)),
  ('002578', 'Arabia', 'Ciudad Bolívar', 'urbano', point(-74.147376, 4.533559)),
  ('002579', 'Villa Candelaria', 'Ciudad Bolívar', 'urbano', point(-74.152962, 4.567463)),
  ('002580', 'Bella Flor', 'Ciudad Bolívar', 'urbano', point(-74.160943, 4.545378)),
  ('002581', 'La Torre', 'Ciudad Bolívar', 'urbano', point(-74.162369, 4.54127)),
  ('002582', 'Bella Flor Sur', 'Ciudad Bolívar', 'urbano', point(-74.15639, 4.546491)),
  ('002583', 'Quiba Urbano', 'Ciudad Bolívar', 'urbano', point(-74.14368, 4.534412)),
  ('002584', 'El Mochuelo', 'Ciudad Bolívar', 'urbano', point(-74.136821, 4.537467)),
  ('002585', 'El Mochuelo Urbano', 'Ciudad Bolívar', 'urbano', point(-74.152937, 4.534112)),
  ('002586', 'Yomasa Norte', 'Usme', 'urbano', point(-74.118972, 4.501652)),
  ('002587', 'Brisas del Volador', 'Ciudad Bolívar', 'urbano', point(-74.155098, 4.546655)),
  ('002589', 'Porvenir', 'Usme', 'urbano', point(-74.117461, 4.533245)),
  ('002590', 'La Fiscala', 'Usme', 'urbano', point(-74.110888, 4.532304)),
  ('002591', 'Brazuelos Occidental', 'Ciudad Bolívar', 'urbano', point(-74.122514, 4.496663)),
  ('002592', 'Desarrollo Brazuelos', 'Usme', 'urbano', point(-74.120413, 4.492736)),
  ('002593', 'Tunjuelito', 'Usme', 'urbano', point(-74.121752, 4.512852)),
  ('002594', 'Villa Israel', 'Usme', 'urbano', point(-74.114448, 4.489521)),
  ('002595', 'Lagunitas Urbano', 'Ciudad Bolívar', 'urbano', point(-74.146664, 4.508179)),
  ('002597', 'La Fiscala Norte', 'Usme', 'urbano', point(-74.111427, 4.536694)),
  ('002598', 'El Mochuelo II Urbano', 'Ciudad Bolívar', 'urbano', point(-74.132753, 4.535107)),
  ('002599', 'Centro Usme Urbano', 'Usme', 'urbano', point(-74.124993, 4.473818)),
  ('002601', 'Arrayanes I', 'Usme', 'urbano', point(-74.100924, 4.542802)),
  ('002602', 'Fiscala Alta', 'Usme', 'urbano', point(-74.10168, 4.526356)),
  ('002604', 'Los Olivares', 'Usme', 'urbano', point(-74.105121, 4.515278)),
  ('002605', 'Bolonia', 'Usme', 'urbano', point(-74.100853, 4.509386)),
  ('002606', 'El Curubo', 'Usme', 'urbano', point(-74.104627, 4.511008)),
  ('002607', 'La Esperanza Sur', 'Usme', 'urbano', point(-74.102056, 4.507375)),
  ('002608', 'El Bosque Central I', 'Usme', 'urbano', point(-74.098996, 4.505151)),
  ('002609', 'El Bosque', 'Usme', 'urbano', point(-74.101403, 4.505498)),
  ('002610', 'Chapinerito', 'Usme', 'urbano', point(-74.103686, 4.504087)),
  ('002611', 'Charala', 'Usme', 'urbano', point(-74.107322, 4.501733)),
  ('002612', 'La Comuna', 'Usme', 'urbano', point(-74.101039, 4.500356)),
  ('002613', 'El Progreso Usme', 'Usme', 'urbano', point(-74.103749, 4.497231)),
  ('002614', 'La Orquídea de Usme', 'Usme', 'urbano', point(-74.106863, 4.495739)),
  ('002615', 'La Esperanza de Usme', 'Usme', 'urbano', point(-74.110902, 4.493643)),
  ('002616', 'El Nuevo Portal', 'Usme', 'urbano', point(-74.102831, 4.493045)),
  ('002617', 'El Refugio I', 'Usme', 'urbano', point(-74.098185, 4.488669)),
  ('002618', 'Puerta Al Llano de Usme', 'Usme', 'urbano', point(-74.102317, 4.487449)),
  ('002619', 'Villa Anita', 'Usme', 'urbano', point(-74.11869, 4.489165)),
  ('002620', 'El Nuevo Portal II', 'Usme', 'urbano', point(-74.100696, 4.490774)),
  ('002621', 'San Felipe de Usme', 'Usme', 'urbano', point(-74.099306, 4.502067)),
  ('002622', 'Tocaimita Oriental I', 'Usme', 'urbano', point(-74.098048, 4.502104)),
  ('002625', 'Arrayanes V', 'Usme', 'urbano', point(-74.101718, 4.534587)),
  ('002626', 'Bolonia I', 'Usme', 'urbano', point(-74.098505, 4.516037)),
  ('002627', 'La Reforma', 'Usme', 'urbano', point(-74.10425, 4.500894)),
  ('002629', 'El Nevado II', 'Usme', 'urbano', point(-74.105811, 4.521775)),
  ('002630', 'El Portal del Divino', 'Usme', 'urbano', point(-74.097848, 4.486157)),
  ('002631', 'El Nevado', 'Usme', 'urbano', point(-74.111402, 4.527372)),
  ('002632', 'La Requilina', 'Usme', 'urbano', point(-74.121439, 4.481731)),
  ('002633', 'Las Violetas', 'Usme', 'urbano', point(-74.080827, 4.498912)),
  ('002634', 'El Tuno', 'Usme', 'urbano', point(-74.110818, 4.486147)),
  ('002635', 'Brisas del Llano', 'Usme', 'urbano', point(-74.103694, 4.485928)),
  ('002636', 'La Huerta', 'Usme', 'urbano', point(-74.102086, 4.484335)),
  ('002637', 'Arrayanes VI', 'Rafael Uribe Uribe', 'urbano', point(-74.099791, 4.536892)),
  ('002640', 'El Pedregal II', 'Usme', 'urbano', point(-74.109897, 4.520079)),
  ('002642', 'El Portal Urbano', 'Usme', 'urbano', point(-74.100666, 4.494303)),
  ('002643', 'El Salteador', 'Usme', 'urbano', point(-74.103414, 4.483987)),
  ('002644', 'Centro Usme Urbano I', 'Usme', 'urbano', point(-74.127591, 4.470954)),
  ('002645', 'Puerta Al Llano I', 'Usme', 'urbano', point(-74.109389, 4.493049)),
  ('002646', 'El Mochuelo V', 'Ciudad Bolívar', 'rural', point(-74.150494, 4.531313)),
  ('003101', 'La Alameda', 'Santa Fe', 'urbano', point(-74.073381, 4.610929)),
  ('003102', 'Las Nieves', 'Santa Fe', 'urbano', point(-74.069736, 4.607536)),
  ('003103', 'Las Aguas', 'La Candelaria', 'urbano', point(-74.065733, 4.602103)),
  ('003104', 'La Concordia', 'La Candelaria', 'urbano', point(-74.069468, 4.597475)),
  ('003105', 'Egipto', 'La Candelaria', 'urbano', point(-74.069799, 4.594891)),
  ('003106', 'Centro Administrativo', 'La Candelaria', 'urbano', point(-74.076575, 4.596223)),
  ('003107', 'Santa Inés', 'Santa Fe', 'urbano', point(-74.081037, 4.598846)),
  ('003108', 'La Capuchina', 'Santa Fe', 'urbano', point(-74.077039, 4.604769)),
  ('003109', 'Veracruz', 'Santa Fe', 'urbano', point(-74.072263, 4.603319)),
  ('003110', 'La Catedral', 'La Candelaria', 'urbano', point(-74.073555, 4.59957)),
  ('003201', 'San Bernardo', 'Santa Fe', 'urbano', point(-74.084891, 4.593128)),
  ('003202', 'Las Cruces', 'Santa Fe', 'urbano', point(-74.080162, 4.587906)),
  ('003203', 'Santa Bárbara', 'La Candelaria', 'urbano', point(-74.077911, 4.592276)),
  ('003204', 'Belén', 'La Candelaria', 'urbano', point(-74.072656, 4.591361)),
  ('003205', 'El Guavio', 'Santa Fe', 'urbano', point(-74.070197, 4.589096)),
  ('003206', 'La Peña', 'Santa Fe', 'urbano', point(-74.066328, 4.586862)),
  ('003207', 'Los Laches', 'Santa Fe', 'urbano', point(-74.068023, 4.585758)),
  ('003208', 'El Rocío', 'Santa Fe', 'urbano', point(-74.070054, 4.582777)),
  ('003209', 'El Dorado', 'Santa Fe', 'urbano', point(-74.07306, 4.579813)),
  ('003210', 'Ramírez', 'Santa Fe', 'urbano', point(-74.076128, 4.582725)),
  ('003211', 'Girardot', 'Santa Fe', 'urbano', point(-74.074436, 4.58623)),
  ('003212', 'Lourdes', 'Santa Fe', 'urbano', point(-74.073629, 4.588523)),
  ('003215', 'San Francisco Rural', 'Santa Fe', 'urbano', point(-74.067016, 4.591673)),
  ('003221', 'La Peña I', 'Santa Fe', 'urbano', point(-74.065338, 4.586536)),
  ('004101', 'Ricaurte', 'Los Mártires', 'urbano', point(-74.092863, 4.608555)),
  ('004102', 'La Sabana', 'Los Mártires', 'urbano', point(-74.087098, 4.607861)),
  ('004103', 'Voto Nacional', 'Los Mártires', 'urbano', point(-74.083741, 4.60333)),
  ('004104', 'La Estanzuela', 'Los Mártires', 'urbano', point(-74.087734, 4.600045)),
  ('004105', 'Eduardo Santos', 'Los Mártires', 'urbano', point(-74.090169, 4.595046)),
  ('004106', 'El Vergel', 'Los Mártires', 'urbano', point(-74.09564, 4.596666)),
  ('004107', 'Santa Isabel Sur', 'Los Mártires', 'urbano', point(-74.102459, 4.597496)),
  ('004108', 'Santa Isabel', 'Los Mártires', 'urbano', point(-74.099446, 4.600047)),
  ('004109', 'Veraguas', 'Los Mártires', 'urbano', point(-74.097411, 4.603163)),
  ('004110', 'La Pepita', 'Los Mártires', 'urbano', point(-74.089655, 4.604832)),
  ('004111', 'El Progreso', 'Los Mártires', 'urbano', point(-74.093098, 4.600833)),
  ('004201', 'Pensilvania', 'Puente Aranda', 'urbano', point(-74.097616, 4.612637)),
  ('004202', 'Comuneros', 'Puente Aranda', 'urbano', point(-74.102334, 4.607152)),
  ('004203', 'La Asunción', 'Puente Aranda', 'urbano', point(-74.104557, 4.60289)),
  ('004204', 'Montes', 'Puente Aranda', 'urbano', point(-74.114838, 4.610239)),
  ('004205', 'Primavera Occidental', 'Puente Aranda', 'urbano', point(-74.109094, 4.614891)),
  ('004206', 'San Francisco', 'Puente Aranda', 'urbano', point(-74.109392, 4.620332)),
  ('004207', 'Gorgonzola', 'Puente Aranda', 'urbano', point(-74.104165, 4.622448)),
  ('004208', 'Los Ejidos', 'Puente Aranda', 'urbano', point(-74.100458, 4.617943)),
  ('004209', 'Santa Matilde', 'Puente Aranda', 'urbano', point(-74.10847, 4.601246)),
  ('004210', 'Jorge Gaitán Cortes', 'Puente Aranda', 'urbano', point(-74.11126, 4.607534)),
  ('004211', 'Bochica', 'Puente Aranda', 'urbano', point(-74.107687, 4.605201)),
  ('004212', 'Tibana', 'Puente Aranda', 'urbano', point(-74.106513, 4.611303)),
  ('004301', 'San Rafael Industrial', 'Puente Aranda', 'urbano', point(-74.111336, 4.625772)),
  ('004302', 'San Rafael', 'Puente Aranda', 'urbano', point(-74.112527, 4.621371)),
  ('004303', 'Barcelona', 'Puente Aranda', 'urbano', point(-74.114994, 4.618249)),
  ('004304', 'Galán', 'Puente Aranda', 'urbano', point(-74.121707, 4.617951)),
  ('004305', 'La Pradera', 'Puente Aranda', 'urbano', point(-74.12134, 4.625889)),
  ('004306', 'La Trinidad', 'Puente Aranda', 'urbano', point(-74.118108, 4.625636)),
  ('004307', 'San Gabriel', 'Puente Aranda', 'urbano', point(-74.118028, 4.62302)),
  ('004308', 'Colón', 'Puente Aranda', 'urbano', point(-74.115907, 4.621699)),
  ('004309', 'La Camelia', 'Puente Aranda', 'urbano', point(-74.118469, 4.611158)),
  ('004310', 'Provivienda Norte', 'Puente Aranda', 'urbano', point(-74.125706, 4.613658)),
  ('004316', 'Las Margaritas', 'Kennedy', 'urbano', point(-74.175658, 4.631687)),
  ('004317', 'La Camelia II', 'Puente Aranda', 'urbano', point(-74.118602, 4.614132)),
  ('004401', 'San Eusebio', 'Puente Aranda', 'urbano', point(-74.123398, 4.607664)),
  ('004402', 'Remanso', 'Puente Aranda', 'urbano', point(-74.113888, 4.602344)),
  ('004403', 'Autopista Muzu', 'Puente Aranda', 'urbano', point(-74.122486, 4.597891)),
  ('004404', 'Autopista Sur', 'Puente Aranda', 'urbano', point(-74.12643, 4.597943)),
  ('004405', 'Ospina Pérez Sur', 'Puente Aranda', 'urbano', point(-74.132023, 4.596072)),
  ('004406', 'Ospina Pérez', 'Puente Aranda', 'urbano', point(-74.129348, 4.599462)),
  ('004407', 'Alcalá', 'Puente Aranda', 'urbano', point(-74.126449, 4.603044)),
  ('004408', 'Tejar', 'Puente Aranda', 'urbano', point(-74.129134, 4.605992)),
  ('004409', 'Alquería', 'Puente Aranda', 'urbano', point(-74.133597, 4.599338)),
  ('004412', 'Remanso Sur', 'Puente Aranda', 'urbano', point(-74.11653, 4.600866)),
  ('004413', 'Autopista Muzu Oriental', 'Puente Aranda', 'urbano', point(-74.118156, 4.596422)),
  ('004501', 'Hipotecho', 'Kennedy', 'urbano', point(-74.132142, 4.627579)),
  ('004502', 'Hipotecho Occidental', 'Kennedy', 'urbano', point(-74.134403, 4.62142)),
  ('004503', 'Provivienda Oriental', 'Kennedy', 'urbano', point(-74.131463, 4.614784)),
  ('004504', 'Provivienda', 'Kennedy', 'urbano', point(-74.137074, 4.610908)),
  ('004505', 'Provivienda Occidental', 'Kennedy', 'urbano', point(-74.144427, 4.614116)),
  ('004506', 'La Campina', 'Kennedy', 'urbano', point(-74.14488, 4.607325)),
  ('004507', 'Ciudad Kennedy Sur', 'Kennedy', 'urbano', point(-74.159143, 4.619075)),
  ('004508', 'Ciudad Kennedy Occidental', 'Kennedy', 'urbano', point(-74.161157, 4.622271)),
  ('004509', 'Ciudad Kennedy', 'Kennedy', 'urbano', point(-74.141424, 4.623905)),
  ('004510', 'Ciudad Kennedy Oriental', 'Kennedy', 'urbano', point(-74.147972, 4.620642)),
  ('004511', 'Ciudad Kennedy Central', 'Kennedy', 'urbano', point(-74.152741, 4.621925)),
  ('004512', 'Timiza', 'Kennedy', 'urbano', point(-74.151173, 4.616063)),
  ('004513', 'San Diego-bosa', 'Bosa', 'urbano', point(-74.210694, 4.611846)),
  ('004514', 'Ciudad Kennedy Norte', 'Kennedy', 'urbano', point(-74.153553, 4.628813)),
  ('004515', 'Tundama', 'Kennedy', 'urbano', point(-74.150091, 4.601499)),
  ('004516', 'Boita', 'Kennedy', 'urbano', point(-74.154512, 4.603581)),
  ('004517', 'Jacqueline', 'Kennedy', 'urbano', point(-74.163569, 4.607859)),
  ('004518', 'Timiza A', 'Kennedy', 'urbano', point(-74.152673, 4.609471)),
  ('004519', 'Escocia', 'Bosa', 'urbano', point(-74.185229, 4.621053)),
  ('004520', 'La Paz Bosa', 'Bosa', 'urbano', point(-74.185674, 4.616486)),
  ('004521', 'La Estación Bosa', 'Bosa', 'urbano', point(-74.187169, 4.59908)),
  ('004522', 'Bosa', 'Bosa', 'urbano', point(-74.182691, 4.610015)),
  ('004523', 'Jiménez de Quesada', 'Bosa', 'urbano', point(-74.184802, 4.605285)),
  ('004524', 'San Pablo Bosa', 'Bosa', 'urbano', point(-74.189829, 4.604619)),
  ('004525', 'Pastrana', 'Kennedy', 'urbano', point(-74.16642, 4.617059)),
  ('004526', 'Bosa Nova', 'Bosa', 'urbano', point(-74.18915, 4.619244)),
  ('004527', 'Nueva Granada Bosa', 'Bosa', 'urbano', point(-74.192405, 4.600408)),
  ('004528', 'Paso Ancho', 'Bosa', 'urbano', point(-74.193315, 4.611549)),
  ('004529', 'Cementerio Jardines Apogeo', 'Bosa', 'urbano', point(-74.171944, 4.600418)),
  ('004530', 'Timiza B', 'Kennedy', 'urbano', point(-74.158046, 4.611142)),
  ('004531', 'Mandalay', 'Kennedy', 'urbano', point(-74.143546, 4.629278)),
  ('004532', 'La Cecilia', 'Kennedy', 'urbano', point(-74.174966, 4.60555)),
  ('004533', 'El Retazo', 'Bosa', 'urbano', point(-74.194965, 4.606208)),
  ('004534', 'Roma', 'Kennedy', 'urbano', point(-74.173377, 4.610876)),
  ('004535', 'Class', 'Kennedy', 'urbano', point(-74.178289, 4.614134)),
  ('004536', 'El Rubí', 'Kennedy', 'urbano', point(-74.176401, 4.609186)),
  ('004537', 'Casablanca', 'Kennedy', 'urbano', point(-74.170819, 4.615611)),
  ('004538', 'Olarte', 'Bosa', 'urbano', point(-74.164603, 4.600012)),
  ('004539', 'Gran Colombiano', 'Bosa', 'urbano', point(-74.199113, 4.611523)),
  ('004540', 'Catalina II', 'Kennedy', 'urbano', point(-74.170457, 4.606119)),
  ('004541', 'El Paraíso Bosa', 'Kennedy', 'urbano', point(-74.168486, 4.641093)),
  ('004542', 'Alquería la Fragua Norte', 'Kennedy', 'urbano', point(-74.133184, 4.605618)),
  ('004543', 'Alquería la Fragua', 'Kennedy', 'urbano', point(-74.136723, 4.602605)),
  ('004544', 'Las Delicias', 'Kennedy', 'urbano', point(-74.14539, 4.598429)),
  ('004545', 'Catalina', 'Kennedy', 'urbano', point(-74.16824, 4.610398)),
  ('004546', 'Villa del Rio', 'Bosa', 'urbano', point(-74.158469, 4.600629)),
  ('004547', 'Corabastos', 'Kennedy', 'urbano', point(-74.159076, 4.631162)),
  ('004548', 'Techo', 'Kennedy', 'urbano', point(-74.147431, 4.626891)),
  ('004549', 'Nueva York', 'Kennedy', 'urbano', point(-74.14049, 4.605545)),
  ('004550', 'José María Carbonel', 'Bosa', 'urbano', point(-74.196978, 4.602556)),
  ('004551', 'Hipotecho Sur', 'Kennedy', 'urbano', point(-74.126617, 4.623473)),
  ('004552', 'Gualoche', 'Bosa', 'urbano', point(-74.182639, 4.600197)),
  ('004553', 'Andalucía II', 'Bosa', 'urbano', point(-74.180033, 4.601684)),
  ('004554', 'Patio Bonito', 'Kennedy', 'urbano', point(-74.161272, 4.639287)),
  ('004555', 'Patio Bonito II', 'Kennedy', 'urbano', point(-74.165153, 4.636314)),
  ('004556', 'Gran Britalia I', 'Kennedy', 'urbano', point(-74.171094, 4.624339)),
  ('004557', 'Gran Britalia', 'Kennedy', 'urbano', point(-74.176358, 4.618338)),
  ('004558', 'Campo Hermoso', 'Kennedy', 'urbano', point(-74.16478, 4.640434)),
  ('004559', 'El Carmelo', 'Kennedy', 'urbano', point(-74.176769, 4.620057)),
  ('004560', 'Saucedal', 'Kennedy', 'urbano', point(-74.161836, 4.635044)),
  ('004561', 'El Jardín', 'Bosa', 'urbano', point(-74.20849, 4.614027)),
  ('004562', 'Llano Grande', 'Kennedy', 'urbano', point(-74.163451, 4.632821)),
  ('004563', 'Guadalupe', 'Ciudad Bolívar', 'urbano', point(-74.153972, 4.597203)),
  ('004564', 'Tairona', 'Kennedy', 'urbano', point(-74.157803, 4.64044)),
  ('004565', 'Tocarema', 'Kennedy', 'urbano', point(-74.163518, 4.612894)),
  ('004566', 'Patio Bonito III', 'Kennedy', 'urbano', point(-74.160989, 4.642912)),
  ('004567', 'Villas del Progreso', 'Bosa', 'urbano', point(-74.201704, 4.624293)),
  ('004568', 'Jorge Uribe Botero', 'Kennedy', 'urbano', point(-74.17729, 4.62292)),
  ('004569', 'José Antonio Galán', 'Bosa', 'urbano', point(-74.179294, 4.607363)),
  ('004570', 'Antonia Santos', 'Bosa', 'urbano', point(-74.188485, 4.611398)),
  ('004572', 'Corredor Ferreo del Sur', 'Kennedy', 'urbano', point(-74.139462, 4.605045)),
  ('004573', 'Ciudadela el Recreo', 'Bosa', 'urbano', point(-74.202651, 4.631994)),
  ('004574', 'Charles de Gaulle', 'Bosa', 'urbano', point(-74.201091, 4.606896)),
  ('004575', 'Los Laureles', 'Bosa', 'urbano', point(-74.202799, 4.614184)),
  ('004576', 'Casa Blanca Sur', 'Kennedy', 'urbano', point(-74.171687, 4.618206)),
  ('004577', 'San Bernardino XXII Urbano', 'Bosa', 'urbano', point(-74.214639, 4.624228)),
  ('004578', 'Villa Nelly III Sector', 'Kennedy', 'urbano', point(-74.16229, 4.624494)),
  ('004579', 'Escocia (2)', 'Bosa', 'urbano', point(-74.187551, 4.625376)),
  ('004580', 'Bosa Nova el Porvenir', 'Bosa', 'urbano', point(-74.189856, 4.621745)),
  ('004581', 'Timiza C', 'Kennedy', 'urbano', point(-74.159141, 4.614645)),
  ('004582', 'Renania Urapanes', 'Kennedy', 'urbano', point(-74.147252, 4.604658)),
  ('004583', 'Argelia II', 'Bosa', 'urbano', point(-74.184464, 4.614214)),
  ('004584', 'Santa Catalina', 'Kennedy', 'urbano', point(-74.152381, 4.605409)),
  ('004586', 'Jiménez de Quesada II Sector', 'Bosa', 'urbano', point(-74.188446, 4.607728)),
  ('004587', 'Los Sauces', 'Bosa', 'urbano', point(-74.190899, 4.617037)),
  ('004588', 'El Danubio Azul', 'Bosa', 'urbano', point(-74.182228, 4.62151)),
  ('004589', 'San Pedro', 'Bosa', 'urbano', point(-74.192614, 4.620198)),
  ('004590', 'San Bernardino XXV Urbano', 'Bosa', 'urbano', point(-74.218667, 4.623218)),
  ('004591', 'El Portal del Brasil', 'Bosa', 'urbano', point(-74.18622, 4.630207)),
  ('004592', 'San Martín', 'Bosa', 'urbano', point(-74.187971, 4.628724)),
  ('004593', 'La Libertad', 'Bosa', 'urbano', point(-74.190317, 4.628726)),
  ('004594', 'San Antonio', 'Bosa', 'urbano', point(-74.197341, 4.625153)),
  ('004595', 'Chicó Sur', 'Bosa', 'urbano', point(-74.19323, 4.623716)),
  ('004596', 'Alquería la Fragua II', 'Kennedy', 'urbano', point(-74.139547, 4.600414)),
  ('004597', 'San Bernardino I', 'Bosa', 'urbano', point(-74.205353, 4.606985)),
  ('004598', 'Villa Anny I', 'Bosa', 'urbano', point(-74.203031, 4.603384)),
  ('004599', 'Villa Anny II', 'Bosa', 'urbano', point(-74.199121, 4.601204)),
  ('004601', 'Calandaima', 'Kennedy', 'urbano', point(-74.167195, 4.643531)),
  ('004602', 'Remanso Urbano', 'Bosa', 'urbano', point(-74.203602, 4.617436)),
  ('004603', 'El Paraíso', 'Kennedy', 'urbano', point(-74.170719, 4.642778)),
  ('004604', 'Brasilia', 'Bosa', 'urbano', point(-74.182001, 4.628598)),
  ('004605', 'Chicala', 'Bosa', 'urbano', point(-74.181061, 4.624727)),
  ('004607', 'Ciudad de Cali', 'Kennedy', 'urbano', point(-74.172342, 4.64118)),
  ('004609', 'Los Almendros', 'Kennedy', 'urbano', point(-74.175709, 4.646672)),
  ('004611', 'El Jazmín', 'Kennedy', 'urbano', point(-74.178357, 4.646036)),
  ('004612', 'Dindalito', 'Kennedy', 'urbano', point(-74.175306, 4.640534)),
  ('004613', 'Provivienda Occidental (2)', 'Kennedy', 'urbano', point(-74.167864, 4.635679)),
  ('004614', 'Dindalito (2)', 'Kennedy', 'urbano', point(-74.172656, 4.635487)),
  ('004615', 'Osorio XII', 'Kennedy', 'urbano', point(-74.180891, 4.642575)),
  ('004616', 'Osorio X Urbano', 'Bosa', 'urbano', point(-74.183977, 4.639697)),
  ('004617', 'Tintalito', 'Kennedy', 'urbano', point(-74.170768, 4.630391)),
  ('004618', 'Dintalito', 'Kennedy', 'urbano', point(-74.169429, 4.633198)),
  ('004619', 'Chucua de la Vaca III', 'Kennedy', 'urbano', point(-74.163511, 4.629323)),
  ('004620', 'Chucua de la Vaca II', 'Kennedy', 'urbano', point(-74.164984, 4.627449)),
  ('004621', 'Chucua de la Vaca I', 'Kennedy', 'urbano', point(-74.167133, 4.624938)),
  ('004622', 'Brasil', 'Bosa', 'urbano', point(-74.182175, 4.631974)),
  ('004623', 'San Bernardino Potreritos', 'Bosa', 'urbano', point(-74.204947, 4.622576)),
  ('004624', 'La Vega San Bernardino', 'Bosa', 'urbano', point(-74.207408, 4.619936)),
  ('004625', 'El Remanso I', 'Bosa', 'urbano', point(-74.200139, 4.620334)),
  ('004626', 'Las Acacias', 'Kennedy', 'urbano', point(-74.177628, 4.649808)),
  ('004627', 'Galán', 'Kennedy', 'urbano', point(-74.172303, 4.648812)),
  ('004628', 'Betania', 'Bosa', 'urbano', point(-74.178765, 4.627104)),
  ('004630', 'Parcela el Porvenir', 'Bosa', 'urbano', point(-74.186571, 4.639667)),
  ('004631', 'El Corzo', 'Bosa', 'urbano', point(-74.189522, 4.636164)),
  ('004632', 'La Cabaña', 'Bosa', 'urbano', point(-74.191528, 4.632509)),
  ('004633', 'Santa Fe Bosa', 'Bosa', 'urbano', point(-74.194189, 4.637005)),
  ('004634', 'Cañaveralejo', 'Bosa', 'urbano', point(-74.198065, 4.641098)),
  ('004635', 'San Bernardino II', 'Bosa', 'urbano', point(-74.197682, 4.636746)),
  ('004637', 'Las Margaritas', 'Bosa', 'urbano', point(-74.195263, 4.63035)),
  ('004638', 'Ciudadela el Recreo II', 'Bosa', 'urbano', point(-74.200445, 4.634223)),
  ('004641', 'La Independencia', 'Bosa', 'urbano', point(-74.196179, 4.620671)),
  ('004642', 'Islandia', 'Bosa', 'urbano', point(-74.195129, 4.615699)),
  ('004643', 'El Corzo I', 'Bosa', 'urbano', point(-74.193271, 4.643501)),
  ('004645', 'Cañaveralejo I', 'Bosa', 'urbano', point(-74.199953, 4.644594)),
  ('004646', 'El Corzo II', 'Bosa', 'urbano', point(-74.197929, 4.647656)),
  ('005101', 'José Joaquín Vargas', 'Barrios Unidos', 'urbano', point(-74.085577, 4.671859)),
  ('005102', 'Popular Modelo', 'Barrios Unidos', 'urbano', point(-74.081648, 4.665875)),
  ('005103', 'San Miguel', 'Barrios Unidos', 'urbano', point(-74.078369, 4.661783)),
  ('005104', 'El Rosario', 'Barrios Unidos', 'urbano', point(-74.080842, 4.655171)),
  ('005105', 'Campín Occidental', 'Teusaquillo', 'urbano', point(-74.079714, 4.648878)),
  ('005106', 'Nicolás de Federmán', 'Teusaquillo', 'urbano', point(-74.082403, 4.647581)),
  ('005107', 'Acevedo Tejada', 'Teusaquillo', 'urbano', point(-74.081465, 4.630691)),
  ('005108', 'Ciudad Universitaria', 'Teusaquillo', 'urbano', point(-74.084596, 4.637847)),
  ('005109', 'Centro Administrativo Occ.', 'Teusaquillo', 'urbano', point(-74.094107, 4.643525)),
  ('005110', 'El Salitre', 'Teusaquillo', 'urbano', point(-74.09881, 4.652362)),
  ('005111', 'La Esmeralda', 'Teusaquillo', 'urbano', point(-74.090776, 4.647289)),
  ('005112', 'Parque Distrital Salitre', 'Barrios Unidos', 'urbano', point(-74.084397, 4.659963)),
  ('005113', 'Paulo VI', 'Teusaquillo', 'urbano', point(-74.088329, 4.650979)),
  ('005114', 'Campo Eucarístico', 'Teusaquillo', 'urbano', point(-74.094027, 4.658628)),
  ('005115', 'Parque Popular Salitre', 'Barrios Unidos', 'urbano', point(-74.089283, 4.665908)),
  ('005116', 'Pablo VI Norte', 'Teusaquillo', 'urbano', point(-74.087524, 4.654982)),
  ('005117', 'Rafael Núñez', 'Teusaquillo', 'urbano', point(-74.087256, 4.643385)),
  ('005201', 'Jorge Eliecer Gaitán', 'Barrios Unidos', 'urbano', point(-74.072635, 4.675294)),
  ('005202', 'Doce de Octubre', 'Barrios Unidos', 'urbano', point(-74.07443, 4.669811)),
  ('005203', 'San Fernando', 'Barrios Unidos', 'urbano', point(-74.077816, 4.669709)),
  ('005204', 'San Fernando Occidental', 'Barrios Unidos', 'urbano', point(-74.081667, 4.674437)),
  ('005205', 'Simón Bolívar', 'Barrios Unidos', 'urbano', point(-74.079622, 4.678471)),
  ('005206', 'La Libertad', 'Barrios Unidos', 'urbano', point(-74.077263, 4.676249)),
  ('005207', 'Metropolis', 'Barrios Unidos', 'urbano', point(-74.081916, 4.680924)),
  ('005304', 'La Castellana', 'Barrios Unidos', 'urbano', point(-74.061134, 4.683175)),
  ('005305', 'La Patria', 'Barrios Unidos', 'urbano', point(-74.064968, 4.67671)),
  ('005306', 'Entrerios', 'Barrios Unidos', 'urbano', point(-74.07576, 4.682085)),
  ('005307', 'Los Andes', 'Barrios Unidos', 'urbano', point(-74.070391, 4.686315)),
  ('005308', 'Rionegro', 'Barrios Unidos', 'urbano', point(-74.065652, 4.683025)),
  ('005310', 'Escuela Militar', 'Barrios Unidos', 'urbano', point(-74.070513, 4.679626)),
  ('005401', 'Potosí', 'Suba', 'urbano', point(-74.078362, 4.69907)),
  ('005402', 'Santa Rosa', 'Suba', 'urbano', point(-74.079561, 4.694363)),
  ('005403', 'Julio Flórez', 'Suba', 'urbano', point(-74.07526, 4.690783)),
  ('005404', 'Las Ferias', 'Engativá', 'urbano', point(-74.084627, 4.68344)),
  ('005405', 'Las Ferias Occidental', 'Engativá', 'urbano', point(-74.087151, 4.686954)),
  ('005406', 'Bonanza', 'Engativá', 'urbano', point(-74.090376, 4.689889)),
  ('005501', 'Palo Blanco', 'Engativá', 'urbano', point(-74.094363, 4.684111)),
  ('005502', 'La Estrada', 'Engativá', 'urbano', point(-74.09331, 4.678132)),
  ('005503', 'Bellavista Occidental', 'Engativá', 'urbano', point(-74.089203, 4.676438)),
  ('005504', 'La Estradita', 'Engativá', 'urbano', point(-74.092461, 4.672477)),
  ('005505', 'Bosque Popular', 'Engativá', 'urbano', point(-74.095961, 4.670149)),
  ('005506', 'Jardín Botánico', 'Engativá', 'urbano', point(-74.101872, 4.663002)),
  ('005507', 'Normandia', 'Engativá', 'urbano', point(-74.10652, 4.668584)),
  ('005508', 'La Cabaña', 'Engativá', 'urbano', point(-74.101503, 4.673826)),
  ('005509', 'San Joaquín', 'Engativá', 'urbano', point(-74.098992, 4.677538)),
  ('005510', 'El Laurel', 'Engativá', 'urbano', point(-74.096434, 4.681051)),
  ('005601', 'El Minuto de Dios', 'Engativá', 'urbano', point(-74.089741, 4.700054)),
  ('005602', 'Santa María', 'Engativá', 'urbano', point(-74.094305, 4.692564)),
  ('005603', 'Boyacá', 'Engativá', 'urbano', point(-74.099643, 4.68611)),
  ('005604', 'El Real', 'Engativá', 'urbano', point(-74.102654, 4.68141)),
  ('005605', 'El Encanto', 'Engativá', 'urbano', point(-74.105298, 4.678616)),
  ('005606', 'Normandia Occidental', 'Engativá', 'urbano', point(-74.109082, 4.672928)),
  ('005607', 'San Ignacio', 'Engativá', 'urbano', point(-74.114954, 4.677287)),
  ('005608', 'Santa Helenita', 'Engativá', 'urbano', point(-74.104671, 4.690566)),
  ('005609', 'Tabora', 'Engativá', 'urbano', point(-74.099232, 4.694006)),
  ('005610', 'La Granja', 'Engativá', 'urbano', point(-74.098173, 4.698868)),
  ('005611', 'Autopista Medellín', 'Engativá', 'urbano', point(-74.094267, 4.700755)),
  ('005612', 'París Gaitán', 'Engativá', 'urbano', point(-74.096229, 4.704884)),
  ('005613', 'La Serena', 'Engativá', 'urbano', point(-74.091695, 4.707855)),
  ('005614', 'Villa Luz', 'Engativá', 'urbano', point(-74.108149, 4.684327)),
  ('005615', 'La Soledad Norte', 'Engativá', 'urbano', point(-74.102723, 4.696977)),
  ('005616', 'Los Cerezos', 'Engativá', 'urbano', point(-74.097693, 4.709138)),
  ('005617', 'Primavera', 'Engativá', 'urbano', point(-74.101815, 4.709069)),
  ('005619', 'París', 'Engativá', 'urbano', point(-74.106229, 4.703314)),
  ('005620', 'Florencia', 'Engativá', 'urbano', point(-74.108601, 4.700115)),
  ('005621', 'Florida Blanca', 'Engativá', 'urbano', point(-74.112462, 4.694316)),
  ('005622', 'Bolivia', 'Engativá', 'urbano', point(-74.114505, 4.717688)),
  ('005623', 'Los Ángeles', 'Engativá', 'urbano', point(-74.120098, 4.696571)),
  ('005624', 'Aeropuerto el Dorado', 'Fontibón', 'urbano', point(-74.142631, 4.698661)),
  ('005625', 'Los Álamos', 'Engativá', 'urbano', point(-74.110673, 4.697477)),
  ('005626', 'Los Álamos (2)', 'Engativá', 'urbano', point(-74.11757, 4.687287)),
  ('005627', 'Garcés Navas', 'Engativá', 'urbano', point(-74.120272, 4.71272)),
  ('005628', 'Garcés Navas Oriental', 'Engativá', 'urbano', point(-74.117898, 4.710043)),
  ('005629', 'El Cedro', 'Engativá', 'urbano', point(-74.11506, 4.705031)),
  ('005630', 'Ciudad Bachue', 'Engativá', 'urbano', point(-74.101284, 4.71833)),
  ('005631', 'Ciudad Bachue I Etapa', 'Engativá', 'urbano', point(-74.10344, 4.714957)),
  ('005632', 'Bochica', 'Engativá', 'urbano', point(-74.106663, 4.711349)),
  ('005634', 'El Cortijo', 'Engativá', 'urbano', point(-74.118813, 4.727853)),
  ('005635', 'El Madrigal', 'Engativá', 'urbano', point(-74.112949, 4.707622)),
  ('005636', 'Engativá Zona Urbana', 'Engativá', 'urbano', point(-74.140437, 4.714213)),
  ('005637', 'Villa Gladys', 'Engativá', 'urbano', point(-74.137381, 4.707588)),
  ('005638', 'Santa Cecilia', 'Engativá', 'urbano', point(-74.111309, 4.677849)),
  ('005639', 'Quirigua Oriental', 'Engativá', 'urbano', point(-74.104624, 4.707216)),
  ('005640', 'Bolivia Oriental', 'Engativá', 'urbano', point(-74.108629, 4.720341)),
  ('005641', 'Santa Mónica', 'Engativá', 'urbano', point(-74.116822, 4.700837)),
  ('005643', 'Álamos', 'Engativá', 'urbano', point(-74.118716, 4.705052)),
  ('005644', 'Bochica II', 'Engativá', 'urbano', point(-74.109431, 4.714825)),
  ('005647', 'Villas de Granada', 'Engativá', 'urbano', point(-74.12608, 4.715198)),
  ('005648', 'Villa Amalia', 'Engativá', 'urbano', point(-74.122339, 4.708878)),
  ('005649', 'Villas de Granada I', 'Engativá', 'urbano', point(-74.121418, 4.717807)),
  ('005650', 'Ciudadela Colsubsidio', 'Engativá', 'urbano', point(-74.113297, 4.726342)),
  ('005652', 'El Muelle', 'Engativá', 'urbano', point(-74.126714, 4.699489)),
  ('005654', 'Gran Granada', 'Engativá', 'urbano', point(-74.1251, 4.719876)),
  ('005655', 'Garcés Navas Sur', 'Engativá', 'urbano', point(-74.123481, 4.713732)),
  ('005657', 'Sabana del Dorado', 'Engativá', 'urbano', point(-74.142553, 4.710964)),
  ('005658', 'Villa Sagrario', 'Engativá', 'urbano', point(-74.121446, 4.704585)),
  ('005660', 'San Antonio Urbano', 'Engativá', 'urbano', point(-74.131684, 4.702516)),
  ('005661', 'Luis Carlos Galán', 'Engativá', 'urbano', point(-74.097382, 4.715981)),
  ('005662', 'El Cedro (2)', 'Engativá', 'urbano', point(-74.148698, 4.717445)),
  ('005663', 'El Dorado Industrial', 'Engativá', 'urbano', point(-74.127539, 4.722936)),
  ('005664', 'El Dorado', 'Engativá', 'urbano', point(-74.122027, 4.735404)),
  ('005665', 'Marandu', 'Engativá', 'urbano', point(-74.133138, 4.706562)),
  ('005666', 'La Faena', 'Engativá', 'urbano', point(-74.135377, 4.716798)),
  ('005667', 'Centro Engativá II', 'Engativá', 'urbano', point(-74.135875, 4.711817)),
  ('005668', 'Villas de Alcalá', 'Engativá', 'urbano', point(-74.130344, 4.717229)),
  ('005669', 'El Gaco', 'Engativá', 'urbano', point(-74.140215, 4.723583)),
  ('005670', 'La Riviera', 'Engativá', 'urbano', point(-74.131791, 4.712652)),
  ('005672', 'Las Navetas', 'Fontibón', 'urbano', point(-74.1588, 4.706371)),
  ('005673', 'Pueblo Viejo', 'Fontibón', 'urbano', point(-74.154083, 4.709145)),
  ('005675', 'Bolivia (2)', 'Engativá', 'urbano', point(-74.127044, 4.707365)),
  ('005679', 'San Antonio Engativá', 'Engativá', 'urbano', point(-74.127578, 4.702887)),
  ('005680', 'Villa del Mar', 'Engativá', 'urbano', point(-74.122503, 4.700509)),
  ('005682', 'Ciudad Bachue II', 'Engativá', 'urbano', point(-74.102068, 4.716621)),
  ('005683', 'Quirigua I', 'Engativá', 'urbano', point(-74.100686, 4.711938)),
  ('005684', 'Quirigua II', 'Engativá', 'urbano', point(-74.105872, 4.70878)),
  ('006101', 'Florida', 'Los Mártires', 'urbano', point(-74.07978, 4.62406)),
  ('006103', 'Santa Fe', 'Los Mártires', 'urbano', point(-74.077311, 4.615873)),
  ('006104', 'La Favorita', 'Los Mártires', 'urbano', point(-74.07861, 4.609954)),
  ('006105', 'San Victorino', 'Los Mártires', 'urbano', point(-74.080692, 4.606259)),
  ('006106', 'El Liston', 'Los Mártires', 'urbano', point(-74.08308, 4.610967)),
  ('006107', 'Paloquemao', 'Los Mártires', 'urbano', point(-74.086957, 4.615165)),
  ('006108', 'Samper Mendoza', 'Los Mártires', 'urbano', point(-74.081694, 4.619218)),
  ('006109', 'Colseguros', 'Los Mártires', 'urbano', point(-74.085147, 4.620946)),
  ('006110', 'Usatama', 'Los Mártires', 'urbano', point(-74.08312, 4.621869)),
  ('006201', 'El Recuerdo', 'Teusaquillo', 'urbano', point(-74.087123, 4.63141)),
  ('006202', 'Gran América', 'Teusaquillo', 'urbano', point(-74.084067, 4.627269)),
  ('006203', 'La Florida Occidental', 'Puente Aranda', 'urbano', point(-74.087134, 4.62345)),
  ('006204', 'Estación Central', 'Puente Aranda', 'urbano', point(-74.091941, 4.618719)),
  ('006205', 'Industrial Centenario', 'Puente Aranda', 'urbano', point(-74.095999, 4.624361)),
  ('006206', 'El Ejido', 'Puente Aranda', 'urbano', point(-74.101797, 4.624881)),
  ('006207', 'Batallón Caldas', 'Puente Aranda', 'urbano', point(-74.103061, 4.629938)),
  ('006208', 'Ortezal', 'Puente Aranda', 'urbano', point(-74.0969, 4.630525)),
  ('006209', 'Quinta Paredes', 'Teusaquillo', 'urbano', point(-74.093797, 4.634986)),
  ('006210', 'Centro Nariño', 'Teusaquillo', 'urbano', point(-74.089572, 4.628787)),
  ('006211', 'Cundinamarca', 'Puente Aranda', 'urbano', point(-74.090352, 4.622139)),
  ('006212', 'Salazar Gómez', 'Puente Aranda', 'urbano', point(-74.116064, 4.631407)),
  ('006215', 'Puente Aranda', 'Puente Aranda', 'urbano', point(-74.106576, 4.632982)),
  ('006216', 'Ciudad Salitre Nor-oriental', 'Teusaquillo', 'urbano', point(-74.100409, 4.645268)),
  ('006217', 'Ciudad Salitre Sur-oriental', 'Teusaquillo', 'urbano', point(-74.104008, 4.642393)),
  ('006218', 'Centro Industrial', 'Puente Aranda', 'urbano', point(-74.110954, 4.638602)),
  ('006301', 'Santa Cecilia', 'Fontibón', 'urbano', point(-74.119583, 4.67315)),
  ('006302', 'Capellanía', 'Fontibón', 'urbano', point(-74.120776, 4.661072)),
  ('006303', 'La Esperanza Norte', 'Fontibón', 'urbano', point(-74.111191, 4.660035)),
  ('006306', 'Granjas de Techo', 'Fontibón', 'urbano', point(-74.116959, 4.642227)),
  ('006307', 'Montevideo', 'Fontibón', 'urbano', point(-74.118244, 4.645713)),
  ('006308', 'Franco', 'Fontibón', 'urbano', point(-74.121236, 4.650418)),
  ('006311', 'Modelia', 'Fontibón', 'urbano', point(-74.115566, 4.666198)),
  ('006312', 'Modelia Occidental', 'Fontibón', 'urbano', point(-74.1253, 4.66651)),
  ('006313', 'Salitre Occidental', 'Fontibón', 'urbano', point(-74.108847, 4.651632)),
  ('006315', 'La Esperanza Sur', 'Fontibón', 'urbano', point(-74.117042, 4.657666)),
  ('006316', 'Bosque de Modelia', 'Fontibón', 'urbano', point(-74.123319, 4.672334)),
  ('006319', 'Terminal de Transportes', 'Fontibón', 'urbano', point(-74.114535, 4.653943)),
  ('006320', 'Ciudad Hayuelos', 'Fontibón', 'urbano', point(-74.128623, 4.657669)),
  ('006401', 'Versalles Fontibón', 'Fontibón', 'urbano', point(-74.145193, 4.685452)),
  ('006402', 'La Cabaña Fontibón', 'Fontibón', 'urbano', point(-74.138831, 4.682031)),
  ('006403', 'San José de Fontibón', 'Fontibón', 'urbano', point(-74.131783, 4.683684)),
  ('006404', 'Puerta de Teja', 'Fontibón', 'urbano', point(-74.127224, 4.678983)),
  ('006405', 'Ferrocaja Fontibón', 'Fontibón', 'urbano', point(-74.131465, 4.672666)),
  ('006406', 'Villemar', 'Fontibón', 'urbano', point(-74.140075, 4.670605)),
  ('006407', 'Guadual Fontibón', 'Fontibón', 'urbano', point(-74.144246, 4.667507)),
  ('006408', 'El Carmen Fontibón', 'Fontibón', 'urbano', point(-74.150642, 4.675586)),
  ('006409', 'Belén Fontibón', 'Fontibón', 'urbano', point(-74.147867, 4.681998)),
  ('006410', 'Centro Fontibón', 'Fontibón', 'urbano', point(-74.144201, 4.675622)),
  ('006411', 'Charco Urbano', 'Fontibón', 'urbano', point(-74.168928, 4.697198)),
  ('006413', 'San Pablo Jericó', 'Fontibón', 'urbano', point(-74.157218, 4.688605)),
  ('006414', 'Brisas Aldea Fontibón', 'Fontibón', 'urbano', point(-74.156923, 4.694867)),
  ('006415', 'La Laguna Fontibón', 'Fontibón', 'urbano', point(-74.14944, 4.670646)),
  ('006416', 'Atahualpa', 'Fontibón', 'urbano', point(-74.146103, 4.688691)),
  ('006417', 'Villa Carmenza', 'Fontibón', 'urbano', point(-74.15103, 4.681225)),
  ('006418', 'Puente Grande', 'Fontibón', 'urbano', point(-74.165042, 4.694185)),
  ('006419', 'El Refugio', 'Fontibón', 'urbano', point(-74.149325, 4.691069)),
  ('006420', 'La Giralda', 'Fontibón', 'urbano', point(-74.141259, 4.678867)),
  ('006423', 'El Tintal Central', 'Fontibón', 'urbano', point(-74.136572, 4.665814)),
  ('006501', 'Cooperativa de Sub-oficiales', 'Kennedy', 'urbano', point(-74.132765, 4.638338)),
  ('006502', 'Marsella', 'Kennedy', 'urbano', point(-74.129205, 4.633843)),
  ('006503', 'Visión de Oriente', 'Kennedy', 'urbano', point(-74.134602, 4.651002)),
  ('006504', 'Bavaria', 'Kennedy', 'urbano', point(-74.13879, 4.638782)),
  ('006505', 'Pío XII', 'Kennedy', 'urbano', point(-74.149533, 4.635188)),
  ('006506', 'Castilla', 'Kennedy', 'urbano', point(-74.143655, 4.63948)),
  ('006507', 'Nuevo Techo', 'Kennedy', 'urbano', point(-74.136273, 4.646827)),
  ('006508', 'Las Dos Avenidas', 'Kennedy', 'urbano', point(-74.142243, 4.633254)),
  ('006509', 'Lusitania', 'Kennedy', 'urbano', point(-74.122657, 4.634471)),
  ('006510', 'Villa Alsacia II', 'Kennedy', 'urbano', point(-74.13557, 4.64332)),
  ('006511', 'La Pampa', 'Kennedy', 'urbano', point(-74.138807, 4.652063)),
  ('006512', 'Villa Alsacia', 'Kennedy', 'urbano', point(-74.127082, 4.643791)),
  ('006514', 'Vergel Occidental', 'Kennedy', 'urbano', point(-74.142148, 4.652167)),
  ('006515', 'Valladolid', 'Kennedy', 'urbano', point(-74.146866, 4.645439)),
  ('006516', 'Tintala', 'Kennedy', 'urbano', point(-74.155592, 4.648515)),
  ('006517', 'María Paz', 'Kennedy', 'urbano', point(-74.157889, 4.636212)),
  ('006518', 'Osorio III', 'Kennedy', 'urbano', point(-74.166197, 4.648599)),
  ('006519', 'Moravia', 'Fontibón', 'urbano', point(-74.155326, 4.67829)),
  ('006520', 'Zona Franca', 'Fontibón', 'urbano', point(-74.159089, 4.67304)),
  ('006521', 'Sabana Grande', 'Fontibón', 'urbano', point(-74.152195, 4.667388)),
  ('006522', 'El Tintal II', 'Fontibón', 'urbano', point(-74.144096, 4.663101)),
  ('006523', 'San Pedro de los Robles', 'Fontibón', 'urbano', point(-74.147282, 4.666994)),
  ('006524', 'La Magdalena', 'Kennedy', 'urbano', point(-74.142959, 4.660638)),
  ('006525', 'El Chanco I', 'Fontibón', 'urbano', point(-74.163938, 4.682362)),
  ('006527', 'Interindustrial', 'Fontibón', 'urbano', point(-74.130829, 4.651324)),
  ('006528', 'El Vergel', 'Fontibón', 'urbano', point(-74.135506, 4.656164)),
  ('006529', 'El Vergel Oriental', 'Kennedy', 'urbano', point(-74.143798, 4.648524)),
  ('006531', 'Ciudad Techo II', 'Kennedy', 'urbano', point(-74.151205, 4.640289)),
  ('006532', 'Kasandra', 'Fontibón', 'urbano', point(-74.169663, 4.693192)),
  ('006533', 'El Tintal III', 'Kennedy', 'urbano', point(-74.150887, 4.65461)),
  ('006534', 'El Tintal IV', 'Kennedy', 'urbano', point(-74.142995, 4.656049)),
  ('006535', 'El Chanco III', 'Fontibón', 'urbano', point(-74.170054, 4.676591)),
  ('007101', 'La Soledad', 'Teusaquillo', 'urbano', point(-74.07574, 4.629565)),
  ('007102', 'Santa Teresita', 'Teusaquillo', 'urbano', point(-74.070702, 4.631748)),
  ('007103', 'La Magdalena', 'Teusaquillo', 'urbano', point(-74.07082, 4.628009)),
  ('007104', 'Teusaquillo', 'Teusaquillo', 'urbano', point(-74.07229, 4.623085)),
  ('007105', 'Armenia', 'Teusaquillo', 'urbano', point(-74.072739, 4.618718)),
  ('007106', 'Estrella', 'Teusaquillo', 'urbano', point(-74.076638, 4.62213)),
  ('007107', 'Las Américas', 'Teusaquillo', 'urbano', point(-74.078848, 4.627523)),
  ('007201', 'Campín', 'Teusaquillo', 'urbano', point(-74.076166, 4.648415)),
  ('007202', 'San Luis', 'Teusaquillo', 'urbano', point(-74.071351, 4.647004)),
  ('007203', 'Chapinero Occidental', 'Teusaquillo', 'urbano', point(-74.066861, 4.645666)),
  ('007204', 'Quesada', 'Teusaquillo', 'urbano', point(-74.068201, 4.63863)),
  ('007205', 'Palermo', 'Teusaquillo', 'urbano', point(-74.071917, 4.635021)),
  ('007206', 'Belalcázar', 'Teusaquillo', 'urbano', point(-74.077962, 4.638235)),
  ('007207', 'Galerías', 'Teusaquillo', 'urbano', point(-74.074934, 4.642595)),
  ('007208', 'Banco Central', 'Teusaquillo', 'urbano', point(-74.070402, 4.642477)),
  ('007209', 'Alfonso López', 'Teusaquillo', 'urbano', point(-74.073515, 4.638854)),
  ('007301', 'La Merced Norte', 'Barrios Unidos', 'urbano', point(-74.073639, 4.664937)),
  ('007302', 'Alcázares', 'Barrios Unidos', 'urbano', point(-74.070415, 4.662511)),
  ('007303', 'Colombia', 'Barrios Unidos', 'urbano', point(-74.066428, 4.65967)),
  ('007304', 'Concepción Norte', 'Barrios Unidos', 'urbano', point(-74.063489, 4.657466)),
  ('007305', 'La Esperanza', 'Barrios Unidos', 'urbano', point(-74.065513, 4.652829)),
  ('007306', 'Baquero', 'Barrios Unidos', 'urbano', point(-74.068837, 4.652222)),
  ('007307', 'Muequeta', 'Barrios Unidos', 'urbano', point(-74.07109, 4.653071)),
  ('007308', 'Quinta Mutis', 'Barrios Unidos', 'urbano', point(-74.07346, 4.653426)),
  ('007309', 'Benjamín Herrera', 'Barrios Unidos', 'urbano', point(-74.076362, 4.654159)),
  ('007310', 'La Paz', 'Barrios Unidos', 'urbano', point(-74.075039, 4.65945)),
  ('007311', 'Siete de Agosto', 'Barrios Unidos', 'urbano', point(-74.071146, 4.657466)),
  ('007312', 'Rafael Uribe', 'Barrios Unidos', 'urbano', point(-74.067712, 4.655518)),
  ('007401', 'Polo Club', 'Barrios Unidos', 'urbano', point(-74.062214, 4.672853)),
  ('007402', 'Juan XXIII', 'Barrios Unidos', 'urbano', point(-74.063613, 4.667298)),
  ('007403', 'San Felipe', 'Barrios Unidos', 'urbano', point(-74.063759, 4.663135)),
  ('007404', 'Alcázares Norte', 'Barrios Unidos', 'urbano', point(-74.06844, 4.665187)),
  ('007405', 'Once de Noviembre', 'Barrios Unidos', 'urbano', point(-74.07091, 4.66842)),
  ('007406', 'Santa Sofía', 'Barrios Unidos', 'urbano', point(-74.067518, 4.670873)),
  ('007407', 'La Aurora', 'Barrios Unidos', 'urbano', point(-74.067383, 4.666997)),
  ('008101', 'Sagrado Corazón', 'Santa Fe', 'urbano', point(-74.067687, 4.624715)),
  ('008102', 'Parque Nacional', 'Santa Fe', 'urbano', point(-74.062377, 4.622617)),
  ('008103', 'La Merced', 'Santa Fe', 'urbano', point(-74.065957, 4.620962)),
  ('008104', 'La Perseverancia', 'Santa Fe', 'urbano', point(-74.064423, 4.617612)),
  ('008105', 'La Macarena', 'Santa Fe', 'urbano', point(-74.065523, 4.614286)),
  ('008106', 'Bosque Izquierdo', 'Santa Fe', 'urbano', point(-74.06472, 4.609298)),
  ('008107', 'San Diego', 'Santa Fe', 'urbano', point(-74.069023, 4.612921)),
  ('008108', 'Samper', 'Santa Fe', 'urbano', point(-74.069454, 4.618931)),
  ('008109', 'San Martín', 'Santa Fe', 'urbano', point(-74.067392, 4.617025)),
  ('008110', 'El Paraíso', 'Chapinero', 'urbano', point(-74.058997, 4.627637)),
  ('008111', 'Cataluña', 'Chapinero', 'urbano', point(-74.063219, 4.62824)),
  ('008112', 'Sucre', 'Chapinero', 'urbano', point(-74.066423, 4.629625)),
  ('008114', 'Parque Nacional Urbano', 'La Candelaria', 'urbano', point(-74.063052, 4.600271)),
  ('008201', 'Quinta Camacho', 'Chapinero', 'urbano', point(-74.059566, 4.654742)),
  ('008202', 'Emaús', 'Chapinero', 'urbano', point(-74.055015, 4.652804)),
  ('008203', 'Las Acacias', 'Chapinero', 'urbano', point(-74.051491, 4.650631)),
  ('008204', 'Granada', 'Chapinero', 'urbano', point(-74.055744, 4.649349)),
  ('008205', 'María Cristina', 'Chapinero', 'urbano', point(-74.055467, 4.644959)),
  ('008206', 'La Salle', 'Chapinero', 'urbano', point(-74.058684, 4.644527)),
  ('008207', 'Bosque Calderón', 'Chapinero', 'urbano', point(-74.060646, 4.641249)),
  ('008208', 'Pardo Rubio', 'Chapinero', 'urbano', point(-74.061904, 4.635178)),
  ('008211', 'Juan XXIII', 'Chapinero', 'urbano', point(-74.05417, 4.647083)),
  ('008212', 'Marly', 'Chapinero', 'urbano', point(-74.065303, 4.635951)),
  ('008213', 'Chapinero Central', 'Chapinero', 'urbano', point(-74.063521, 4.644709)),
  ('008214', 'Chapinero Norte', 'Chapinero', 'urbano', point(-74.061623, 4.650651)),
  ('008215', 'Ingemar', 'Chapinero', 'urbano', point(-74.057825, 4.640337)),
  ('008220', 'Siberia Central', 'Chapinero', 'urbano', point(-74.057253, 4.633051)),
  ('008221', 'Siberia Urbano', 'Chapinero', 'urbano', point(-74.057723, 4.631227)),
  ('008301', 'Chicó Norte II Sector', 'Chapinero', 'urbano', point(-74.044157, 4.680526)),
  ('008302', 'Seminario', 'Chapinero', 'urbano', point(-74.038829, 4.675069)),
  ('008303', 'El Refugio', 'Chapinero', 'urbano', point(-74.043663, 4.66811)),
  ('008304', 'Los Rosales', 'Chapinero', 'urbano', point(-74.04808, 4.660289)),
  ('008305', 'Bellavista', 'Chapinero', 'urbano', point(-74.051303, 4.655284)),
  ('008306', 'Porciúncula', 'Chapinero', 'urbano', point(-74.057772, 4.659373)),
  ('008307', 'Chicó Norte', 'Chapinero', 'urbano', point(-74.048655, 4.676878)),
  ('008308', 'El Chicó', 'Chapinero', 'urbano', point(-74.051644, 4.673759)),
  ('008309', 'La Cabrera', 'Chapinero', 'urbano', point(-74.050123, 4.669168)),
  ('008310', 'El Retiro', 'Chapinero', 'urbano', point(-74.051745, 4.666685)),
  ('008311', 'El Nogal', 'Chapinero', 'urbano', point(-74.052424, 4.662553)),
  ('008312', 'Espartillal', 'Chapinero', 'urbano', point(-74.055791, 4.664148)),
  ('008313', 'Lago Gaitán', 'Chapinero', 'urbano', point(-74.058749, 4.666022)),
  ('008314', 'Antiguo Country', 'Chapinero', 'urbano', point(-74.057292, 4.671685)),
  ('008315', 'Chicó Norte III Sector', 'Chapinero', 'urbano', point(-74.053594, 4.683362)),
  ('008319', 'El Bagazal', 'Chapinero', 'urbano', point(-74.04705, 4.655744)),
  ('008320', 'El Refugio Zona II', 'Chapinero', 'urbano', point(-74.04272, 4.667137)),
  ('008321', 'Ingemar Oriental II', 'Chapinero', 'urbano', point(-74.050382, 4.647757)),
  ('008322', 'Siberia Urbano (2)', 'Chapinero', 'urbano', point(-74.05684, 4.631251)),
  ('008401', 'La Calleja', 'Usaquén', 'urbano', point(-74.048905, 4.710624)),
  ('008402', 'Country Club', 'Usaquén', 'urbano', point(-74.041787, 4.71219)),
  ('008403', 'La Carolina', 'Usaquén', 'urbano', point(-74.036839, 4.707229)),
  ('008404', 'Bella Suiza', 'Usaquén', 'urbano', point(-74.030704, 4.707321)),
  ('008405', 'Ginebra', 'Usaquén', 'urbano', point(-74.026756, 4.710346)),
  ('008406', 'San Gabriel Norte', 'Usaquén', 'urbano', point(-74.028395, 4.700781)),
  ('008407', 'Usaquén', 'Usaquén', 'urbano', point(-74.029359, 4.692955)),
  ('008408', 'Santa Ana', 'Usaquén', 'urbano', point(-74.030056, 4.686701)),
  ('008409', 'Escuela de Caballería I', 'Usaquén', 'urbano', point(-74.032976, 4.684785)),
  ('008410', 'Escuela de Infantería', 'Usaquén', 'urbano', point(-74.040115, 4.684169)),
  ('008411', 'Rincón del Chicó', 'Usaquén', 'urbano', point(-74.045292, 4.686917)),
  ('008412', 'Santa Bibiana', 'Usaquén', 'urbano', point(-74.051937, 4.689499)),
  ('008413', 'Santa Bárbara Oriental', 'Usaquén', 'urbano', point(-74.031527, 4.699277)),
  ('008414', 'Santa Ana Occidental', 'Usaquén', 'urbano', point(-74.036888, 4.689234)),
  ('008415', 'Santa Bárbara Central', 'Usaquén', 'urbano', point(-74.037916, 4.699766)),
  ('008416', 'Molinos Norte', 'Usaquén', 'urbano', point(-74.040631, 4.692561)),
  ('008417', 'Santa Bárbara Occidental', 'Usaquén', 'urbano', point(-74.048734, 4.70175)),
  ('008418', 'San Patricio', 'Usaquén', 'urbano', point(-74.049815, 4.69534)),
  ('008419', 'Escuela de Caballería II', 'Usaquén', 'urbano', point(-74.03737, 4.680794)),
  ('008420', 'Páramo Urbano I', 'Usaquén', 'urbano', point(-74.022692, 4.703803)),
  ('008424', 'Segundo Contador', 'Usaquén', 'urbano', point(-74.026678, 4.713122)),
  ('008425', 'Ginebra II', 'Usaquén', 'urbano', point(-74.025749, 4.705638)),
  ('008426', 'San Gabriel Norte II', 'Usaquén', 'urbano', point(-74.02702, 4.701014)),
  ('008501', 'El Toberín', 'Usaquén', 'urbano', point(-74.042074, 4.747136)),
  ('008502', 'La Pradera Norte', 'Usaquén', 'urbano', point(-74.034472, 4.743913)),
  ('008503', 'Santa Teresa', 'Usaquén', 'urbano', point(-74.026938, 4.744705)),
  ('008504', 'La Cita', 'Usaquén', 'urbano', point(-74.019318, 4.743214)),
  ('008505', 'San Cristóbal Norte', 'Usaquén', 'urbano', point(-74.027334, 4.739579)),
  ('008506', 'Barrancas Norte', 'Usaquén', 'urbano', point(-74.02802, 4.735004)),
  ('008507', 'Barrancas', 'Usaquén', 'urbano', point(-74.027962, 4.731037)),
  ('008508', 'Cedro Salazar', 'Usaquén', 'urbano', point(-74.028728, 4.726775)),
  ('008509', 'Los Cedros Oriental', 'Usaquén', 'urbano', point(-74.029258, 4.723299)),
  ('008510', 'Acacias Usaquén', 'Usaquén', 'urbano', point(-74.034418, 4.723647)),
  ('008511', 'Cedro Narváez', 'Usaquén', 'urbano', point(-74.034098, 4.721332)),
  ('008512', 'Cedritos', 'Usaquén', 'urbano', point(-74.035571, 4.719103)),
  ('008513', 'Lisboa', 'Usaquén', 'urbano', point(-74.035928, 4.715507)),
  ('008514', 'El Contador', 'Usaquén', 'urbano', point(-74.044204, 4.7205)),
  ('008515', 'Los Cedros', 'Usaquén', 'urbano', point(-74.046946, 4.724934)),
  ('008516', 'Las Orquídeas', 'Usaquén', 'urbano', point(-74.042398, 4.742427)),
  ('008517', 'La Liberia', 'Usaquén', 'urbano', point(-74.035108, 4.73569)),
  ('008518', 'Caobos Salazar', 'Usaquén', 'urbano', point(-74.036359, 4.72939)),
  ('008519', 'Estrella del Norte', 'Usaquén', 'urbano', point(-74.04319, 4.73856)),
  ('008520', 'Bosque de Pinos', 'Usaquén', 'urbano', point(-74.019274, 4.734069)),
  ('008521', 'Tibabita', 'Usaquén', 'urbano', point(-74.029268, 4.764832)),
  ('008522', 'El Rocío Norte', 'Usaquén', 'urbano', point(-74.028773, 4.759534)),
  ('008523', 'San Antonio Norte', 'Usaquén', 'urbano', point(-74.028141, 4.757482)),
  ('008524', 'La Granja Norte', 'Usaquén', 'urbano', point(-74.027171, 4.749767)),
  ('008525', 'La Uribe', 'Usaquén', 'urbano', point(-74.040587, 4.752189)),
  ('008526', 'El Vervenal', 'Usaquén', 'urbano', point(-74.041035, 4.76181)),
  ('008527', 'El Cerezo', 'Usaquén', 'urbano', point(-74.04201, 4.765254)),
  ('008528', 'San Antonio Noroccidental', 'Usaquén', 'urbano', point(-74.04142, 4.756643)),
  ('008529', 'San José de Usaquén', 'Usaquén', 'urbano', point(-74.0329, 4.754672)),
  ('008530', 'Las Margaritas', 'Usaquén', 'urbano', point(-74.044976, 4.733206)),
  ('008532', 'El Redil', 'Usaquén', 'urbano', point(-74.024517, 4.752645)),
  ('008533', 'Horizontes Norte', 'Usaquén', 'urbano', point(-74.024135, 4.759398)),
  ('008535', 'Buenavista', 'Usaquén', 'urbano', point(-74.026032, 4.766583)),
  ('008536', 'Bosque de Pinos I', 'Usaquén', 'urbano', point(-74.02529, 4.718195)),
  ('008537', 'Verbenal San Antonio', 'Usaquén', 'urbano', point(-74.034392, 4.763353)),
  ('008538', 'Bosque de Pinos III', 'Usaquén', 'urbano', point(-74.022931, 4.727209)),
  ('008539', 'Torca I', 'Usaquén', 'urbano', point(-74.035398, 4.801512)),
  ('008540', 'La Estrellita I', 'Usaquén', 'urbano', point(-74.023515, 4.765338)),
  ('008542', 'Tibabita I', 'Usaquén', 'urbano', point(-74.023156, 4.76841)),
  ('008543', 'Santa Cecilia Puente Norte', 'Usaquén', 'urbano', point(-74.015615, 4.734646)),
  ('008544', 'Canaima', 'Usaquén', 'urbano', point(-74.04082, 4.773228)),
  ('008545', 'Mirador del Norte', 'Usaquén', 'urbano', point(-74.020681, 4.764713)),
  ('008547', 'La Estrellita III', 'Usaquén', 'urbano', point(-74.022788, 4.75974)),
  ('008549', 'La Estrellita I (2)', 'Usaquén', 'urbano', point(-74.022448, 4.761864)),
  ('008551', 'Barrancas Oriental I', 'Usaquén', 'urbano', point(-74.016564, 4.74331)),
  ('009101', 'Granada Norte', 'Suba', 'urbano', point(-74.050345, 4.75038)),
  ('009102', 'Britalia', 'Suba', 'urbano', point(-74.054757, 4.748255)),
  ('009103', 'Cantagallo', 'Suba', 'urbano', point(-74.05347, 4.742213)),
  ('009104', 'Victoria Norte', 'Suba', 'urbano', point(-74.054828, 4.732159)),
  ('009105', 'Prado Pinzón', 'Suba', 'urbano', point(-74.054455, 4.727384)),
  ('009106', 'San José del Prado', 'Suba', 'urbano', point(-74.058624, 4.723604)),
  ('009107', 'Prado Veraniego', 'Suba', 'urbano', point(-74.055037, 4.717011)),
  ('009108', 'Ciudad Jardín Norte', 'Suba', 'urbano', point(-74.071209, 4.72229)),
  ('009109', 'Niza Sur', 'Suba', 'urbano', point(-74.07593, 4.706255)),
  ('009110', 'Mazuren', 'Suba', 'urbano', point(-74.055646, 4.736644)),
  ('009111', 'Mónaco', 'Suba', 'urbano', point(-74.061776, 4.701024)),
  ('009112', 'Niza Suba', 'Suba', 'urbano', point(-74.07829, 4.719698)),
  ('009113', 'San José de Bavaria', 'Suba', 'urbano', point(-74.060852, 4.763966)),
  ('009114', 'Gilmar', 'Suba', 'urbano', point(-74.064821, 4.744824)),
  ('009115', 'Iberia', 'Suba', 'urbano', point(-74.069905, 4.727549)),
  ('009116', 'Prado Veraniego Norte', 'Suba', 'urbano', point(-74.062724, 4.719623)),
  ('009117', 'Prado Veraniego Sur', 'Suba', 'urbano', point(-74.064426, 4.713024)),
  ('009118', 'Batán', 'Suba', 'urbano', point(-74.06367, 4.706765)),
  ('009119', 'Atenas', 'Suba', 'urbano', point(-74.068769, 4.730809)),
  ('009120', 'Nueva Zelandia', 'Suba', 'urbano', point(-74.0489, 4.758636)),
  ('009121', 'Club de los Lagartos', 'Suba', 'urbano', point(-74.086519, 4.707728)),
  ('009122', 'Las Villas', 'Suba', 'urbano', point(-74.071648, 4.715985)),
  ('009123', 'Niza Norte', 'Suba', 'urbano', point(-74.075347, 4.713799)),
  ('009124', 'Puente Largo', 'Suba', 'urbano', point(-74.066319, 4.697012)),
  ('009125', 'Pasadena', 'Suba', 'urbano', point(-74.06421, 4.692206)),
  ('009126', 'Estoril', 'Suba', 'urbano', point(-74.058645, 4.69199)),
  ('009127', 'Andes Norte', 'Suba', 'urbano', point(-74.06823, 4.691698)),
  ('009128', 'El Plan', 'Suba', 'urbano', point(-74.066707, 4.7396)),
  ('009129', 'Villa del Prado', 'Suba', 'urbano', point(-74.053241, 4.755561)),
  ('009130', 'Canódromo', 'Suba', 'urbano', point(-74.056329, 4.710867)),
  ('009131', 'Santa Helena', 'Suba', 'urbano', point(-74.062713, 4.73112)),
  ('009132', 'Escuela de Carabineros', 'Suba', 'urbano', point(-74.070686, 4.735361)),
  ('009133', 'Mirandela', 'Suba', 'urbano', point(-74.050566, 4.766805)),
  ('009134', 'San José V Sector', 'Suba', 'urbano', point(-74.063262, 4.75676)),
  ('009135', 'Portales del Norte', 'Suba', 'urbano', point(-74.063203, 4.750836)),
  ('009136', 'Casablanca Suba Urbano', 'Suba', 'urbano', point(-74.040213, 4.808196)),
  ('009138', 'Casablanca Suba Urbano I', 'Suba', 'urbano', point(-74.052725, 4.781842)),
  ('009139', 'Casablanca Suba Urbano II', 'Suba', 'urbano', point(-74.05911, 4.79333)),
  ('009140', 'Nuestra Señora del Rosario', 'Suba', 'urbano', point(-74.068025, 4.788529)),
  ('009141', 'La Candelaria', 'Suba', 'urbano', point(-74.075761, 4.804773)),
  ('009142', 'Conejera', 'Suba', 'urbano', point(-74.063373, 4.803421)),
  ('009144', 'El Otoño I', 'Suba', 'urbano', point(-74.046034, 4.776789)),
  ('009201', 'Los Naranjos', 'Suba', 'urbano', point(-74.086488, 4.726456)),
  ('009202', 'El Rincón', 'Suba', 'urbano', point(-74.091895, 4.723877)),
  ('009203', 'Puerta del Sol', 'Suba', 'urbano', point(-74.101376, 4.744527)),
  ('009204', 'El Rincón Norte', 'Suba', 'urbano', point(-74.090723, 4.728304)),
  ('009205', 'Aures', 'Suba', 'urbano', point(-74.095604, 4.733008)),
  ('009206', 'Aures II', 'Suba', 'urbano', point(-74.102265, 4.733997)),
  ('009207', 'Villa Elisa', 'Suba', 'urbano', point(-74.088471, 4.73486)),
  ('009208', 'Costa Azul', 'Suba', 'urbano', point(-74.097495, 4.738605)),
  ('009209', 'Villa María', 'Suba', 'urbano', point(-74.102386, 4.739021)),
  ('009210', 'Las Flores', 'Suba', 'urbano', point(-74.088566, 4.741696)),
  ('009211', 'El Poa', 'Suba', 'urbano', point(-74.094376, 4.744025)),
  ('009212', 'Suba Urbano', 'Suba', 'urbano', point(-74.081995, 4.741465)),
  ('009213', 'El Pino', 'Suba', 'urbano', point(-74.091091, 4.750094)),
  ('009214', 'Tuna Alta', 'Suba', 'urbano', point(-74.078228, 4.753949)),
  ('009215', 'Casablanca Suba', 'Suba', 'urbano', point(-74.069118, 4.752491)),
  ('009216', 'La Gaitana', 'Suba', 'urbano', point(-74.109101, 4.742199)),
  ('009217', 'Rincón de Santa Inés', 'Suba', 'urbano', point(-74.10256, 4.757544)),
  ('009218', 'Almirante Colón', 'Suba', 'urbano', point(-74.086604, 4.715664)),
  ('009219', 'Campanella', 'Suba', 'urbano', point(-74.085307, 4.750742)),
  ('009220', 'Lago de Suba', 'Suba', 'urbano', point(-74.098636, 4.731714)),
  ('009221', 'La Chucua', 'Suba', 'urbano', point(-74.092921, 4.736999)),
  ('009222', 'Altos de Chozica', 'Suba', 'urbano', point(-74.083754, 4.731936)),
  ('009223', 'Ttes de Colombia', 'Suba', 'urbano', point(-74.092762, 4.73075)),
  ('009224', 'Nueva Tibabuyes', 'Suba', 'urbano', point(-74.106113, 4.734223)),
  ('009225', 'Tibabuyes Universal', 'Suba', 'urbano', point(-74.111234, 4.745985)),
  ('009226', 'Salitre Suba', 'Suba', 'urbano', point(-74.082826, 4.755545)),
  ('009227', 'Lech Walesa', 'Suba', 'urbano', point(-74.101307, 4.727993)),
  ('009228', 'Lombardia', 'Suba', 'urbano', point(-74.101969, 4.747801)),
  ('009229', 'Toscana', 'Suba', 'urbano', point(-74.113794, 4.743565)),
  ('009230', 'San Cayetano', 'Suba', 'urbano', point(-74.096832, 4.726259)),
  ('009231', 'Suba Cerros', 'Suba', 'urbano', point(-74.076713, 4.743258)),
  ('009232', 'Sabana de Tibabuyes', 'Suba', 'urbano', point(-74.108768, 4.74901)),
  ('009233', 'Tibabuyes', 'Suba', 'urbano', point(-74.099865, 4.752438)),
  ('009234', 'Sabana de Tibabuyes Norte', 'Suba', 'urbano', point(-74.106993, 4.755784)),
  ('009235', 'Ciudad Hunza', 'Suba', 'urbano', point(-74.087426, 4.720913)),
  ('009236', 'La Carolina de Suba', 'Suba', 'urbano', point(-74.105392, 4.727943)),
  ('009237', 'Rincón de Suba', 'Suba', 'urbano', point(-74.095731, 4.722089)),
  ('009238', 'Santa Teresa de Suba', 'Suba', 'urbano', point(-74.098964, 4.720866)),
  ('009239', 'Las Mercedes Suba', 'Suba', 'urbano', point(-74.083027, 4.758419)),
  ('009240', 'Potrerillo', 'Suba', 'urbano', point(-74.095879, 4.736418)),
  ('009241', 'Bosques de San Jorge', 'Suba', 'urbano', point(-74.086694, 4.746788)),
  ('009242', 'Tuna Baja', 'Suba', 'urbano', point(-74.091997, 4.75645)),
  ('009243', 'Las Mercedes I', 'Suba', 'urbano', point(-74.092809, 4.758437)),
  ('009244', 'Villa Hermosa', 'Suba', 'urbano', point(-74.089753, 4.757222)),
  ('009245', 'Pinos de Lombardia', 'Suba', 'urbano', point(-74.095794, 4.753174)),
  ('009246', 'Delmonte', 'Suba', 'urbano', point(-74.07406, 4.758918)),
  ('009247', 'Iragua', 'Suba', 'urbano', point(-74.067559, 4.75985)),
  ('009248', 'Tibabuyes II', 'Suba', 'urbano', point(-74.115233, 4.756772)),
  ('009249', 'Vereda Suba Naranjos', 'Suba', 'urbano', point(-74.080546, 4.725526)),
  ('009250', 'Tibabuyes Occidental', 'Suba', 'urbano', point(-74.121288, 4.751911)),
  ('009251', 'San Carlos de Suba', 'Suba', 'urbano', point(-74.113225, 4.749695)),
  ('009252', 'Bilbao', 'Suba', 'urbano', point(-74.116636, 4.750216)),
  ('009253', 'San Pedro', 'Suba', 'urbano', point(-74.119948, 4.745997)),
  ('009254', 'Lisboa', 'Suba', 'urbano', point(-74.121301, 4.743025)),
  ('009255', 'Santa Rita de Suba', 'Suba', 'urbano', point(-74.126597, 4.745491)),
  ('009256', 'Santa Cecilia', 'Suba', 'urbano', point(-74.127867, 4.740919)),
  ('009257', 'Tibabuyes (2)', 'Suba', 'urbano', point(-74.110128, 4.7366)),
  ('009258', 'Casa Blanca Suba I', 'Suba', 'urbano', point(-74.074996, 4.738275)),
  ('009259', 'Berlin', 'Suba', 'urbano', point(-74.117146, 4.747134)),
  ('009260', 'Altos de Suba', 'Suba', 'urbano', point(-74.075746, 4.73342)),
  ('009261', 'Tuna', 'Suba', 'urbano', point(-74.106145, 4.760781)),
  ('009262', 'La Gaitana Oriental', 'Suba', 'urbano', point(-74.105984, 4.741048)),
  ('009263', 'Villa Alcázar', 'Suba', 'urbano', point(-74.085622, 4.723123)),
  ('009265', 'Vereda Suba Cerros II', 'Suba', 'urbano', point(-74.07208, 4.755463)),
  ('009266', 'Rincón Altamar', 'Suba', 'urbano', point(-74.092472, 4.71979)),
  ('009267', 'Villa María I', 'Suba', 'urbano', point(-74.101608, 4.741585)),
  ('009268', 'Santa Cecilia de Suba I', 'Suba', 'urbano', point(-74.124141, 4.74022)),
  ('101101', 'El Bagazal (2)', 'Chapinero', 'rural', point(-74.037167, 4.654296)),
  ('101103', 'Ingemar Oriental Rural', 'Chapinero', 'rural', point(-74.0419, 4.6354)),
  ('101110', 'Páramo I Rural', 'Chapinero', 'rural', point(-74.03822, 4.670312)),
  ('101201', 'Hoya Teusaca', 'Santa Fe', 'rural', point(-74.016421, 4.60136)),
  ('101301', 'Hoya San Cristóbal', 'San Cristóbal', 'rural', point(-74.047336, 4.557738)),
  ('101302', 'Molino Rural', 'San Cristóbal', 'rural', point(-74.069804, 4.569016)),
  ('101306', 'Tibaque', 'San Cristóbal', 'rural', point(-74.064414, 4.526766)),
  ('101307', 'Tihuaque Rural', 'Usme', 'rural', point(-74.080126, 4.501771)),
  ('101308', 'Chiguaza Rural', 'Usme', 'rural', point(-74.083028, 4.525165)),
  ('101309', 'La Arboleda Rural', 'San Cristóbal', 'rural', point(-74.077691, 4.532916)),
  ('101405', 'Parque Nacional Oriental', 'Santa Fe', 'rural', point(-74.049748, 4.594855)),
  ('101407', 'Ciudad Londres I Rural', 'San Cristóbal', 'rural', point(-74.083448, 4.518412)),
  ('101408', 'San Rafael Usme Rural I', 'San Cristóbal', 'rural', point(-74.081121, 4.527755)),
  ('101502', 'Siberia', 'Chapinero', 'rural', point(-74.048179, 4.625024)),
  ('102110', 'El Porvenir de los Soches', 'Usme', 'rural', point(-74.091076, 4.486564)),
  ('102111', 'Los Arrayanes', 'Usme', 'rural', point(-74.148731, 4.34474)),
  ('102112', 'El Hato', 'Usme', 'rural', point(-74.169114, 4.377535)),
  ('102113', 'Las Margaritas', 'Usme', 'rural', point(-74.197562, 4.37822)),
  ('102114', 'Los Andes', 'Usme', 'rural', point(-74.168569, 4.345005)),
  ('102115', 'La Unión', 'Usme', 'rural', point(-74.177255, 4.311808)),
  ('102116', 'Chisaca', 'Usme', 'rural', point(-74.205029, 4.320068)),
  ('102118', 'Las Violetas Rural', 'Usme', 'rural', point(-74.076094, 4.490925)),
  ('102122', 'La Requilina Rural', 'Usme', 'rural', point(-74.115602, 4.470268)),
  ('102211', 'Liliana', 'Usme', 'rural', point(-74.091144, 4.508157)),
  ('102309', 'El Bosque Sur Oriental', 'Usme', 'rural', point(-74.078946, 4.476405)),
  ('102310', 'El Bosque Sur Oriental Rural I', 'Usme', 'rural', point(-74.085858, 4.474889)),
  ('102312', 'Ciudad Londres Rural', 'Usme', 'rural', point(-74.084357, 4.51708)),
  ('102401', 'Los Arrayanes (2)', 'Usme', 'rural', point(-74.085879, 4.495217)),
  ('102405', 'Pepinitos', 'Usme', 'rural', point(-74.09439, 4.498055)),
  ('102406', 'El Bosque Central', 'Usme', 'rural', point(-74.096935, 4.504636)),
  ('102407', 'Tibaque Sur', 'Usme', 'rural', point(-74.0903, 4.504123)),
  ('102412', 'Tocaimita Sur', 'Usme', 'rural', point(-74.091064, 4.496112)),
  ('102502', 'El Uval Rural', 'Usme', 'rural', point(-74.098571, 4.470291)),
  ('102506', 'Portal Rural II', 'Usme', 'rural', point(-74.096403, 4.494299)),
  ('102601', 'Centro Usme Rural', 'Usme', 'rural', point(-74.130595, 4.468366)),
  ('102603', 'Centro Usme Rural II', 'Usme', 'rural', point(-74.123669, 4.46734)),
  ('102604', 'La Requilina Rural II', 'Usme', 'rural', point(-74.122431, 4.47983)),
  ('102707', 'Olarte', 'Usme', 'rural', point(-74.123976, 4.444674)),
  ('102808', 'La Regadera', 'Usme', 'rural', point(-74.12253, 4.394056)),
  ('102909', 'San Benito', 'Usme', 'rural', point(-74.116022, 4.361309)),
  ('102910', 'Arrayan', 'Usme', 'rural', point(-74.127695, 4.330838)),
  ('102911', 'Curubital', 'Usme', 'rural', point(-74.139898, 4.342127)),
  ('102913', 'La Requilina Rural III', 'Usme', 'rural', point(-74.11966, 4.478348)),
  ('102914', 'Yomasa Norte Rural', 'Usme', 'rural', point(-74.121731, 4.500915)),
  ('103101', 'Santa Rosa Alta', 'Sumapaz', 'rural', point(-74.196939, 4.239193)),
  ('103102', 'Taquecitos', 'Sumapaz', 'rural', point(-74.218522, 4.177111)),
  ('103103', 'Santa Rosa Baja', 'Sumapaz', 'rural', point(-74.195942, 4.197771)),
  ('103104', 'Las Animas', 'Sumapaz', 'rural', point(-74.18392, 4.147987)),
  ('103105', 'Las Auras', 'Sumapaz', 'rural', point(-74.173036, 4.172127)),
  ('103106', 'Nazareth', 'Sumapaz', 'rural', point(-74.159468, 4.166937)),
  ('103107', 'Las Palmas', 'Sumapaz', 'rural', point(-74.161038, 4.144745)),
  ('103108', 'Los Rios', 'Sumapaz', 'rural', point(-74.148196, 4.090123)),
  ('103109', 'Las Sopas', 'Sumapaz', 'rural', point(-74.208883, 4.08355)),
  ('103201', 'Betania', 'Sumapaz', 'rural', point(-74.152568, 4.211387)),
  ('103202', 'El Itsmo', 'Sumapaz', 'rural', point(-74.17556, 4.211499)),
  ('103203', 'El Tabaco', 'Sumapaz', 'rural', point(-74.158146, 4.26417)),
  ('103204', 'Laguna Verde', 'Sumapaz', 'rural', point(-74.161077, 4.185967)),
  ('103205', 'Raizal', 'Sumapaz', 'rural', point(-74.142486, 4.187722)),
  ('103206', 'Peñalisa', 'Sumapaz', 'rural', point(-74.130501, 4.184563)),
  ('104102', 'Pasquillita', 'Ciudad Bolívar', 'rural', point(-74.156196, 4.422222)),
  ('104104', 'Pasquilla', 'Ciudad Bolívar', 'rural', point(-74.169252, 4.445263)),
  ('104107', 'Bella Flor Sur (2)', 'Ciudad Bolívar', 'rural', point(-74.164344, 4.541396)),
  ('104108', 'Las Mercedes', 'Ciudad Bolívar', 'rural', point(-74.188628, 4.405891)),
  ('104110', 'Quiba Bajo', 'Ciudad Bolívar', 'rural', point(-74.171976, 4.525777)),
  ('104112', 'Santa Rosa', 'Ciudad Bolívar', 'rural', point(-74.16274, 4.39933)),
  ('104113', 'Santa Bárbara', 'Ciudad Bolívar', 'rural', point(-74.150127, 4.401529)),
  ('104114', 'Quiba Alto', 'Ciudad Bolívar', 'rural', point(-74.170082, 4.496169)),
  ('104118', 'Ciudad Bolívar Rural III', 'Ciudad Bolívar', 'rural', point(-74.161995, 4.556911)),
  ('104119', 'Ciudad Bolívar Rural I', 'Ciudad Bolívar', 'rural', point(-74.172537, 4.546882)),
  ('104128', 'El Mochuelo III', 'Ciudad Bolívar', 'rural', point(-74.1507, 4.515977)),
  ('104129', 'El Mochuelo II', 'Ciudad Bolívar', 'rural', point(-74.139066, 4.519095)),
  ('104130', 'Brazuelos Occidental Rural', 'Ciudad Bolívar', 'rural', point(-74.124462, 4.494939)),
  ('104131', 'Mochuelo Alto Rural', 'Ciudad Bolívar', 'rural', point(-74.147937, 4.481024)),
  ('104132', 'El Mochuelo Oriental Rural', 'Usme', 'rural', point(-74.126087, 4.522674)),
  ('104133', 'El Mochuelo III Rural', 'Ciudad Bolívar', 'rural', point(-74.135198, 4.511566)),
  ('104134', 'Bella Flor Sur Rural', 'Ciudad Bolívar', 'rural', point(-74.158332, 4.542257)),
  ('104136', 'El Mochuelo II Rural', 'Ciudad Bolívar', 'rural', point(-74.129907, 4.522655)),
  ('104137', 'El Mochuelo VI', 'Ciudad Bolívar', 'rural', point(-74.154543, 4.531014)),
  ('104305', 'Bella Flor Rural', 'Ciudad Bolívar', 'rural', point(-74.158893, 4.544482)),
  ('104306', 'El Mochuelo Alto Rural', 'Ciudad Bolívar', 'rural', point(-74.135369, 4.499489)),
  ('104405', 'Tunjuelito Rural', 'Usme', 'rural', point(-74.124244, 4.510526)),
  ('105103', 'San Pedro', 'Fontibón', 'rural', point(-74.158117, 4.664939)),
  ('105104', 'El Tintal', 'Fontibón', 'rural', point(-74.164418, 4.669869)),
  ('105105', 'Vereda el Tintal Rural', 'Kennedy', 'rural', point(-74.145813, 4.65801)),
  ('105106', 'La Magdalena Rural', 'Kennedy', 'rural', point(-74.15428, 4.66084)),
  ('105203', 'Osorio II', 'Kennedy', 'rural', point(-74.165413, 4.655538)),
  ('105210', 'Osorio X', 'Bosa', 'rural', point(-74.18606, 4.645612)),
  ('105211', 'Osorio XII Rural', 'Kennedy', 'rural', point(-74.182953, 4.647464)),
  ('105223', 'Osorio XXIII', 'Bosa', 'rural', point(-74.190304, 4.650131)),
  ('105318', 'San Bernardino XVIII', 'Bosa', 'rural', point(-74.209906, 4.619393)),
  ('105324', 'San Bernardino IX', 'Bosa', 'rural', point(-74.206837, 4.618705)),
  ('105325', 'San Bernardino XXV', 'Bosa', 'rural', point(-74.215059, 4.638763)),
  ('105326', 'San Bernardino X', 'Bosa', 'rural', point(-74.208491, 4.615982)),
  ('105342', 'Sabana Grande Rural', 'Fontibón', 'rural', point(-74.153001, 4.664195)),
  ('105401', 'El Chanco Rural II', 'Fontibón', 'rural', point(-74.170502, 4.691374)),
  ('105402', 'Charco Rural', 'Fontibón', 'rural', point(-74.167828, 4.701749)),
  ('105403', 'El Chanco Rural III', 'Fontibón', 'rural', point(-74.173888, 4.677938)),
  ('106201', 'El Pantano', 'Engativá', 'rural', point(-74.157412, 4.721561)),
  ('106301', 'Engativá el Dorado', 'Engativá', 'rural', point(-74.131597, 4.726793)),
  ('106303', 'El Dorado Rural', 'Engativá', 'rural', point(-74.126366, 4.73218)),
  ('107101', 'Guaymaral', 'Suba', 'rural', point(-74.07138, 4.819484)),
  ('107102', 'Casablanca Suba (2)', 'Suba', 'rural', point(-74.051905, 4.797497)),
  ('107106', 'Tuna Rural', 'Suba', 'rural', point(-74.102334, 4.776875)),
  ('107107', 'Las Mercedes Suba Rural', 'Suba', 'rural', point(-74.085674, 4.764554)),
  ('107109', 'Barajas Norte', 'Suba', 'rural', point(-74.0773, 4.779958)),
  ('107110', 'Casablanca Suba I', 'Suba', 'rural', point(-74.056259, 4.77938)),
  ('107111', 'Casablanca Suba II', 'Suba', 'rural', point(-74.054507, 4.825584)),
  ('107112', 'La Lomita', 'Suba', 'rural', point(-74.072268, 4.797772)),
  ('107113', 'Santa Cecilia de Suba I Rural', 'Suba', 'rural', point(-74.127526, 4.738932)),
  ('107114', 'San Pedro Rural', 'Suba', 'rural', point(-74.122258, 4.747164)),
  ('107904', 'Bilbao Rural', 'Suba', 'rural', point(-74.121948, 4.749911)),
  ('107906', 'Tibabuyes II Rural', 'Suba', 'rural', point(-74.12053, 4.758299)),
  ('108101', 'Torca Rural I', 'Usaquén', 'rural', point(-74.017865, 4.815451)),
  ('108102', 'Tibabita Rural', 'Usaquén', 'rural', point(-74.033222, 4.778016)),
  ('108103', 'Barrancas Oriental Rural', 'Usaquén', 'rural', point(-74.010331, 4.732836)),
  ('108104', 'Páramo', 'Usaquén', 'rural', point(-74.01693, 4.687648)),
  ('108108', 'Páramo II', 'Chapinero', 'rural', point(-74.020233, 4.661073)),
  ('108109', 'Páramo I', 'Chapinero', 'rural', point(-74.032497, 4.668231)),
  ('108110', 'Torca Rural II', 'Usaquén', 'rural', point(-74.020166, 4.798787)),
  ('108111', 'Tibabita Rural I', 'Usaquén', 'rural', point(-74.015959, 4.75799)),
  ('108112', 'Páramo II Rural', 'Usaquén', 'rural', point(-74.023716, 4.697041)),
  ('108113', 'Bosque de Pinos III Rural', 'Usaquén', 'rural', point(-74.02053, 4.730642)),
  ('108114', 'Páramo III Rural', 'Usaquén', 'rural', point(-74.029214, 4.680108)),
  ('108115', 'Tibabita II', 'Usaquén', 'rural', point(-74.021448, 4.776177)),
  ('109101', 'El Toldo', 'Sumapaz', 'rural', point(-74.296845, 4.061871)),
  ('109102', 'San Antonio', 'Sumapaz', 'rural', point(-74.304144, 4.095611)),
  ('109103', 'Las Vegas', 'Sumapaz', 'rural', point(-74.26082, 4.015872)),
  ('109104', 'San Juan', 'Sumapaz', 'rural', point(-74.315937, 4.026197)),
  ('109105', 'Santo Domingo', 'Sumapaz', 'rural', point(-74.345253, 4.007551)),
  ('109106', 'La Unión', 'Sumapaz', 'rural', point(-74.366511, 3.995492)),
  ('109107', 'Chorreras', 'Sumapaz', 'rural', point(-74.283142, 3.99021)),
  ('109109', 'Tunal Alto', 'Sumapaz', 'rural', point(-74.307252, 3.925264)),
  ('109110', 'Concepción', 'Sumapaz', 'rural', point(-74.341899, 3.919775)),
  ('109111', 'San José', 'Sumapaz', 'rural', point(-74.373222, 3.80972)),
  ('109112', 'Capitolio', 'Sumapaz', 'rural', point(-74.344914, 4.035559)),
  ('109113', 'Lagunitas', 'Sumapaz', 'rural', point(-74.29784, 3.965664)),
  ('109114', 'Tunal Bajo', 'Sumapaz', 'rural', point(-74.351535, 3.973746)),
  ('109116', 'Nueva Granada', 'Sumapaz', 'rural', point(-74.347558, 3.882041)),
  ('201105', 'El Refugio I', 'Chapinero', 'mixto', point(-74.041524, 4.668304)),
  ('201108', 'El Refugio II', 'Chapinero', 'mixto', point(-74.044116, 4.664323)),
  ('201109', 'Ingemar I', 'Chapinero', 'mixto', point(-74.054826, 4.63908)),
  ('201110', 'Ingemar Oriental I', 'Chapinero', 'mixto', point(-74.052447, 4.641881)),
  ('201302', 'El Triángulo', 'San Cristóbal', 'mixto', point(-74.076145, 4.564061)),
  ('201304', 'Aguas Claras', 'San Cristóbal', 'mixto', point(-74.069101, 4.557023)),
  ('201306', 'Tibaque I', 'San Cristóbal', 'mixto', point(-74.074871, 4.559371)),
  ('201309', 'Tibaque II', 'Usme', 'mixto', point(-74.084497, 4.509281)),
  ('201317', 'Tibaque III', 'San Cristóbal', 'mixto', point(-74.071973, 4.565502)),
  ('201318', 'El Triángulo II', 'San Cristóbal', 'mixto', point(-74.075178, 4.566138)),
  ('201404', 'La Peña Rural', 'Santa Fe', 'mixto', point(-74.065183, 4.586039)),
  ('201408', 'La Perseverancia I', 'Santa Fe', 'mixto', point(-74.062309, 4.616685)),
  ('201503', 'Siberia II', 'Chapinero', 'mixto', point(-74.058518, 4.631769)),
  ('201508', 'Pardo Rubio I', 'Chapinero', 'mixto', point(-74.057982, 4.634673)),
  ('202203', 'Bolonia I (2)', 'Usme', 'mixto', point(-74.09528, 4.509321)),
  ('202204', 'La Esperanza Sur I', 'Usme', 'mixto', point(-74.096491, 4.507678)),
  ('202309', 'El Bosque Sur Oriental Rural III', 'Usme', 'mixto', point(-74.080643, 4.472998)),
  ('202404', 'San Felipe de Usme Rural', 'Usme', 'mixto', point(-74.096322, 4.500817)),
  ('202410', 'Tocaimita Oriental', 'Usme', 'mixto', point(-74.094767, 4.501943)),
  ('202502', 'El Uval', 'Usme', 'mixto', point(-74.102819, 4.484367)),
  ('202506', 'El Nuevo Portal II Rural', 'Usme', 'mixto', point(-74.096218, 4.489402)),
  ('202511', 'Puerta Al Llano Rural', 'Usme', 'mixto', point(-74.107859, 4.490016)),
  ('202513', 'El Uval II', 'Usme', 'mixto', point(-74.116411, 4.48415)),
  ('202514', 'El Uval I', 'Usme', 'mixto', point(-74.104403, 4.485301)),
  ('202515', 'El Uval III', 'Usme', 'mixto', point(-74.107734, 4.484973)),
  ('202601', 'Centro Usme', 'Usme', 'mixto', point(-74.128216, 4.469647)),
  ('202602', 'Centro Usme (2)', 'Usme', 'mixto', point(-74.122037, 4.476164)),
  ('202603', 'Centro Usme Urbano I (2)', 'Usme', 'mixto', point(-74.12175, 4.478241)),
  ('202604', 'Portal', 'Usme', 'mixto', point(-74.098892, 4.492694)),
  ('204106', 'Nueva Esperanza', 'Ciudad Bolívar', 'mixto', point(-74.166566, 4.546177)),
  ('204107', 'El Mirador II', 'Ciudad Bolívar', 'mixto', point(-74.159963, 4.547435)),
  ('204108', 'Quiba Bajo I', 'Ciudad Bolívar', 'mixto', point(-74.170165, 4.538001)),
  ('204109', 'Quiba Bajo II', 'Ciudad Bolívar', 'mixto', point(-74.166874, 4.538051)),
  ('204110', 'Quiba Bajo III', 'Ciudad Bolívar', 'mixto', point(-74.155266, 4.535134)),
  ('204111', 'Quiba Bajo IV', 'Ciudad Bolívar', 'mixto', point(-74.157078, 4.537292)),
  ('204119', 'Quiba Bajo V', 'Ciudad Bolívar', 'mixto', point(-74.171335, 4.542591)),
  ('204127', 'Arabia I', 'Ciudad Bolívar', 'mixto', point(-74.150869, 4.531657)),
  ('204128', 'Quiba Rural', 'Ciudad Bolívar', 'mixto', point(-74.142952, 4.533452)),
  ('204129', 'El Mochuelo II Norte', 'Ciudad Bolívar', 'mixto', point(-74.150764, 4.528752)),
  ('204130', 'Arabia II', 'Ciudad Bolívar', 'mixto', point(-74.15301, 4.532017)),
  ('204132', 'Mochuelo V', 'Ciudad Bolívar', 'mixto', point(-74.152786, 4.536412)),
  ('204304', 'Lagunitas', 'Ciudad Bolívar', 'mixto', point(-74.146658, 4.50562)),
  ('205101', 'Vereda el Tintal Urbano', 'Kennedy', 'mixto', point(-74.150019, 4.655457)),
  ('205102', 'Vereda el Tintal', 'Kennedy', 'mixto', point(-74.139715, 4.660027)),
  ('205109', 'La Magdalena I', 'Kennedy', 'mixto', point(-74.16002, 4.654177)),
  ('205209', 'El Jazmín (2)', 'Kennedy', 'mixto', point(-74.18029, 4.649551)),
  ('205221', 'Galán Rural', 'Kennedy', 'mixto', point(-74.175634, 4.653084)),
  ('205225', 'Las Acacias Rural', 'Kennedy', 'mixto', point(-74.178796, 4.65138)),
  ('205227', 'Osorio IV', 'Kennedy', 'mixto', point(-74.171557, 4.655153)),
  ('205229', 'Osorio', 'Kennedy', 'mixto', point(-74.182813, 4.64595)),
  ('205308', 'Cañaveralejo Rural', 'Bosa', 'mixto', point(-74.20197, 4.643344)),
  ('205316', 'Villa Emma', 'Bosa', 'mixto', point(-74.205217, 4.620298)),
  ('205318', 'San Bernardino XVIII (2)', 'Bosa', 'mixto', point(-74.210138, 4.617112)),
  ('205319', 'San Bernardino XIX', 'Bosa', 'mixto', point(-74.206015, 4.634838)),
  ('205320', 'El Remanso', 'Bosa', 'mixto', point(-74.205574, 4.616879)),
  ('205322', 'Campo Verde', 'Bosa', 'mixto', point(-74.210106, 4.625065)),
  ('205325', 'Bosa 37', 'Bosa', 'mixto', point(-74.21163, 4.63215)),
  ('205401', 'El Chanco II', 'Fontibón', 'mixto', point(-74.169425, 4.684858)),
  ('205402', 'El Charco', 'Fontibón', 'mixto', point(-74.170234, 4.696189)),
  ('206154', 'El Cedro I', 'Engativá', 'mixto', point(-74.151056, 4.722164)),
  ('206502', 'Dorado Industrial I', 'Engativá', 'mixto', point(-74.125981, 4.726568)),
  ('207110', 'Casablanca Suba Otoño', 'Suba', 'mixto', point(-74.050263, 4.781544)),
  ('207111', 'El Otoño', 'Suba', 'mixto', point(-74.048481, 4.777946)),
  ('207112', 'Casa Blanca Suba III', 'Suba', 'mixto', point(-74.059798, 4.774702)),
  ('207801', 'Santa Cecilia de Suba II', 'Suba', 'mixto', point(-74.131689, 4.740591)),
  ('208101', 'Páramo IV', 'Chapinero', 'mixto', point(-74.019073, 4.672822)),
  ('208104', 'Páramo Urbano', 'Chapinero', 'mixto', point(-74.029882, 4.674941)),
  ('208107', 'La Esperanza', 'Chapinero', 'mixto', point(-74.02454, 4.664578)),
  ('208108', 'San Isidro Rural', 'Chapinero', 'mixto', point(-74.019527, 4.6637)),
  ('208110', 'San Luis Altos del Cabo Rural', 'Chapinero', 'mixto', point(-74.025626, 4.671149)),
  ('208111', 'San Isidro', 'Chapinero', 'mixto', point(-74.01797, 4.669831)),
  ('208125', 'San Luis Altos del Cabo Rural II', 'Chapinero', 'mixto', point(-74.022555, 4.669951)),
  ('208126', 'San Isidro Rural II', 'Chapinero', 'mixto', point(-74.017322, 4.666079)),
  ('208127', 'Páramo Rural V', 'Chapinero', 'mixto', point(-74.012292, 4.665881)),
  ('208128', 'Torca II', 'Usaquén', 'mixto', point(-74.026688, 4.810901)),
  ('208129', 'Las Delicias del Carmen II Sector', 'Usaquén', 'mixto', point(-74.023854, 4.703188)),
  ('208130', 'Torca', 'Usaquén', 'mixto', point(-74.030038, 4.780631)),
  ('208131', 'Torca III', 'Usaquén', 'mixto', point(-74.032, 4.794648)),
  ('208132', 'Tibabita el Rosario', 'Usaquén', 'mixto', point(-74.036017, 4.774596)),
  ('208203', 'La Estrellita', 'Usaquén', 'mixto', point(-74.022024, 4.762365)),
  ('232808', 'El Destino', 'Usme', 'mixto', point(-74.138377, 4.408593)),
  ('233106', 'Nazareth Urbano', 'Sumapaz', 'mixto', point(-74.146898, 4.172331)),
  ('233201', 'Betania (2)', 'Sumapaz', 'mixto', point(-74.14616, 4.217698)),
  ('234104', 'Pasquilla Urbana', 'Ciudad Bolívar', 'mixto', point(-74.156075, 4.443777)),
  ('234110', 'Quiba Bajo Urbano', 'Ciudad Bolívar', 'mixto', point(-74.168906, 4.527756)),
  ('234131', 'Mochuelo Alto Urbano', 'Ciudad Bolívar', 'mixto', point(-74.148232, 4.488436)),
  ('237106', 'Chorillos', 'Suba', 'mixto', point(-74.093874, 4.782471)),
  ('238111', 'Altos de Serrezuela', 'Usaquén', 'mixto', point(-74.017702, 4.762463)),
  ('239104', 'San Juan Urbano', 'Sumapaz', 'mixto', point(-74.314536, 4.029154)),
  ('239106', 'La Unión Urbano', 'Sumapaz', 'mixto', point(-74.36361, 3.985611)),
  ('239116', 'Nueva Granada (2)', 'Sumapaz', 'mixto', point(-74.358477, 3.890263));
-- END GENERADO: sectores

-- anon sin acceso directo; el operador lee (para asignar el barrio a mano); service_role todo.
revoke all on public.sectores from anon;
grant select on public.sectores to authenticated;
grant all on public.sectores to service_role;
alter table public.sectores enable row level security;
create policy "operador lee sectores" on public.sectores for select to authenticated using (true);

-- ── 2. Columnas de inmuebles + trigger ─────────────────────────────────────────

alter table public.inmuebles
  add column sector_codigo text references public.sectores (codigo),
  add column ctl_expedido_el date;

-- La fecha del CTL solo existe en un anuncio verificado.
alter table public.inmuebles
  add constraint inmuebles_ctl_requiere_verificado
  check (ctl_expedido_el is null or nivel_verificacion = 'verificado');

create index inmuebles_sector_idx on public.inmuebles (sector_codigo);

-- Fija `sector_codigo` al insertar o al cambiar el barrio. Una asignación explícita (el operador fija
-- el sector a mano en el panel) manda sobre la coincidencia por nombre.
create function public.fijar_sector()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sector_codigo is not null
     and (tg_op = 'INSERT' or new.sector_codigo is distinct from old.sector_codigo) then
    return new;
  end if;
  new.sector_codigo := (
    select s.codigo
    from public.sectores s
    join public.zonas z on lower(z.nombre) = lower(s.localidad)
    where z.id = new.zona_id
      and public.clave_barrio(s.nombre) = public.clave_barrio(new.barrio)
  );
  return new;
end;
$$;

create trigger inmuebles_fijar_sector
  before insert or update of barrio on public.inmuebles
  for each row execute function public.fijar_sector();

-- Los anuncios de antes: los que escribieron un barrio que existe en el catálogo quedan ubicados; el
-- resto queda en null (sin barrio del catálogo ⇒ cola del operador, no aparece en la zona dibujada).
update public.inmuebles i
  set sector_codigo = s.codigo
  from public.zonas z, public.sectores s
  where z.id = i.zona_id
    and lower(z.nombre) = lower(s.localidad)
    and public.clave_barrio(s.nombre) = public.clave_barrio(i.barrio)
    and i.sector_codigo is null;

-- ── 3. Verificación con fecha del CTL (operador) ───────────────────────────────

-- El CTL no puede tener más de 30 días ni fecha futura. El documento jamás se almacena: persisten la
-- matrícula, el nivel y las dos fechas.
create function public.marcar_verificado_ctl(
  p_inmueble_id uuid,
  p_matricula text,
  p_ctl_expedido_el date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if p_ctl_expedido_el is null
     or p_ctl_expedido_el > v_hoy
     or p_ctl_expedido_el < v_hoy - 30 then
    raise exception 'ctl_fuera_de_plazo' using errcode = 'check_violation';
  end if;
  update public.inmuebles
    set nivel_verificacion = 'verificado',
        matricula = nullif(btrim(p_matricula), ''),
        verificado_at = now(),
        ctl_expedido_el = p_ctl_expedido_el
    where id = p_inmueble_id;
  if not found then
    raise exception 'inmueble_no_encontrado';
  end if;
end;
$$;

-- ── 4. Búsqueda pública ────────────────────────────────────────────────────────

-- Lista blanca de campos: SIN dirección y SIN datos del vendedor. `p_poligono` es el texto de un
-- `polygon` de Postgres ('((lon,lat),(lon,lat),…)', entre 3 y 100 vértices); un anuncio entra si el
-- centroide de su barrio cae dentro. Solo anuncios vigentes; los más recién confirmados primero.
create function public.buscar_inmuebles(
  p_operacion public.operacion default null,
  p_tipo public.tipo_inmueble default null,
  p_localidad text default null,
  p_precio_min bigint default null,
  p_precio_max bigint default null,
  p_habitaciones_min smallint default null,
  p_poligono text default null,
  p_limite integer default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_poligono polygon;
  v_limite integer := least(greatest(coalesce(p_limite, 60), 1), 60);
begin
  if p_poligono is not null then
    begin
      v_poligono := p_poligono::polygon;
    exception when others then
      raise exception 'poligono_invalido' using errcode = 'check_violation';
    end;
    if npoints(v_poligono) < 3 or npoints(v_poligono) > 100 then
      raise exception 'poligono_invalido' using errcode = 'check_violation';
    end if;
  end if;

  return coalesce((
    select jsonb_agg(r.fila order by r.vigente_hasta desc, r.created_at desc)
    from (
      select
        jsonb_build_object(
          'slug', i.slug,
          'operacion', i.operacion,
          'tipo', i.tipo,
          'barrio', i.barrio,
          'sector_codigo', i.sector_codigo,
          'localidad', coalesce(s.localidad, z.nombre),
          'area_m2', i.area_m2,
          'habitaciones', i.habitaciones,
          'precio_esperado', i.precio_esperado,
          'nivel_verificacion', i.nivel_verificacion,
          'ctl_expedido_el', i.ctl_expedido_el,
          'vigente_hasta', i.vigente_hasta,
          'portada', (
            select f.r2_key from public.fotos f
            where f.inmueble_id = i.id
            order by f.es_portada desc, f.orden
            limit 1
          )
        ) as fila,
        i.vigente_hasta,
        i.created_at
      from public.inmuebles i
      left join public.sectores s on s.codigo = i.sector_codigo
      left join public.zonas z on z.id = i.zona_id
      where i.vigente_hasta > now()
        and i.estado = 'publicado_fundador'
        and i.slug is not null
        and (p_operacion is null or i.operacion = p_operacion)
        and (p_tipo is null or i.tipo = p_tipo)
        and (p_localidad is null or lower(coalesce(s.localidad, z.nombre)) = lower(p_localidad))
        and (p_precio_min is null or i.precio_esperado >= p_precio_min)
        and (p_precio_max is null or i.precio_esperado <= p_precio_max)
        and (p_habitaciones_min is null or i.habitaciones >= p_habitaciones_min)
        and (v_poligono is null or (s.centroide is not null and v_poligono @> s.centroide))
      order by i.vigente_hasta desc, i.created_at desc
      limit v_limite
    ) r
  ), '[]'::jsonb);
end;
$$;

-- ── 5. Lecturas existentes (misma firma ⇒ create or replace conserva los grants) ──

-- obtener_ficha: + vigente_hasta (para «vivo hace N días»), la fecha del CTL y el barrio del catálogo.
create or replace function public.obtener_ficha(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inmueble public.inmuebles;
  v_vendedor public.vendedores;
  v_localidad text;
  v_fotos jsonb;
begin
  select * into v_inmueble from public.inmuebles where slug = p_slug;
  if not found then
    return null;
  end if;
  -- Anti-zombie: un anuncio vencido desaparece de la vista pública AL INSTANTE.
  if v_inmueble.vigente_hasta <= now() then
    return null;
  end if;
  select * into v_vendedor from public.vendedores where id = v_inmueble.vendedor_id;
  v_localidad := coalesce(
    (select s.localidad from public.sectores s where s.codigo = v_inmueble.sector_codigo),
    (select z.nombre from public.zonas z where z.id = v_inmueble.zona_id)
  );
  select coalesce(
    jsonb_agg(
      jsonb_build_object('r2_key', f.r2_key, 'orden', f.orden, 'es_portada', f.es_portada)
      order by f.es_portada desc, f.orden
    ),
    '[]'::jsonb
  )
  into v_fotos
  from public.fotos f
  where f.inmueble_id = v_inmueble.id;

  return jsonb_build_object(
    'slug', v_inmueble.slug,
    'operacion', v_inmueble.operacion,
    'tipo', v_inmueble.tipo,
    'barrio', v_inmueble.barrio,
    'sector_codigo', v_inmueble.sector_codigo,
    'localidad', v_localidad,
    'ciudad', v_vendedor.ciudad,
    'area_m2', v_inmueble.area_m2,
    'habitaciones', v_inmueble.habitaciones,
    'precio_esperado', v_inmueble.precio_esperado,
    'descripcion', v_inmueble.descripcion,
    'nivel_verificacion', v_inmueble.nivel_verificacion,
    'ctl_expedido_el', v_inmueble.ctl_expedido_el,
    'vigente_hasta', v_inmueble.vigente_hasta,
    'nombre_publicador', v_vendedor.nombre,
    'fotos', v_fotos,
    'contacto_publico', v_inmueble.contacto_publico,
    'whatsapp', case when v_inmueble.contacto_publico then v_vendedor.whatsapp else null end
  );
end;
$$;

-- obtener_mi_anuncio: + la fecha del CTL y el barrio del catálogo (el dueño ve su propio sello).
create or replace function public.obtener_mi_anuncio(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_inmueble public.inmuebles;
  v_fotos jsonb;
begin
  if p_token is null or length(p_token) <> 43 then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select * into v_inmueble from public.inmuebles where edit_token_hash = v_hash;
  if not found then
    return null;
  end if;
  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', f.id, 'r2_key', f.r2_key, 'orden', f.orden, 'es_portada', f.es_portada)
      order by f.orden
    ),
    '[]'::jsonb
  )
  into v_fotos
  from public.fotos f
  where f.inmueble_id = v_inmueble.id;

  return jsonb_build_object(
    'id', v_inmueble.id,
    'slug', v_inmueble.slug,
    'operacion', v_inmueble.operacion,
    'tipo', v_inmueble.tipo,
    'barrio', v_inmueble.barrio,
    'sector_codigo', v_inmueble.sector_codigo,
    'area_m2', v_inmueble.area_m2,
    'habitaciones', v_inmueble.habitaciones,
    'precio_esperado', v_inmueble.precio_esperado,
    'descripcion', v_inmueble.descripcion,
    'contacto_publico', v_inmueble.contacto_publico,
    'nivel_verificacion', v_inmueble.nivel_verificacion,
    'ctl_expedido_el', v_inmueble.ctl_expedido_el,
    'vigente_hasta', v_inmueble.vigente_hasta,
    'vigente', (v_inmueble.vigente_hasta > now()),
    'fotos', v_fotos
  );
end;
$$;

-- obtener_lote: + filtro `re-verificar` (verificado sin fecha de CTL). Solo lo llama el operador.
create or replace function public.obtener_lote(p_filtro text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'inmueble_id', i.id, 'email', ve.email, 'nombre', ve.nombre, 'barrio', i.barrio,
        'idioma', ve.idioma
      )
      order by i.created_at
    ),
    '[]'::jsonb
  )
  from public.inmuebles i
  join public.vendedores ve on ve.id = i.vendedor_id
  where ve.email is not null
    and i.vigente_hasta > now()
    and (
      (p_filtro = 'sin-fotos'
        and not exists (select 1 from public.fotos f where f.inmueble_id = i.id))
      or (p_filtro = 'sin-sello' and i.nivel_verificacion = 'fundador')
      or (p_filtro = 'por-vencer' and i.vigente_hasta <= now() + interval '14 days')
      or (p_filtro = 're-verificar'
        and i.nivel_verificacion = 'verificado' and i.ctl_expedido_el is null)
    );
$$;

-- ── 6. Privilegios EXPLÍCITOS, por firma (las funciones nuevas nacen cerradas: migración 6) ──

-- Pública (anon + authenticated): la búsqueda.
revoke all on function public.buscar_inmuebles(
  public.operacion, public.tipo_inmueble, text, bigint, bigint, smallint, text, integer
) from public;
grant execute on function public.buscar_inmuebles(
  public.operacion, public.tipo_inmueble, text, bigint, bigint, smallint, text, integer
) to anon, authenticated, service_role;

-- Solo del operador (authenticated): la verificación con fecha.
revoke all on function public.marcar_verificado_ctl(uuid, text, date) from public;
grant execute on function public.marcar_verificado_ctl(uuid, text, date) to authenticated, service_role;
