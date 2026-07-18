// Lee el ancho/alto de un archivo de imagen SIN subirlo — el gate corre antes de comprimir y de
// cualquier red. Usa createImageBitmap (rápido, no toca el DOM) con fallback a Image para
// navegadores viejos. Se inyecta como dependencia en el subidor → trivial de mockear en tests.

export type Dimensiones = { ancho: number; alto: number };

export async function leerDimensiones(file: File): Promise<Dimensiones> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dim = { ancho: bitmap.width, alto: bitmap.height };
    bitmap.close();
    return dim;
  }
  return await new Promise<Dimensiones>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dim = { ancho: img.naturalWidth, alto: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dim);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("no_se_pudo_leer_imagen"));
    };
    img.src = url;
  });
}

export type LeerDimensiones = typeof leerDimensiones;
