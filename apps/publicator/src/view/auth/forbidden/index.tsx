"use client";

import { useSignOutMutation } from "@repo/store";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { paths } from "@/config/paths.config";

function ForbiddenView() {
  const router = useRouter();
  const [signOut, { isLoading }] = useSignOutMutation();

  const handleSignOut = async () => {
    await signOut().unwrap();
    router.push(paths.auth.signIn);
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-16 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          Your account doesn&apos;t have access to the internal dashboard.
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={isLoading}
        onClick={handleSignOut}
      >
        Log out
      </Button>
    </div>
  );
}

export { ForbiddenView };
