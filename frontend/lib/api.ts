// lib/api.ts
// Centralized API configuration

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    profile: `${API_BASE_URL}/api/auth/profile`,
  },
  quests: {
    generate: `${API_BASE_URL}/api/quests/generate`,
    generateMonthly: `${API_BASE_URL}/api/quests/generate-monthly`,
    checkToday: `${API_BASE_URL}/api/quests/check-today`,
    complete: `${API_BASE_URL}/api/quests/complete`,
  },
  outfits: {
    all: `${API_BASE_URL}/api/outfits`,
    user: `${API_BASE_URL}/api/outfits/user`,
    points: `${API_BASE_URL}/api/outfits/user/points`,
    buy: (outfitId: number) => `${API_BASE_URL}/api/outfits/user/${outfitId}/buy`,
    equip: (outfitId: number) => `${API_BASE_URL}/api/outfits/user/${outfitId}/equip`,
  },
  journal: {
    submit: `${API_BASE_URL}/api/journal/submit`,
    entries: `${API_BASE_URL}/api/journal/entries`,
  },
  streak: {
    check: `${API_BASE_URL}/api/streak/check`,
    info: `${API_BASE_URL}/api/streak/info`,
  },
};





