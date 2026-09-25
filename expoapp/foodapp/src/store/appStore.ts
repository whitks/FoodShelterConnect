/**
 * appStore.ts – Lightweight module-level reactive store shared across screens.
 * Stores who is logged in (donor / shelter / neither) and a shared feed of
 * active donations (from donor) and active food requests (from shelter).
 * Screens subscribe via a simple listener pattern.
 */

import { api, User, DonorProfile, ShelterProfile } from '@/api/client';

export type UserRole = 'donor' | 'shelter' | 'volunteer' | null;

export interface ActiveDonation {
  id: string;
  donorName: string;
  donorType: string;
  title: string;
  category: string;
  quantity: string;
  preparedAt: string;
  shelfLife: string;
  address: string;
  vegTag: string;
  photoUrl: string;
  postedAgo: string;
  status: 'matching' | 'assigned' | 'picked' | 'delivered';
  driverName?: string;
  assignedNgoName?: string;
  assignedNgoAddress?: string;
  assignedAt?: number;
}

export interface ActiveRequest {
  id: string;
  ngoName: string;
  ngoCategory: string;
  title: string;
  peopleCount: string;
  category: string;
  dietPreference: string;
  requiredBy: string;
  deliveryMode: string;
  address: string;
  postedAgo: string;
  status: 'matching' | 'assigned' | 'delivered';
}

