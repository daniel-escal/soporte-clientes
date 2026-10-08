import { z } from 'zod'

/** Primer mensaje de error de cada campo de un formulario validado con zod, para mostrarlo junto a él. */
export function erroresPorCampo<Campo extends string>(error: z.ZodError): Partial<Record<Campo, string>> {
  const { fieldErrors } = z.flattenError(error) as { fieldErrors: Partial<Record<Campo, string[]>> }
  return Object.fromEntries(
    Object.entries<string[] | undefined>(fieldErrors).flatMap(([campo, mensajes]) => (mensajes?.[0] ? [[campo, mensajes[0]]] : [])),
  ) as Partial<Record<Campo, string>>
}
