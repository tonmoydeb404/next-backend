import { configureStore } from "@reduxjs/toolkit";
import { Api } from "@repo/store";
import { appSlice } from "./features/app/app-slice";

export const store = configureStore({
  reducer: {
    [Api.reducerPath]: Api.reducer,
    [appSlice.name]: appSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(Api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