interface AppState {
  currentRole: UserRole;
  user: User | null;
  donorProfile: DonorProfile | null;
  shelterProfile: ShelterProfile | null;
  donorName: string;
  donorType: string;
  shelterName: string;
  shelterCategory: string;
  activeDonations: ActiveDonation[];
  activeRequests: ActiveRequest[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  currentRole: null,
  user: null,
  donorProfile: null,
  shelterProfile: null,
  donorName: '',
  donorType: '',
  shelterName: '',
  shelterCategory: '',
  activeDonations: [
    {
      id: 'seed_don_1',
      donorName: 'Royal Spice Kitchen',
      donorType: 'restaurant',
      title: 'Veg Biryani & 30 Rotis',
      category: 'Cooked Meals',
      quantity: 'Serves ~30 people (12 KG)',
      preparedAt: 'Today at 1:30 PM',
      shelfLife: 'Best within 4 hrs (by 6:30 PM)',
      address: 'Taste of Punjab, 42 Commercial St, Indiranagar',
      vegTag: 'Veg',
      photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      postedAgo: '15 mins ago',
      status: 'matching',
    },
    {
      id: 'seed_don_2',
      donorName: 'Green Leaf Bakery',
      donorType: 'grocery',
      title: 'Surplus Bread Loaves & Pastries',
      category: 'Bakery & Bread',
      quantity: '~50 bread loaves + 30 pastry boxes',
      preparedAt: 'Today at 10:00 AM',
      shelfLife: 'Best within 6 hrs (by 5:00 PM)',
      address: '12 Residency Road, MG Road',
      vegTag: 'Veg',
      photoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
      postedAgo: '1 hr ago',
      status: 'matching',
    },
  ],
  activeRequests: [
    {
      id: 'seed_req_1',
      ngoName: 'Harbor House Shelter',
      ngoCategory: 'Community Shelter',
      title: 'Need Dinner Meals for 80 Residents',
      peopleCount: '80 people',
      category: 'Cooked Meals',
      dietPreference: 'Pure Veg',
      requiredBy: 'Required by 7:30 PM tonight',
      deliveryMode: 'Volunteer Delivery Preferred',
      address: '88 Shelter Road, Near City Park, Bengaluru',
      postedAgo: '30 mins ago',
      status: 'matching',
    },
    {
      id: 'seed_req_2',
      ngoName: 'Sunrise Orphanage',
      ngoCategory: 'Orphanage Home',
      title: 'Need Lunch & Snacks for 45 Children',
      peopleCount: '45 children',
      category: 'Cooked Meals',
      dietPreference: 'Pure Veg',
      requiredBy: 'Required by 1:00 PM today',
      deliveryMode: 'NGO Self-Pickup',
      address: '23 Hope Lane, Jayanagar, Bengaluru',
      postedAgo: '2 hrs ago',
      status: 'matching',
    },
  ],
  isLoading: false,
  error: null,
};

let state: AppState = { ...initialState };
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function setRoleFromUser(user: User | null) {
  if (!user) {
    state = { ...state, currentRole: null, donorName: '', donorType: '', shelterName: '', shelterCategory: '' };
    return;
  }
  // Backend now returns lowercase role
  const role = user.role.toLowerCase();
  switch (role) {
    case 'donor':
      state = { ...state, currentRole: 'donor' };
      break;
    case 'shelter':
      state = { ...state, currentRole: 'shelter' };
      break;
    case 'volunteer':
      state = { ...state, currentRole: 'volunteer' };
      break;
    default:
      state = { ...state, currentRole: null };
  }
}

export const appStore = {
  getState: (): AppState => state,

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async initialize() {
    state = { ...state, isLoading: true };
    notify();
    try {
      await api.init();
      const storedUser = await api.getStoredUser();
      if (storedUser && api.isAuthenticated()) {
        try {
          const freshUser = await api.getMe();
          state = { ...state, user: freshUser };
          setRoleFromUser(freshUser);
          if (freshUser.donor_profile) {
            state = { ...state, donorProfile: freshUser.donor_profile };
          }
          if (freshUser.shelter_profile) {
            state = { ...state, shelterProfile: freshUser.shelter_profile };
          }
        } catch {
          await api.clearAuth();
          state = { ...state, user: null };
          setRoleFromUser(null);
        }
      }
    } catch (error) {
      state = { ...state, error: 'Failed to initialize auth' };
    } finally {
      state = { ...state, isLoading: false };
      notify();
    }
  },

  async login(email: string, password: string) {
    state = { ...state, isLoading: true, error: null };
    notify();
    try {
      const { user } = await api.login(email, password);
      state = { ...state, user };
      setRoleFromUser(user);
      if (user.donor_profile) {
        state = { ...state, donorProfile: user.donor_profile };
      }
      if (user.shelter_profile) {
        state = { ...state, shelterProfile: user.shelter_profile };
      }
      state = { ...state, isLoading: false };
      notify();
      return { success: true };
    } catch (error) {
      state = { ...state, isLoading: false, error: error instanceof Error ? error.message : 'Login failed' };
      notify();
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  },

  async register(data: { email: string; password: string; name: string; phone: string; role: 'donor' | 'shelter' | 'volunteer' }) {
    state = { ...state, isLoading: true, error: null };
    notify();
    try {
      const { user } = await api.register(data);
      state = { ...state, user };
      setRoleFromUser(user);
      if (user.donor_profile) {
        state = { ...state, donorProfile: user.donor_profile };
      }
      if (user.shelter_profile) {
        state = { ...state, shelterProfile: user.shelter_profile };
      }
      state = { ...state, isLoading: false };
      notify();
      return { success: true };
    } catch (error) {
      state = { ...state, isLoading: false, error: error instanceof Error ? error.message : 'Registration failed' };
      notify();
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
    }
  },

  async logout() {
    await api.logout();
    state = { ...state, currentRole: null, user: null, donorProfile: null, shelterProfile: null, donorName: '', donorType: '', shelterName: '', shelterCategory: '' };
    notify();
  },

  setDonorSession: (name: string, donorType: string) => {
    state = { ...state, donorName: name, donorType, currentRole: 'donor' };
    notify();
  },

  setShelterSession: (name: string, category: string) => {
    state = { ...state, shelterName: name, shelterCategory: category, currentRole: 'shelter' };
    notify();
  },

  addDonation: (donation: ActiveDonation) => {
    state = { ...state, activeDonations: [donation, ...state.activeDonations] };
    notify();
  },

  addRequest: (request: ActiveRequest) => {
    state = { ...state, activeRequests: [request, ...state.activeRequests] };
    notify();
  },

  updateDonationStatus: (
    donationId: string,
    status: ActiveDonation['status'],
    extra?: Partial<ActiveDonation>
  ) => {
    state = {
      ...state,
      activeDonations: state.activeDonations.map((d) =>
        d.id === donationId ? { ...d, status, ...extra } : d
      ),
    };
    notify();
  },
};

/** Hook to subscribe to store state in a React component */
import { useEffect, useReducer } from 'react';
export function useAppStore() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const unsubscribe = appStore.subscribe(forceUpdate);
    return () => unsubscribe();
  }, []);
  return appStore.getState();
}