"use client";

import { AuthListener } from "@repo/store";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "./store";

interface Props {
  children: ReactNode;
}

export const ReduxWrapper = ({ children }: Props) => {
  return (
    <Provider store={store}>
      <AuthListener />
      {children}
    </Provider>
  );
};
