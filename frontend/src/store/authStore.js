// src/store/authStore.js

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({

      user: null,
      token: null,


      setAuth: ({ user, token }) => set({ user, token }),


      logout: () => set({ user: null, token: null }),
    }),
    {

      name: "user-session-storage", 
    }
  )
);