import { authSlice } from "#slices/auth/auth-slice.ts";
import { useSelector } from "react-redux";

type AuthSliceState = ReturnType<typeof authSlice.reducer>;
// Only assumes the slice is mounted under its own name — works regardless of each
// consuming app's full RootState shape.
type StateWithAuthSlice = { [authSlice.name]: AuthSliceState };

// Returns the whole auth slice (session, profile, internalRole) in one call.
export function useAuthSlice(): AuthSliceState {
  return useSelector((state: StateWithAuthSlice) => state[authSlice.name]);
}
