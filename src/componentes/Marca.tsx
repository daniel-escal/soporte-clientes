import { Headset } from 'lucide-react'

export function Marca() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="degradado-marca grid size-8 place-items-center rounded-full p-[2px]">
        <span className="grid size-full place-items-center rounded-full bg-superficie">
          <Headset className="size-4 text-violeta-texto" strokeWidth={2} />
        </span>
      </span>
      <span className="text-base font-semibold tracking-tight text-texto">
        Soporte <span className="font-normal text-texto-suave">· daniel-escal.es</span>
      </span>
    </span>
  )
}
