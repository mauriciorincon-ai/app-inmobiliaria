// Lee el cuerpo de una petición sin pasar de `limite` bytes (S16; deuda del S7). `req.text()` lee TODO antes de que se pueda
// medir: un cuerpo sin `content-length` (por partes) entraba entero a la memoria aunque luego se rechazara. Aquí se corta en
// cuanto lo leído pasa del tope y se devuelve `null`.
export async function leerConTope(
  req: Request,
  limite: number,
): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? "0") > limite) return null;
  if (!req.body) return "";
  const lector = req.body.getReader();
  const partes: Uint8Array[] = [];
  let leidos = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    leidos += value.byteLength;
    if (leidos > limite) {
      await lector.cancel();
      return null;
    }
    partes.push(value);
  }
  const todo = new Uint8Array(leidos);
  let i = 0;
  for (const p of partes) {
    todo.set(p, i);
    i += p.byteLength;
  }
  return new TextDecoder().decode(todo);
}
