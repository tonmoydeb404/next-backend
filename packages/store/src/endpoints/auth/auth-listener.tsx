"use client";

import { authApi } from "#endpoints/auth/auth-api.ts";
import { AUTH_CACHE_KEYS } from "#endpoints/auth/constant.ts";
import { sessionApi } from "#endpoints/auth/session-api.ts";
import { getSupabaseBrowserClient } from "#supabase-client.ts";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

// Keeps the RTK Query "Session"/"AuthMe" caches in sync with token refreshes
// and cross-tab sign-out/in. Mount once near the root of the app.
function AuthListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    const {
      data: { subscription },
    } = getSupabaseBrowserClient().auth.onAuthStateChange(() => {
      dispatch(sessionApi.util.invalidateTags([AUTH_CACHE_KEYS.SESSION]));
      dispatch(authApi.util.invalidateTags([AUTH_CACHE_KEYS.ME]));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return null;
}

export { AuthListener };
