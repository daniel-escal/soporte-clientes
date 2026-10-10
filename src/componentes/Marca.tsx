import { cn } from '@/lib/utils'

/** La marca: cuatro costillas en hueso con la última en agua, el mismo gesto que el estado de los tickets. */
export function Marca() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="inline-flex h-4 items-stretch gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('w-[3px] rounded-full', i === 3 ? 'bg-agua' : 'bg-texto')} />
        ))}
      </span>
      <span className="font-heading text-base font-medium tracking-tight text-texto">
        Soporte <span className="font-normal text-texto-suave">· daniel-escal.es</span>
      </span>
    </span>
  )
}
