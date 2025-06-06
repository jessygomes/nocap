"use server";
import * as z from "zod";
import { db } from "../db";
import bcrypt from "bcryptjs";
import {
  newPasswordSchema,
  ResetSchema,
  userLoginSchema,
  userRegisterSchema,
} from "../validator";

import { getUserByEmail } from "./user.actions";

import { signIn, signOut } from "@/auth";
import { DEFAULT_LOGIN_REDIRECT } from "@/route";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { generatePasswordResetToken } from "../tokens";
import { sendPasswordResetEmail } from "../mail";
import { getPasswordResetTokenByToken } from "./password-reset";

//! LOGIN ACTION
export const login = async (values: z.infer<typeof userLoginSchema>) => {
  // Revalidation des champs dans le back-end (où personne peut les manipuler)
  const validateFields = userLoginSchema.safeParse(values);

  if (!validateFields.success) {
    return { error: "Formulaire Invalide" };
  }

  const { email, password } = validateFields.data;

  const existingUser = await getUserByEmail(email);
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return { error: "Identifiants invalides." };
  }

  const passwordMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordMatch) {
    return { error: "Identifiants invalides." };
  }

  // La fonction signIn vient de NextAuth importé depuis "auth.ts"
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    });
    return { success: "Vous êtes connecté." };
  } catch (error) {
    // Ici, on récupère les erreurs envoyé par nextAuth en fonction du type d'erreur
    if (error instanceof AuthError) {
      switch (error.type) {
        // Si le type d'erreur est "Credentials"
        case "CredentialsSignin":
          return { error: "Identifiants incorrects." };
        default:
          return { error: "Identifiants incorrects." };
      }
    }
    // (A compléter)
    throw error;
  }
};

//! REGISTER ACTION
export const register = async (values: z.infer<typeof userRegisterSchema>) => {
  const validateFields = userRegisterSchema.safeParse(values);

  if (!validateFields.success) {
    return { error: "Formulaire Invalide" };
  }

  const { email, password, name, role, isNewsletterSubscribed } =
    validateFields.data;

  // if (password !== passwordConfirmation) {
  //   return { error: "Les mots de passe ne correspondent pas." };
  // }

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { error: "Cet utilisateur existe déjà." };
  }

  await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name,
      role,
      isNewsletterSubscribed,
    },
  });

  return {
    success: "Votre compte a bien été créé.",
  };
};

//! LOGOUT ACTION
export const logout = async (pathname: string) => {
  // On peut dans cette fonction supprimer des cookies ou des tokens de session du User par exemple
  await signOut();
  revalidatePath(pathname);
};

//! RESET PASSWORD ACTION
export const reset = async (values: z.infer<typeof ResetSchema>) => {
  const validatedFields = ResetSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Formulaire invalide." };
  }

  const { email } = validatedFields.data;

  const existingUser = await getUserByEmail(email);
  if (!existingUser) {
    return { error: "Email introuvable." };
  }

  // Générer un token de réinitialisation et envoyer un email
  const passwordResetToken = await generatePasswordResetToken(email);
  // await sendPasswordResetEmail(
  //   passwordResetToken.email,
  //   passwordResetToken.token
  // );

  await fetch(`${process.env.NEXTAUTH_URL}/api/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "No Cap",
        address: "no-reply@nocap.com",
      },
      recipient: { name: existingUser.name, address: passwordResetToken.email },
      subject: "NO CAP | Réinitialisation de votre mot de passe",
      message: `Cliquez sur le lien suivant afin de réinitialiser votre mot de passe :  ${process.env.NEXTAUTH_URL}/nouveau-mot-de-passe?token=${passwordResetToken.token}`,
    }),
  });

  return { success: "Un email de réinitialisation a été envoyé." };
};

//! RESET PASSWORD ACTION
export const newPassword = async (
  values: z.infer<typeof newPasswordSchema>,
  token: string | null
) => {
  if (!token) {
    return { error: "Token manquant." };
  }

  const validatedFields = newPasswordSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Formulaire invalide." };
  }

  const { password, passwordConfirmation } = validatedFields.data;
  if (password !== passwordConfirmation) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const existingToken = await getPasswordResetTokenByToken(token);
  if (!existingToken) {
    return { error: "Token invalide." };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) {
    return { error: "Le token a expiré." };
  }

  const existingUser = await getUserByEmail(existingToken.email);
  if (!existingUser) {
    return { error: "Utilisateur introuvable." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.update({
    where: { id: existingUser.id },
    data: { password: hashedPassword },
  });

  await db.passwordResetToken.delete({
    where: { id: existingToken.id },
  });

  return { success: "Mot de passe mis à jour." };
};
