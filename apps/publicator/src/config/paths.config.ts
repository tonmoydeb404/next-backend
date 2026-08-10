// Single source of truth for every route in this app — never hardcode a naked path
// string elsewhere; import `paths` instead.
export const paths = {
  root: "/",
  auth: {
    root: "/auth",
    signIn: "/auth/sign-in",
    forbidden: "/auth/forbidden",
  },
};
