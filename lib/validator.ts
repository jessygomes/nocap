import * as z from "zod";

//! LOGIN SCHEMA
export const userLoginSchema = z.object({
  email: z.string().email({
    message: "L'email est requis.",
  }),
  password: z.string().min(1, "Le mot de passe est requis."),
  code: z.optional(z.string()), // Pour Auhtentification à deux facteurs
});

//! REGISTER SCHEMA
export const userRegisterSchema = z
  .object({
    name: z.string().min(2, "Le pseudo doit contenir au moins 2 caractères."),
    email: z.string().email({
      message: "L'email est requis.",
    }),
    role: z.enum(["user", "admin"]),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 6 caractères."),
    passwordConfirmation: z.string(),
  })
  .superRefine(({ passwordConfirmation, password }, ctx) => {
    if (passwordConfirmation !== password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les mots de passe ne correspondent pas.",
        path: ["passwordConfirmation"],
      });
    }
  });

//! RESET SCHEMA
export const ResetSchema = z.object({
  email: z.string().email({
    message: "L'email est requis.",
  }),
});

//! NEW PASSWORD SCHEMA
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    passwordConfirmation: z.string(),
  })
  .superRefine(({ passwordConfirmation, password }, ctx) => {
    if (passwordConfirmation !== password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les mots de passe ne correspondent pas.",
        path: ["passwordConfirmation"],
      });
    }
  });
