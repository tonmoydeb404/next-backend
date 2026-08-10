"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSignInMutation } from "@repo/store";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { RhfInput } from "@/components/fields/rhf";
import { Button } from "@/components/ui/button";
import { paths } from "@/config/paths.config";
import { signInSchema, type SignInInput } from "@/view/auth/sign-in/schema";

function SignInView() {
  const router = useRouter();
  const [signIn] = useSignInMutation();

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signIn(values).unwrap();
      router.push(paths.root);
    } catch (error) {
      const message =
        error && typeof error === "object" && "error" in error
          ? String(error.error)
          : "Unable to sign in";
      form.setError("root", { message });
    }
  });

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Staff accounts only — sign in with your BandiNet credentials.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <RhfInput
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <RhfInput
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        {form.formState.errors.root ? (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Sign in
        </Button>
      </form>
    </div>
  );
}

export { SignInView };
