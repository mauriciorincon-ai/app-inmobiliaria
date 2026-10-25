// Un aviso con símbolo y texto (el color nunca va solo): «i» informa, «▲» dice que algo no se calculó o no se pudo verificar.
export default function Aviso({
  clase,
  simbolo,
  children,
}: {
  clase: string;
  simbolo: string;
  children: string;
}) {
  return (
    <div className={`flex gap-3 rounded-2xl p-3 text-sm ${clase}`}>
      <span aria-hidden="true" className="font-bold">
        {simbolo}
      </span>
      <p>{children}</p>
    </div>
  );
}
