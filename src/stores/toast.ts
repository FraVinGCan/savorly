import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastStore {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => number
  dismiss: (id: number) => void
  clear: () => void
}

const MAX_VISIBLE = 4
let nextId = 1

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }].slice(-MAX_VISIBLE),
    }))
    return id
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}))

const push = (tone: ToastTone, title: string, description?: string) =>
  useToastStore.getState().push({ tone, title, description })

/** Imperative helpers so plain mutations can report without a hook. */
export const toast = {
  success: (title: string, description?: string) =>
    push('success', title, description),
  error: (title: string, description?: string) =>
    push('error', title, description),
  info: (title: string, description?: string) =>
    push('info', title, description),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
}
