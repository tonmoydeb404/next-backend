import { authApi } from "#endpoints/auth/auth-api.ts";
import { sessionApi } from "#endpoints/auth/session-api.ts";
import { createSlice } from "@reduxjs/toolkit";
import type { JwtPayload } from "@repo/supabase";
import type { MeDetailsResponse } from "@repo/validators";

type MeResults = MeDetailsResponse["results"];

interface AuthState {
  session: JwtPayload | null;
  profile: MeResults["profile"];
  internalRole: MeResults["internalRole"];
  seats: MeResults["seats"];
}

const initialState: AuthState = {
  session: null,
  profile: null,
  internalRole: null,
  seats: [],
};

// Pessimistic — state only ever changes in response to a *fulfilled* session/auth-api
// call, never optimistically ahead of the actual Supabase/backend response.
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        sessionApi.endpoints.session.matchFulfilled,
        (state, action) => {
          state.session = action.payload;
        },
      )
      .addMatcher(sessionApi.endpoints.signOut.matchFulfilled, (state) => {
        state.session = null;
        state.profile = null;
        state.internalRole = null;
        state.seats = [];
      })
      .addMatcher(authApi.endpoints.me.matchFulfilled, (state, action) => {
        state.profile = action.payload.results.profile;
        state.internalRole = action.payload.results.internalRole;
        state.seats = action.payload.results.seats;
      });
  },
});
