/* ──────────────────────────────────────────────────────────────
   src/lib/store.js — Zustand global state
   Swiper queue · active lead · CRM filters · profile cache
   ────────────────────────────────────────────────────────────── */
import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Swiper queue ──────────────────────────────────────────
  swiperQueue: [],
  currentCardIndex: 0,
  setSwiperQueue: (leads) => set({ swiperQueue: leads, currentCardIndex: 0 }),
  advanceQueue: () => set(s => ({ currentCardIndex: s.currentCardIndex + 1 })),
  getCurrentCard: () => {
    const { swiperQueue, currentCardIndex } = get()
    return swiperQueue[currentCardIndex] || null
  },

  // ── Active lead (Research → MakeContact) ─────────────────
  activeLead: null,
  setActiveLead: (lead) => set({ activeLead: lead }),

  // ── CRM filter state ──────────────────────────────────────
  crmFilter: 'all',
  setCrmFilter: (f) => set({ crmFilter: f }),

  // ── Lead List filters ─────────────────────────────────────
  leadListFilter: { status: 'all', fit: 'all', search: '' },
  setLeadListFilter: (patch) =>
    set(s => ({ leadListFilter: { ...s.leadListFilter, ...patch } })),

  // ── Profile cache ─────────────────────────────────────────
  profile: null,
  setProfile: (p) => set({ profile: p }),

  // ── Groq model ────────────────────────────────────────────
  detectedModel: null,
  setDetectedModel: (m) => set({ detectedModel: m }),

  // ── UI state ──────────────────────────────────────────────
  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
