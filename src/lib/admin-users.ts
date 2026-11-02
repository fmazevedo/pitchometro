import { z } from "zod";

export const adminProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome completo.")
    .max(120, "Nome longo demais.")
    .refine((value) => value.split(/\s+/).length >= 2, "Informe o nome completo (nome e sobrenome)."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email("Informe um e-mail válido.")),
});
