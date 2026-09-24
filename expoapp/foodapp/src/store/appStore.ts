/**
 * appStore.ts – Lightweight module-level reactive store shared across screens.
 * Stores who is logged in (donor / shelter / neither) and a shared feed of
 * active donations (from donor) and active food requests (from shelter).
 * Screens subscribe via a simple listener pattern.
 */

export type UserRole = 'donor' | 'shelter' | null;

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
  donorName: string;
  donorType: string;
  shelterName: string;
  shelterCategory: string;
  activeDonations: ActiveDonation[];
  activeRequests: ActiveRequest[];
}

// Initial seed data so cross-views show something immediately
const initialState: AppState = {
  currentRole: null,
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
};

let state: AppState = { ...initialState };
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const appStore = {
  getState: (): AppState => state,

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setRole: (role: UserRole) => {
    state = { ...state, currentRole: role };
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

  logout: () => {
    state = { ...state, currentRole: null, donorName: '', shelterName: '' };
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
};

/** Hook to subscribe to store state in a React component */
import { useEffect, useReducer } from 'react';
export function useAppStore() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    return appStore.subscribe(forceUpdate);
  }, []);
  return appStore.getState();
}
