"use client";
import * as z from "zod";
import { userLoginSchema } from "@/lib/validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { login } from "@/lib/actions/auth.actions";

import { CardWrapper } from "./CardWrapper";
import { FormError } from "./FormError";
import { FormSuccess } from "./FormSucess";
import { useState, useTransition } from "react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { revalidatePath } from "next/cache";

export const LoginForm = () => {
  const router = useRouter();
  //! Prendre l'erreur depuis l'URL lors des connexion avec le provider Google
  const searchParams = useSearchParams();
  const urlError =
    searchParams.get("error") === "OauthAccountNotLinked"
      ? "L'email est déjà utilisé par un autre compte"
      : "";

  //! TVa permettre d'inititer un état de chargement lors de la soumission du formulaire et permettra de désactiver les boutons au submit du formulaire
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  //! Schema de validation
  const form = useForm<z.infer<typeof userLoginSchema>>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  //! Fonction de soumission du formulaire
  const onSubmit = (values: z.infer<typeof userLoginSchema>) => {
    setError("");
    setSuccess("");

    // Server Action (je peux aussi utiliser fetch ici)
    startTransition(() => {
      login(values)
        .then((data) => {
          if (data?.error) {
            form.reset();
            setError(data.error);
          }

          if (data?.success) {
            form.reset();
            setSuccess(data.success);
            router.push("/");
            revalidatePath("/");
          }
        })
        .catch(() =>
          setError("Une erreur s'est produite. Veuillez réessayer.")
        );
    });
  };

  return (
    <CardWrapper
      headerLabel="ICI ET NULLE PART AILLEURS"
      backButtonLabel="Vous n'avez pas encore de compte ? C'est ici que ça se passe !"
      backButtonHref="/inscription"
      showSocial
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="email"
                        id="email"
                        placeholder="Email ou nom d'utilisateur"
                        {...field}
                        disabled={isPending}
                        className="input-field rounded-sm text-black"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="password"
                        id="password"
                        placeholder="Mot de passe"
                        {...field}
                        disabled={isPending}
                        className="input-field text-black rounded-sm"
                      />
                    </FormControl>

                    <button className="">
                      <Link
                        href="/auth/reset"
                        className="text-[0.8rem] hover:text-grey-500"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          </div>
          <FormError message={error || urlError} />
          <FormSuccess message={success} />
          <Button
            type="submit"
            disabled={isPending}
            className="button hover:bg-slate-800 w-full"
          >
            Connexion
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};