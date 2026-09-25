import React, { useState, useEffect } from 'react';
import { appStore, useAppStore } from '@/store/appStore';
import { api } from '@/api/client';
import {
  ArrowRight,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Heart,
  HeartHandshake,
  Home,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Recycle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Utensils,
  X,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { AppColors, AppRadius, AppShadows, AppSpacing } from '@/constants/theme';

// Clean category pill options for NGO identity
const ngoCategories = [
  'Community Shelter',
  'Orphanage Home',
  'Senior Care',
  'Food Bank',
  'Relief Center',
];

// Mock Nearby Available Surplus (From Restaurants/Messes)
const nearbySurplusFeed = [
  {
    id: 'surplus_1',
    restaurantName: 'Olive & Grain Bistro',
    title: 'Veg Meals, Dal Makhani & 40 Rotis',
    quantity: 'Serves ~35 people (15 KG)',
    distance: '1.2 km away',
    preparedAt: 'Today at 1:30 PM (1 hr ago)',
    shelfLife: 'Best within 4 hours (by 6:30 PM)',
    dietTag: 'Veg',
    photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    fallbackDataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%2318352b"/><circle cx="300" cy="200" r="130" fill="%23244a3d"/><circle cx="230" cy="180" r="60" fill="%23dd835d"/><circle cx="350" cy="170" r="55" fill="%237ea441"/><circle cx="300" cy="260" r="55" fill="%23e6f0c9"/><text x="300" y="365" font-family="sans-serif" font-size="22" font-weight="bold" fill="%23d7ee85" text-anchor="middle">🌱 Fresh Veg Meals %26 Rotis</text></svg>',
    address: '42 Commercial St, Indiranagar',
  },
  {
    id: 'surplus_2',
    restaurantName: 'Grand Banquet Caterers',
    title: 'Paneer Butter Masala, Pulao & Sweets',
    quantity: 'Serves ~80 people (30 KG)',
    distance: '2.4 km away',
    preparedAt: 'Today at 2:00 PM (30 mins ago)',
    shelfLife: 'Best within 5 hours (by 7:00 PM)',
    dietTag: 'Veg',
    photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    fallbackDataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%2318352b"/><rect x="150" y="120" width="300" height="160" rx="20" fill="%235c9686"/><text x="300" y="365" font-family="sans-serif" font-size="22" font-weight="bold" fill="%23d7ee85" text-anchor="middle">🍲 Catered Rice %26 Trays</text></svg>',
    address: 'Grand Palace Hall, Koramangala',
  },
];

// Initial Active Food Requests Posted by NGO
const initialNgoRequests = [
  {
    id: 'req_201',
    title: 'Need Dinner Meals for 50 Residents',
    peopleCount: '50 people',
    category: 'Cooked Meals',
    requiredBy: 'Required by 7:30 PM tonight',
    dietPreference: 'Pure Veg',
    deliveryMode: 'Volunteer Delivery Preferred',
    status: 'assigned', // matching | assigned | delivered
    driverName: 'Amara (Volunteer)',
    driverEta: '15 mins away',
    postedAgo: '30 mins ago',
  },
];

export default function ShelterScreen() {
  const insets = useSafeAreaInsets();

  // AUTH & ONBOARDING STATE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);

  // Auth Inputs
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile Inputs
  const [ngoName, setNgoName] = useState('');
  const [ngoCategory, setNgoCategory] = useState('Community Shelter');
  const [regId, setRegId] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Location & Capacity Inputs
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<string | null>(null);

  // DASHBOARD STATE
  const [activeTab, setActiveTab] = useState<'request' | 'claim_surplus' | 'my_requests'>('request');

  // Food Request Form State
  const [requestTitle, setRequestTitle] = useState('');
  const [peopleCount, setPeopleCount] = useState('50 people');
  const [requestCategory, setRequestCategory] = useState('Cooked Meals');
  const [dietPreference, setDietPreference] = useState<'Pure Veg' | 'Non-Veg Allowed' | 'Egg Allowed'>('Pure Veg');
  const [requiredByTime, setRequiredByTime] = useState('Required by 7:30 PM tonight');
  const [deliveryMode, setDeliveryMode] = useState<'Volunteer Driver' | 'Self Pickup'>('Volunteer Driver');
  const [specialNotes, setSpecialNotes] = useState('Mild spice preferred for elderly residents.');

  // Active Requests & Claim State
  const [requestsList, setRequestsList] = useState(initialNgoRequests);
  const [claimSuccessModal, setClaimSuccessModal] = useState(false);
  const [claimedSurplusName, setClaimedSurplusName] = useState('');
  const [requestSuccessModal, setRequestSuccessModal] = useState(false);

  // GPS Location Handler
  const handleDetectLiveLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsCoordinates('12.9716° N, 77.5946° E');
        setStreetAddress('Indiranagar 100ft Road');
        setCity('Bengaluru');
        setPincode('560038');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude.toFixed(4);
      const lng = location.coords.longitude.toFixed(4);
      setGpsCoordinates(`${lat}° N, ${lng}° E`);

      const [reverseGeocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode) {
        if (reverseGeocode.street || reverseGeocode.name) {
          setStreetAddress(`${reverseGeocode.name || ''} ${reverseGeocode.street || ''}`.trim());
        }
        if (reverseGeocode.city) setCity(reverseGeocode.city);
        if (reverseGeocode.postalCode) setPincode(reverseGeocode.postalCode);
      }
    } catch (err) {
      setGpsCoordinates('12.9716° N, 77.5946° E');
      setStreetAddress('88 Shelter Road, Near City Park');
      setCity('Bengaluru');
      setPincode('560038');
    } finally {
      setIsLocating(false);
    }
  };

  // Sign In Direct Handler
  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please enter email and password');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const result = await appStore.login(authEmail, authPassword);
      if (result.success) {
        setIsAuthenticated(true);
        setActiveTab('request');
      } else {
        setAuthError(result.error || 'Sign in failed');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Finish Onboarding Registration Handler
  const handleFinishOnboarding = async () => {
    // Validate required fields
    if (!ngoName.trim()) {
      setAuthError('Please enter your NGO/shelter name');
      return;
    }
    if (!contactPerson.trim()) {
      setAuthError('Please enter contact person name');
      return;
    }
    if (!contactPhone.trim()) {
      setAuthError('Please enter a phone number');
      return;
    }
    if (!authEmail.trim()) {
      setAuthError('Please enter an email address');
      return;
    }
    if (!authPassword.trim()) {
      setAuthError('Please enter a password');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    if (!streetAddress.trim()) {
      setAuthError('Please enter your street address');
      return;
    }
    if (!city.trim()) {
      setAuthError('Please enter your city');
      return;
    }
    if (!pincode.trim()) {
      setAuthError('Please enter your pincode');
      return;
    }
    if (!gpsCoordinates) {
      setAuthError('Please detect your GPS location first');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      // Parse GPS coordinates
      const latLng = gpsCoordinates.split(', ');
      const latitude = parseFloat(latLng[0].replace('° N', ''));
      const longitude = parseFloat(latLng[1].replace('° E', ''));

      // 1. Register user
      const registerResult = await appStore.register({
        email: authEmail,
        password: authPassword,
        name: contactPerson,
        phone: contactPhone,
        role: 'SHELTER',
      });

      if (!registerResult.success) {
        setAuthError(registerResult.error || 'Registration failed');
        setIsAuthLoading(false);
        return;
      }

      // 2. Create shelter profile using api client
      await api.request('/shelters/profile', {
        method: 'POST',
        requiresAuth: true,
        body: JSON.stringify({
          ngo_name: ngoName,
          address: streetAddress,
          lat: latitude,
          lng: longitude,
          area_zone: city, // using city as area_zone
          avg_daily_beneficiaries: parseInt(maxCapacity.replace(/\D/g, '')) || 100,
        }),
      });

      // Success
      setIsAuthenticated(true);
      setActiveTab('request');
      setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Setup failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Submit Food Requirement Request
  const handlePostRequest = () => {
    if (!requestTitle.trim()) {
      alert('Please enter a request title (e.g. Need dinner meals for 50 people).');
      return;
    }

    const newRequest = {
      id: `req_${Date.now()}`,
      title: requestTitle,
      peopleCount: peopleCount || '50 people',
      category: requestCategory,
      requiredBy: requiredByTime || 'By 7:30 PM',
      dietPreference: dietPreference,
      deliveryMode: deliveryMode === 'Volunteer Driver' ? 'Volunteer Delivery Preferred' : 'NGO Self-Pickup',
      status: 'matching',
      driverName: '',
      driverEta: '',
      postedAgo: 'Just now',
    };

    setRequestsList([newRequest, ...requestsList]);
    setRequestSuccessModal(true);
    setRequestTitle('');
  };

  // Claim Live Surplus Item
  const handleClaimSurplus = (itemTitle: string) => {
    setClaimedSurplusName(itemTitle);
    setClaimSuccessModal(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Brand Header */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Recycle size={18} color="#18352b" strokeWidth={2.6} />
            </View>
            <View>
              <Text style={styles.brandText}>
                spoonful<Text style={styles.brandDot}>.</Text>
              </Text>
              <Text style={styles.headerSubtitle}>NGO & Shelter Portal</Text>
            </View>

            {isAuthenticated && (
              <TouchableOpacity
                style={styles.logoutChip}
                onPress={() => setIsAuthenticated(false)}>
                <LogOut size={13} color="#18352b" />
                <Text style={styles.logoutChipText}>Sign Out</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* AUTHENTICATION & FIRST-TIME ONBOARDING FLOW */}
        {!isAuthenticated ? (
          <View style={styles.authWrapper}>

            {/* Auth Switcher Pills */}
            <View style={styles.authPillsRow}>
              <TouchableOpacity
                style={[styles.authPill, authMode === 'signin' && styles.authPillActive]}
                onPress={() => setAuthMode('signin')}>
                <Lock size={14} color={authMode === 'signin' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.authPillText, authMode === 'signin' && styles.authPillTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authPill, authMode === 'register' && styles.authPillActive]}
                onPress={() => {
                  setAuthMode('register');
                  setOnboardingStep(1);
                }}>
                <Sparkles size={14} color={authMode === 'register' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.authPillText, authMode === 'register' && styles.authPillTextActive]}>
                  Register New NGO
                </Text>
              </TouchableOpacity>
            </View>

            {/* MODE A: SIGN IN */}
            {authMode === 'signin' && (
              <View style={styles.authCard}>
                <View style={styles.cardHeaderRow}>
                  <Building2 size={22} color="#18352b" />
                  <Text style={styles.authCardTitle}>NGO Login</Text>
                </View>
                <Text style={styles.authCardSub}>
                  Sign in to request food surplus and track active deliveries for your shelter.
                </Text>

                {authError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>NGO EMAIL ADDRESS</Text>
                <View style={styles.inputIconWrapper}>
                  <Mail size={16} color={AppColors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputFieldWithIcon}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    placeholder="contact@shelter.org"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={AppColors.textMuted}
                  />
                </View>

                <Text style={styles.inputLabel}>PASSWORD</Text>
                <View style={styles.inputIconWrapper}>
                  <Lock size={16} color={AppColors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputFieldWithIcon}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor={AppColors.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  onPress={handleSignIn}>
                  <Text style={styles.primaryBtnText}>Sign In & Open Portal</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 8 }}
                  onPress={() => {
                    setAuthMode('register');
                    setOnboardingStep(1);
                  }}>
                  <Text style={styles.switchAuthText}>
                    New Shelter or NGO? <Text style={{ fontWeight: '800', color: '#18352b' }}>Register Here</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MODE B: SHORT 2-STEP REGISTRATION ONBOARDING */}
            {authMode === 'register' && (
              <View style={styles.onboardingContainer}>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={styles.progressStepText}>
                      NGO ONBOARDING STEP {onboardingStep} OF 2
                    </Text>
                    <Text style={styles.progressPercentText}>
                      {onboardingStep === 1 ? '50%' : '100%'}
                    </Text>
                  </View>
                  <View style={styles.trackBar}>
                    <View
                      style={[
                        styles.fillBar,
                        { width: onboardingStep === 1 ? '50%' : '100%' },
                      ]}
                    />
                  </View>
                </View>

                {/* STEP 1: IDENTITY & CATEGORY */}
                {onboardingStep === 1 && (
                  <View style={styles.authCard}>
                    <View style={styles.cardHeaderRow}>
                      <HeartHandshake size={22} color="#9fbd42" />
                      <Text style={styles.authCardTitle}>1. Organization Details</Text>
                    </View>
                    <Text style={styles.authCardSub}>
                      Set up your shelter name and type so nearby donors can match food surplus accurately.
                    </Text>

                    {authError && (
                      <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{authError}</Text>
                      </View>
                    )}

                    <Text style={styles.inputLabel}>NGO / SHELTER NAME *</Text>
                    <TextInput
                      style={styles.inputField}
                      value={ngoName}
                      onChangeText={setNgoName}
                      placeholder="e.g. Harbor House Shelter & Kitchen"
                      placeholderTextColor={AppColors.textMuted}
                    />

                    <Text style={styles.inputLabel}>ORGANIZATION TYPE *</Text>
                    <View style={styles.categoryChipsRow}>
                      {ngoCategories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.chipBtn,
                            ngoCategory === cat && styles.chipBtnActive,
                          ]}
                          onPress={() => setNgoCategory(cat)}>
                          <Text
                            style={[
                              styles.chipText,
                              ngoCategory === cat && styles.chipTextActive,
                            ]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>GOVT REGISTRATION / 80G ID (OPTIONAL)</Text>
                    <TextInput
                      style={styles.inputField}
                      value={regId}
                      onChangeText={setRegId}
                      placeholder="e.g. NGO-80G-98421"
                      placeholderTextColor={AppColors.textMuted}
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CONTACT PERSON</Text>
                        <TextInput
                          style={styles.inputField}
                          value={contactPerson}
                          onChangeText={setContactPerson}
                          placeholder="e.g. Sister Mary"
                          placeholderTextColor={AppColors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                        <TextInput
                          style={styles.inputField}
                          value={contactPhone}
                          onChangeText={setContactPhone}
                          placeholder="+91 98123 45678"
                          keyboardType="phone-pad"
                          placeholderTextColor={AppColors.textMuted}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>NGO EMAIL ADDRESS *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={authEmail}
                          onChangeText={setAuthEmail}
                          placeholder="contact@shelter.org"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholderTextColor={AppColors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>PASSWORD *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={authPassword}
                          onChangeText={setAuthPassword}
                          placeholder="Create a password"
                          secureTextEntry
                          placeholderTextColor={AppColors.textMuted}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      activeOpacity={0.85}
                      onPress={() => setOnboardingStep(2)}>
                      <Text style={styles.primaryBtnText}>Next: Location & Capacity </Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 2: LOCATION & CAPACITY */}
                {onboardingStep === 2 && (
                  <View style={styles.authCard}>
                    <View style={styles.cardHeaderRow}>
                      <MapPin size={22} color="#18352b" />
                      <Text style={styles.authCardTitle}>2. Delivery Location & Capacity</Text>
                    </View>
                    <Text style={styles.authCardSub}>
                      Detect your live location so delivery drivers can navigate to your door.
                    </Text>

                    {/* GPS Location Detector Button */}
                    <TouchableOpacity
                      style={styles.detectGpsBtn}
                      activeOpacity={0.8}
                      onPress={handleDetectLiveLocation}
                      disabled={isLocating}>
                      {isLocating ? (
                        <ActivityIndicator color="#18352b" size="small" />
                      ) : (
                        <Navigation size={18} color="#18352b" />
                      )}
                      <Text style={styles.detectGpsBtnText}>
                        {isLocating ? 'Detecting Live GPS...' : '📍 Detect My Live GPS Location'}
                      </Text>
                    </TouchableOpacity>

                    {gpsCoordinates && (
                      <View style={styles.gpsFixedBadge}>
                        <Compass size={14} color="#7ea441" />
                        <Text style={styles.gpsFixedText}>
                          GPS Locked: <Text style={{ fontWeight: '800' }}>{gpsCoordinates}</Text>
                        </Text>
                      </View>
                    )}

                    <Text style={styles.inputLabel}>DELIVERY STREET ADDRESS *</Text>
                    <TextInput
                      style={styles.inputField}
                      value={streetAddress}
                      onChangeText={setStreetAddress}
                      placeholder="e.g. 88 Shelter Road, Near City Park"
                      placeholderTextColor={AppColors.textMuted}
                    />

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>CITY *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={city}
                          onChangeText={setCity}
                          placeholder="Bengaluru"
                          placeholderTextColor={AppColors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>PINCODE *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={pincode}
                          onChangeText={setPincode}
                          placeholder="560038"
                          keyboardType="numeric"
                          placeholderTextColor={AppColors.textMuted}
                        />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>MAX DAILY MEAL CAPACITY</Text>
                    <TextInput
                      style={styles.inputField}
                      value={maxCapacity}
                      onChangeText={setMaxCapacity}
                      placeholder="e.g. 100 meals / day"
                      placeholderTextColor={AppColors.textMuted}
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => setOnboardingStep(1)}>
                        <Text style={styles.backBtnText}>Back</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.primaryBtn, { flex: 2 }]}
                        activeOpacity={0.85}
                        onPress={handleFinishOnboarding}>
                        <Text style={styles.primaryBtnText}>Complete Setup & Unlock</Text>
                        <Check size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </View>
            )}

          </View>
        ) : (
          /* UNLOCKED MAIN NGO PORTAL */
          <View>
            
            {/* Active Profile Summary Bar */}
            <View style={styles.activeProfileBar}>
              <View style={styles.activeDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeProfileName}>
                  {ngoName} <Text style={styles.activeProfileBadge}>({ngoCategory})</Text>
                </Text>
                <Text style={styles.activeProfileLoc} numberOfLines={1}>
                  📍 {streetAddress}, {city} • Capacity: {maxCapacity}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsAuthenticated(false);
                  setAuthMode('signin');
                }}>
                <Text style={styles.editProfileText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Switcher Pills */}
            <View style={styles.tabPillsRow}>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'request' && styles.tabPillActive]}
                onPress={() => setActiveTab('request')}>
                <Plus size={15} color={activeTab === 'request' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.tabPillText, activeTab === 'request' && styles.tabPillTextActive]}>
                  Request Food
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'claim_surplus' && styles.tabPillActive]}
                onPress={() => setActiveTab('claim_surplus')}>
                <Utensils size={15} color={activeTab === 'claim_surplus' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.tabPillText, activeTab === 'claim_surplus' && styles.tabPillTextActive]}>
                  Live Surplus ({nearbySurplusFeed.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'my_requests' && styles.tabPillActive]}
                onPress={() => setActiveTab('my_requests')}>
                <Clock size={15} color={activeTab === 'my_requests' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.tabPillText, activeTab === 'my_requests' && styles.tabPillTextActive]}>
                  Requests ({requestsList.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: POST FOOD REQUIREMENT REQUEST FORM */}
            {activeTab === 'request' && (
              <View style={styles.cardContainer}>
                
                <View style={styles.formHeaderCard}>
                  <View style={styles.badgePill}>
                    <Sparkles size={13} color="#18352b" />
                    <Text style={styles.badgePillText}>POST FOOD REQUIREMENT</Text>
                  </View>
                  <Text style={styles.formTitle}>Request food for your shelter residents</Text>
                  <Text style={styles.formSub}>
                    Broadcast your food needs to nearby commercial kitchens, messes, and caterers.
                  </Text>
                </View>

                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Utensils size={18} color="#18352b" />
                    <Text style={styles.sectionBoxTitle}>1. Request Details</Text>
                  </View>

                  <Text style={styles.inputLabel}>REQUEST TITLE / NEED DESCRIPTION *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={requestTitle}
                    onChangeText={setRequestTitle}
                    placeholder="e.g. Need dinner meals for 50 residents"
                    placeholderTextColor={AppColors.textMuted}
                  />

                  <Text style={styles.inputLabel}>NUMBER OF PEOPLE / SERVINGS NEEDED *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={peopleCount}
                    onChangeText={setPeopleCount}
                    placeholder="e.g. 50 people or 100 meals"
                    placeholderTextColor={AppColors.textMuted}
                  />

                  <Text style={styles.inputLabel}>TYPE OF FOOD NEEDED</Text>
                  <View style={styles.categoryChipsRow}>
                    {['Cooked Meals', 'Raw Groceries', 'Bakery Items', 'Packaged Snacks', 'Dairy & Milk'].map(
                      (cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.chipBtn,
                            requestCategory === cat && styles.chipBtnActive,
                          ]}
                          onPress={() => setRequestCategory(cat)}>
                          <Text
                            style={[
                              styles.chipText,
                              requestCategory === cat && styles.chipTextActive,
                            ]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  <Text style={styles.inputLabel}>DIETARY PREFERENCE</Text>
                  <View style={styles.dietRow}>
                    {(['Pure Veg', 'Non-Veg Allowed', 'Egg Allowed'] as const).map((pref) => (
                      <TouchableOpacity
                        key={pref}
                        style={[
                          styles.dietChip,
                          dietPreference === pref && styles.dietChipActive,
                          pref === 'Pure Veg' && { backgroundColor: '#e6f0c9' },
                        ]}
                        onPress={() => setDietPreference(pref)}>
                        <Text style={[styles.dietChipText, dietPreference === pref && { fontWeight: '800' }]}>
                          {pref === 'Pure Veg' ? '🌱 Pure Veg' : pref === 'Non-Veg Allowed' ? '🍖 Non-Veg Allowed' : '🥚 Egg Allowed'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Clock size={18} color="#18352b" />
                    <Text style={styles.sectionBoxTitle}>2. Time Window & Delivery</Text>
                  </View>

                  <Text style={styles.inputLabel}>REQUIRED BY / DEADLINE TIME *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={requiredByTime}
                    onChangeText={setRequiredByTime}
                    placeholder="e.g. Required by 7:30 PM tonight for dinner"
                    placeholderTextColor={AppColors.textMuted}
                  />

                  <Text style={styles.inputLabel}>PREFERRED DELIVERY MODE</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(['Volunteer Driver', 'Self Pickup'] as const).map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.chipBtn,
                          { flex: 1, alignItems: 'center' },
                          deliveryMode === mode && styles.chipBtnActive,
                        ]}
                        onPress={() => setDeliveryMode(mode)}>
                        <Text style={[styles.chipText, deliveryMode === mode && styles.chipTextActive]}>
                          {mode === 'Volunteer Driver' ? '🚚 Volunteer Delivery' : '🚲 NGO Self-Pickup'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>SPECIAL DIETARY / STORAGE NOTES</Text>
                  <TextInput
                    style={[styles.inputField, { height: 70 }]}
                    value={specialNotes}
                    onChangeText={setSpecialNotes}
                    multiline
                    placeholder="e.g. Mild spice preferred for elderly residents. Separate curry containers."
                    placeholderTextColor={AppColors.textMuted}
                  />
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  style={styles.postSubmitBtn}
                  activeOpacity={0.85}
                  onPress={handlePostRequest}>
                  <Text style={styles.postSubmitBtnText}>Broadcast Food Requirement Request</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>

              </View>
            )}

            {/* TAB 2: LIVE SURPLUS FEED (CLAIM FOOD) */}
            {activeTab === 'claim_surplus' && (
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Utensils size={20} color="#18352b" />
                  <Text style={styles.formTitle}>Available Nearby Surplus Food</Text>
                </View>
                <Text style={styles.formSub}>
                  Live food surplus posted by nearby kitchens ready for instant pickup or delivery.
                </Text>

                {nearbySurplusFeed.map((item) => (
                  <View key={item.id} style={styles.surplusCard}>
                    <Image
                      source={{ uri: item.photoUrl }}
                      placeholder={{ uri: item.fallbackDataUri }}
                      style={styles.surplusPhoto}
                      contentFit="cover"
                      transition={150}
                    />
                    <View style={styles.surplusContent}>
                      <View style={styles.surplusTopRow}>
                        <Text style={styles.restName}>{item.restaurantName}</Text>
                        <Text style={styles.distBadge}>📍 {item.distance}</Text>
                      </View>

                      <Text style={styles.surplusTitle}>{item.title}</Text>

                      <View style={styles.surplusMetaBox}>
                        <Text style={styles.surplusMetaText}>
                          <Text style={{ fontWeight: '800' }}>Quantity:</Text> {item.quantity}
                        </Text>
                        <Text style={styles.surplusMetaText}>
                          <Text style={{ fontWeight: '800' }}>Prepared:</Text> {item.preparedAt}
                        </Text>
                        <Text style={styles.surplusMetaText}>
                          <Text style={{ fontWeight: '800' }}>Shelf Life:</Text> {item.shelfLife}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.claimBtn}
                        activeOpacity={0.85}
                        onPress={() => handleClaimSurplus(item.title)}>
                        <Text style={styles.claimBtnText}>Claim This Surplus Food</Text>
                        <ArrowRight size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* TAB 3: ACTIVE REQUESTS LIST */}
            {activeTab === 'my_requests' && (
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Clock size={20} color="#18352b" />
                  <Text style={styles.formTitle}>Active NGO Requests</Text>
                </View>
                <Text style={styles.formSub}>Status of food requests posted by {ngoName}.</Text>

                {requestsList.map((item) => (
                  <View key={item.id} style={styles.donationCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.donationItemTitle}>{item.title}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.category}</Text>
                      </View>
                    </View>

                    <Text style={styles.donationSubText}>
                      Needed for <Text style={{ fontWeight: '700', color: '#18352b' }}>{item.peopleCount}</Text> • {item.dietPreference}
                    </Text>

                    <View style={styles.donationDetailsBox}>
                      <View style={styles.detailRow}>
                        <Clock size={14} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                          <Text style={{ fontWeight: '700' }}>Deadline:</Text> {item.requiredBy}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Truck size={14} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                          <Text style={{ fontWeight: '700' }}>Mode:</Text> {item.deliveryMode}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statusFooter}>
                      {item.status === 'matching' ? (
                        <View style={styles.statusPillYellow}>
                          <RefreshCw size={14} color="#dd835d" />
                          <Text style={styles.statusPillYellowText}>
                            Matching Nearby Kitchens & Messes...
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.statusPillGreen}>
                          <Bike size={14} color="#7da750" />
                          <Text style={styles.statusPillGreenText}>
                            Matched! {item.driverName} ({item.driverEta})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

          </View>
        )}

      </ScrollView>

      {/* CLAIM SUCCESS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={claimSuccessModal}
        onRequestClose={() => setClaimSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#ffffff" />
            </View>
            <Text style={styles.successModalTitle}>Surplus Food Claimed!</Text>
            <Text style={styles.successModalSub}>
              You have successfully claimed <Text style={{ fontWeight: 'bold' }}>{claimedSurplusName}</Text>. The restaurant and volunteer driver have been notified for pickup.
            </Text>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setClaimSuccessModal(false)}>
              <Text style={styles.modalDoneBtnText}>Great, Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REQUEST SUCCESS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={requestSuccessModal}
        onRequestClose={() => setRequestSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#ffffff" />
            </View>
            <Text style={styles.successModalTitle}>Request Broadcasted!</Text>
            <Text style={styles.successModalSub}>
              Your food requirement has been broadcast to nearby restaurants and kitchens within 5 km.
            </Text>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => {
                setRequestSuccessModal(false);
                setActiveTab('my_requests');
              }}>
              <Text style={styles.modalDoneBtnText}>Track Active Requests</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f2eb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: AppSpacing.lg,
  },

  /* Header */
  topHeader: {
    marginBottom: AppSpacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#d7ee85',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '4px 5px 10px #bdc5bb',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18352b',
    letterSpacing: -0.8,
  },
  brandDot: {
    color: '#9fbd42',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6c7b73',
    fontWeight: '600',
  },
  logoutChip: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#faf9f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  logoutChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#18352b',
  },

  /* Auth & Onboarding Wrapper */
  authWrapper: {
    gap: 14,
  },
  authPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  authPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: AppRadius.pill,
    backgroundColor: '#f7f7f2',
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  authPillActive: {
    backgroundColor: '#18352b',
    borderColor: '#18352b',
  },
  authPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6c7b73',
  },
  authPillTextActive: {
    color: '#ffffff',
  },

  authCard: {
    backgroundColor: '#f7f7f2',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    borderWidth: 1,
    borderColor: '#dce2d8',
    gap: 12,
    boxShadow: '6px 6px 14px rgba(48,69,58,.11)',
  },
  errorBanner: {
    backgroundColor: '#ffe6e6',
    borderWidth: 1,
    borderColor: '#ffcccc',
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c0392b',
    textAlign: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#18352b',
  },
  authCardSub: {
    fontSize: 13,
    color: '#6c7b73',
    lineHeight: 19,
    marginBottom: 4,
  },

  inputIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
  },
  inputFieldWithIcon: {
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
    borderRadius: AppRadius.md,
    paddingLeft: 42,
    paddingRight: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#18352b',
  },
  switchAuthText: {
    fontSize: 13,
    color: '#6c7b73',
  },

  /* Onboarding Progress */
  onboardingContainer: {
    gap: 14,
  },
  progressContainer: {
    backgroundColor: '#f7f7f2',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce2d8',
    gap: 8,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStepText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#18352b',
    letterSpacing: 1,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9fbd42',
  },
  trackBar: {
    height: 6,
    backgroundColor: '#dce2d8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    backgroundColor: '#18352b',
    borderRadius: 3,
  },

  /* GPS Location Detector */
  detectGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d7ee85',
    paddingVertical: 14,
    borderRadius: AppRadius.pill,
    marginVertical: 4,
  },
  detectGpsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#18352b',
  },
  gpsFixedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e6f0c9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
  },
  gpsFixedText: {
    fontSize: 11,
    color: '#18352b',
  },

  backBtn: {
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
    borderRadius: AppRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6c7b73',
  },

  /* Active Profile Summary Bar */
  activeProfileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e7eddc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d5dec9',
    marginBottom: 16,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#91bc48',
  },
  activeProfileName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18352b',
  },
  activeProfileBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c7b73',
  },
  activeProfileLoc: {
    fontSize: 11,
    color: '#6c7b73',
    marginTop: 2,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#18352b',
    textDecorationLine: 'underline',
  },

  /* Tab Switcher */
  tabPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: AppSpacing.lg,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: AppRadius.pill,
    backgroundColor: '#f7f7f2',
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  tabPillActive: {
    backgroundColor: '#18352b',
    borderColor: '#18352b',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6c7b73',
  },
  tabPillTextActive: {
    color: '#ffffff',
  },

  /* Forms & Cards */
  cardContainer: {
    gap: AppSpacing.lg,
  },
  formHeaderCard: {
    backgroundColor: '#f7f7f2',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#d7ee85',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppRadius.pill,
    marginBottom: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#18352b',
    letterSpacing: 0.8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18352b',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    color: '#6c7b73',
  },

  sectionBox: {
    backgroundColor: '#f7f7f2',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    borderWidth: 1,
    borderColor: '#dce2d8',
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18352b',
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6c7b73',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  inputField: {
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
    borderRadius: AppRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#18352b',
  },

  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  chipBtnActive: {
    backgroundColor: '#d7ee85',
    borderColor: '#d7ee85',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c7b73',
  },
  chipTextActive: {
    color: '#18352b',
    fontWeight: '800',
  },
  dietRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dietChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  dietChipActive: {
    borderColor: '#18352b',
    borderWidth: 2,
  },
  dietChipText: {
    fontSize: 11,
    color: '#18352b',
  },

  primaryBtn: {
    backgroundColor: '#18352b',
    borderRadius: AppRadius.pill,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  postSubmitBtn: {
    backgroundColor: '#18352b',
    borderRadius: AppRadius.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  postSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },

  /* Surplus Feed */
  surplusCard: {
    backgroundColor: '#f7f7f2',
    borderRadius: AppRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  surplusPhoto: {
    width: '100%',
    height: 150,
  },
  surplusContent: {
    padding: 16,
    gap: 8,
  },
  surplusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9fbd42',
    textTransform: 'uppercase',
  },
  distBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6c7b73',
  },
  surplusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18352b',
  },
  surplusMetaBox: {
    backgroundColor: '#faf9f5',
    padding: 10,
    borderRadius: 12,
    gap: 4,
  },
  surplusMetaText: {
    fontSize: 12,
    color: '#6c7b73',
  },
  claimBtn: {
    backgroundColor: '#18352b',
    borderRadius: AppRadius.pill,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  claimBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },

  /* My Requests */
  donationCard: {
    backgroundColor: '#f7f7f2',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: '#dce2d8',
    gap: 12,
  },
  categoryBadge: {
    backgroundColor: '#dcece9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AppRadius.xs,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5c9686',
  },
  donationItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18352b',
  },
  donationSubText: {
    fontSize: 12,
    color: '#6c7b73',
  },
  donationDetailsBox: {
    backgroundColor: '#faf9f5',
    borderRadius: AppRadius.md,
    padding: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6c7b73',
  },
  statusFooter: {
    marginTop: 4,
  },
  statusPillYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9ddcb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
  },
  statusPillYellowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dd835d',
  },
  statusPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e6f0c9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
  },
  statusPillGreenText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7da750',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 53, 43, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#faf9f5',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    alignItems: 'center',
    gap: 14,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#91bc48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18352b',
  },
  successModalSub: {
    fontSize: 13,
    color: '#6c7b73',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalDoneBtn: {
    backgroundColor: '#18352b',
    borderRadius: AppRadius.pill,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  modalDoneBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
