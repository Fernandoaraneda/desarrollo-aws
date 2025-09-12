// src/store/authStore.js

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({
      // 1. ESTADO INICIAL
      // Guardaremos tanto la información del usuario como su token de acceso.
      user: null,
      token: null,

      // 2. ACCIONES
      // Una única función para establecer la sesión completa.
      setAuth: ({ user, token }) => set({ user, token }),

      // El logout ahora limpia tanto el usuario como el token.
      logout: () => set({ user: null, token: null }),
    }),
    {
      // Nombre con el que se guardará la sesión en el localStorage del navegador.
      name: "user-session-storage", 
    }
  )
);