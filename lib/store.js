import { create } from 'zustand';

const useStore = create((set) => ({
  advancedEnabled: false,
  toggleAdvancedFeatures: () => set((state) => ({ advancedEnabled: !state.advancedEnabled })),
  loggedInUser: null,
  setLoggedInUser: (user) => set({ loggedInUser: user }),
  logout: () => set({ loggedInUser: null }),
}));

export default useStore;
