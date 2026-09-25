import React, { useState, useEffect } from 'react';
import { appStore, useAppStore } from '@/store/appStore';
import { api, type FoodVisionItem } from '@/api/client';
import { FoodVisionResult } from '@/components/food-vision-result';
import {
  ArrowRight,
  Bike,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  HeartHandshake,
  Image as ImageIcon,
  MapPin,
  Minus,
  Navigation,
  Package,
  Plus,
  Recycle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  User,
  Users,
  Utensils,
  X,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from 'expo-image-picker';

import { AppColors, AppRadius, AppShadows, AppSpacing } from '@/constants/theme';
import LiveDeliveryMap from '@/components/live-delivery-map';

// 5 Main Donor Types
const donorTypes = [
  {
    id: 'restaurant',
    label: 'Restaurant / Cafe',
    icon: Utensils,
    desc: 'Bistros, cafes, bakeries & fine dining',
    color: '#18352b',
    bgColor: '#e6f0c9',
  },
  {
    id: 'grocery',
    label: 'Grocery Shop',
    icon: Store,
    desc: 'Supermarkets, marts & produce stores',
    color: '#5c9686',
    bgColor: '#dcece9',
  },
  {
    id: 'individual',
    label: 'Normal Person / Individual',
    icon: User,
    desc: 'Home cooks, family events, residents',
    color: '#7ea441',
    bgColor: '#e6f0c9',
  },
  {
    id: 'catering',
    label: 'Catering Service',
    icon: Package,
    desc: 'Event caterers, banquet kitchens',
    color: '#dd835d',
    bgColor: '#f9ddcb',
  },
  {
    id: 'mess',
    label: 'Mess / Hostel Kitchen',
    icon: Building2,
    desc: 'College mess, worker canteens',
    color: '#8871a4',
    bgColor: '#e6e0ef',
  },
];

// Default Restaurant Menu Items for Quick Multi-Item Surplus Selection
const initialMenuItems = [
  { id: 'm1', name: 'Dal Makhani Container', unit: 'KG', defaultQty: 0 },
  { id: 'm2', name: 'Butter Tandoori Roti', unit: 'Pcs', defaultQty: 0 },
  { id: 'm3', name: 'Paneer Butter Masala Tray', unit: 'Servings', defaultQty: 0 },
  { id: 'm4', name: 'Jeera Rice Container', unit: 'KG', defaultQty: 0 },
  { id: 'm5', name: 'Fresh Sandwich / Pastry Box', unit: 'Boxes', defaultQty: 0 },
  { id: 'm6', name: 'Gulab Jamun / Sweet Box', unit: 'Pcs', defaultQty: 0 },
];

// Initial Active Donations List
const initialActiveDonations = [
  {
    id: 'don_101',
    title: 'Veg Biryani & 30 Rotis',
    donorType: 'Restaurant',
    category: 'Cooked Meals',
    preparedAt: 'Today at 1:30 PM',
    quantity: 'Serves ~30 people (12 KG)',
    shelfLife: 'Best within 4 hours (by 6:30 PM)',
    address: 'Taste of Punjab, 42 Commercial St, Indiranagar',
    status: 'matching', // matching | assigned | picked | delivered
    photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    vegTag: 'Veg',
    postedAgo: '15 mins ago',
  },
];

export default function FoodDonorScreen() {
  const insets = useSafeAreaInsets();
  
  // Navigation & Onboarding State
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'donate' | 'menu_basket' | 'my_donations' | 'ngo_demands'>('donate');

  // Shared store (cross-screen visibility)
  const storeState = useAppStore();

  // Profile State
  const [donorName, setDonorName] = useState('Royal Spice Kitchen');
  const [selectedDonorType, setSelectedDonorType] = useState('restaurant');
  const [contactPerson, setContactPerson] = useState('Rahul Sharma');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Location & Address State
  const [streetAddress, setStreetAddress] = useState('42 Commercial Street, Indiranagar');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560038');
  const [pickupWindow, setPickupWindow] = useState<string>('Lunch (12–2 PM)');
  const [pickupDropdownVisible, setPickupDropdownVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<string | null>(null);

  // Photo & Camera State
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Food Vision (AI Detection) State
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [visionResult, setVisionResult] = useState<FoodVisionItem | null>(null);
  const [visionModalVisible, setVisionModalVisible] = useState(false);

  // Single Item Donation Form State
  const [foodTitle, setFoodTitle] = useState('');
  const [foodCategory, setFoodCategory] = useState('Cooked Meals');
  const [preparedAt, setPreparedAt] = useState('Today at 2:00 PM (1 hr ago)');
  const [quantity, setQuantity] = useState('Serves 25 people (~10 KG)');
  const [shelfLife, setShelfLife] = useState('Best within 4 hours (by 7:00 PM)');
  const [vegTag, setVegTag] = useState<'Veg' | 'Non-Veg' | 'Egg'>('Veg');
  const [specialInstructions, setSpecialInstructions] = useState('Keep warm until pickup. Rear kitchen entrance.');

  // Multi-Item Menu Basket State ("Add to Cart" style)
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [cartQuantities, setCartQuantities] = useState<{ [key: string]: number }>({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Portions');

  // Active Listings State
  const [donationsList, setDonationsList] = useState(initialActiveDonations);
  const [postSuccessModal, setPostSuccessModal] = useState(false);

  // Live Location Detection Handler
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
      setStreetAddress('42 Commercial Street, Indiranagar');
      setCity('Bengaluru');
      setPincode('560038');
    } finally {
      setIsLocating(false);
    }
  };

  // Complete onboarding - register user and create donor profile
  const handleCompleteOnboarding = async () => {
    // Validate required fields
    if (!donorName.trim()) {
      setAuthError('Please enter your donor/shop name');
      return;
    }
    if (!contactPhone.trim()) {
      setAuthError('Please enter a phone number');
      return;
    }
    if (!email.trim()) {
      setAuthError('Please enter an email address');
      return;
    }
    if (!password) {
      setAuthError('Please enter a password');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
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

      // Parse pickup window
      const pickupMatch = pickupWindow.match(/(\d+)–(\d+)/);
      const pickupStart = pickupMatch ? pickupMatch[1] : '12';
      const pickupEnd = pickupMatch ? pickupMatch[2] : '14';

      // 1. Register user
      const registerResult = await appStore.register({
        email,
        password,
        name: contactPerson,
        phone: contactPhone,
        role: 'DONOR',
      });

      if (!registerResult.success) {
        setAuthError(registerResult.error || 'Registration failed');
        setIsAuthLoading(false);
        return;
      }

      // 2. Create donor profile using api client (has auth token)
      await api.request('/donors/profile', {
        method: 'POST',
        requiresAuth: true,
        body: JSON.stringify({
          business_name: donorName,
          business_type: selectedDonorType,
          address: streetAddress,
          city,
          pincode,
          latitude,
          longitude,
          pickup_window_start: `${pickupStart}:00`,
          pickup_window_end: `${pickupEnd}:00`,
        }),
      });

      // Success - store will be updated via appStore.register
      setIsOnboarded(true);
      setActiveTab('donate');
      setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Setup failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Camera & Gallery Image Picker Handler
  const handlePickImage = async (useCamera = false) => {
    try {
      let uri: string | null = null;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to capture food photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
        if (!result.canceled && result.assets[0].uri) {
          uri = result.assets[0].uri;
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });
        if (!result.canceled && result.assets[0].uri) {
          uri = result.assets[0].uri;
        }
      }

      if (uri) {
        setSelectedPhoto(uri);
        setVisionResult(null);
        await analyzeSelectedPhoto(uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not pick the image. Please try again.');
    }
  };

  // Run Gemini vision analysis on the picked food photo
  const analyzeSelectedPhoto = async (uri: string) => {
    setVisionAnalyzing(true);
    setVisionModalVisible(true);
    try {
      const res = await api.analyzeFoodImage(uri);
      setVisionResult(res.item);
    } catch (err) {
      setVisionResult(null);
      if (err instanceof Error) console.error('[vision] analysis failed:', err.message);
      Alert.alert(
        'Vision Analysis Failed',
        err instanceof Error ? err.message : 'Could not analyze the food photo.'
      );
    } finally {
      setVisionAnalyzing(false);
    }
  };

  // Apply accepted vision-detected food details into the donation form
  const handleApplyVisionResult = (item: FoodVisionItem) => {
    setVisionResult(item);
    setVisionModalVisible(false);
    setFoodTitle(item.title);
    setFoodCategory(item.category);
    setVegTag(item.dietary_tag);
    Alert.alert(
      'Food Details Detected',
      `"${item.title}" • ${item.category} • ${item.dietary_tag} has been filled in automatically. Review the form and publish.`
    );
  };

  // Multi-Item Menu Quantity Increment / Decrement
  const handleUpdateCartQty = (itemId: string, delta: number) => {
    const currentQty = cartQuantities[itemId] || 0;
    const newQty = Math.max(0, currentQty + delta);
    setCartQuantities({ ...cartQuantities, [itemId]: newQty });
  };

  // Add Custom Item to Menu
  const handleAddCustomMenuItem = () => {
    if (!newItemName.trim()) return;
    const newItem = {
      id: `m_${Date.now()}`,
      name: newItemName.trim(),
      unit: newItemUnit || 'Portions',
      defaultQty: 0,
    };
    setMenuItems([...menuItems, newItem]);
    setCartQuantities({ ...cartQuantities, [newItem.id]: 1 });
    setNewItemName('');
  };

  // Calculate Basket Totals
  const selectedCartItems = menuItems.filter((item) => (cartQuantities[item.id] || 0) > 0);
  const totalCartCount = selectedCartItems.reduce((sum, item) => sum + (cartQuantities[item.id] || 0), 0);

  // Publish Surplus Basket ("Add to Cart" Submit)
  const handlePublishCartBasket = () => {
    if (selectedCartItems.length === 0) {
      Alert.alert('Basket Empty', 'Please select at least 1 item from the menu.');
      return;
    }

    const itemsSummary = selectedCartItems
      .map((item) => `${cartQuantities[item.id]}x ${item.name}`)
      .join(', ');

    const newDonation = {
      id: `don_${Date.now()}`,
      title: `${selectedCartItems.length} Menu Items (${itemsSummary})`,
      donorType: donorTypes.find((t) => t.id === selectedDonorType)?.label || 'Restaurant',
      category: 'Multi-Item Surplus Basket',
      preparedAt: 'Freshly prepared today',
      quantity: `Total ${totalCartCount} portions/containers`,
      shelfLife: 'Best within 4 hours',
      address: `${streetAddress}, ${city}`,
      status: 'matching',
      photoUrl: selectedPhoto || '',
      vegTag: 'Veg' as const,
      postedAgo: 'Just now',
    };

    setDonationsList([newDonation, ...donationsList]);
    setPostSuccessModal(true);
    setCartQuantities({});
  };

  // Helper: auto-progress a donation through the delivery statuses
  const startDeliverySimulation = (donationId: string) => {
    const ngoRequest = appStore.getState().activeRequests[0];
    const driverName = ['Amara Singh', 'Ravi Patel', 'Priya Nair', 'Dev Kumar'][
      Math.floor(Math.random() * 4)
    ];

    // After 3s: NGO matches → assign rider
    setTimeout(() => {
      appStore.updateDonationStatus(donationId, 'assigned', {
        driverName,
        assignedNgoName: ngoRequest?.ngoName ?? 'Harbor House NGO',
        assignedNgoAddress: ngoRequest?.address ?? '88 Shelter Road, Bengaluru',
        assignedAt: Date.now(),
      });
      setDonationsList((prev) =>
        prev.map((d) =>
          d.id === donationId
            ? { ...d, status: 'assigned' as const, driverName }
            : d
        )
      );
    }, 3000);

    // After 12s: rider reaches donor → picked up
    setTimeout(() => {
      appStore.updateDonationStatus(donationId, 'picked');
      setDonationsList((prev) =>
        prev.map((d) => (d.id === donationId ? { ...d, status: 'picked' as const } : d))
      );
    }, 12000);

    // After 30s: rider reaches shelter → delivered
    setTimeout(() => {
      appStore.updateDonationStatus(donationId, 'delivered');
      setDonationsList((prev) =>
        prev.map((d) => (d.id === donationId ? { ...d, status: 'delivered' as const } : d))
      );
    }, 30000);
  };

  // Submit Single Donation Form
  const handlePostDonation = () => {
    if (!foodTitle.trim()) {
      alert('Please enter the food item title.');
      return;
    }

    const donationId = `don_${Date.now()}`;
    const newDonation = {
      id: donationId,
      title: foodTitle,
      donorName: donorName,
      donorType: donorTypes.find((t) => t.id === selectedDonorType)?.label || 'Donor',
      category: foodCategory,
      preparedAt: preparedAt || 'Just now',
      quantity: quantity || 'Serves 20 people',
      shelfLife: shelfLife || 'Consume within 4 hours',
      address: `${streetAddress}, ${city}`,
      status: 'matching' as const,
      photoUrl: selectedPhoto || '',
      vegTag: vegTag,
      postedAgo: 'Just now',
    };

    setDonationsList([newDonation, ...donationsList]);
    appStore.addDonation(newDonation);
    setPostSuccessModal(true);
    setFoodTitle('');
    setActiveTab('my_donations');

    // Kick off the automatic delivery simulation
    startDeliverySimulation(donationId);
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

        {/* Minimal Navigation Brand Header */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Recycle size={18} color="#18352b" strokeWidth={2.6} />
            </View>
            <View>
              <Text style={styles.brandText}>
                rescue<Text style={styles.brandDot}>.</Text>
              </Text>
              <Text style={styles.headerSubtitle}>Food Donor Hub</Text>
            </View>

            {isOnboarded && (
              <TouchableOpacity
                style={styles.profileChip}
                onPress={() => {
                  setIsOnboarded(false);
                  setOnboardingStep(1);
                }}>
                <Building2 size={13} color="#18352b" />
                <Text style={styles.profileChipText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* REDESIGNED SHORT 2-PAGE ONBOARDING (If not onboarded) */}
        {!isOnboarded ? (
          <View style={styles.onboardingWrapper}>
            
            {/* Step Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressStepText}>
                  SETUP STEP {onboardingStep} OF 2
                </Text>
                <Text style={styles.progressPercentText}>
                  {onboardingStep === 1 ? '50% Completed' : '100% Completed'}
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

            {/* PAGE 1: Donor Identity & Shop Type */}
            {onboardingStep === 1 && (
              <View style={styles.onboardingCard}>
                <View style={styles.cardHeroHeader}>
                  <Sparkles size={20} color="#9fbd42" />
                  <Text style={styles.onboardingHeroTitle}>Welcome to Rescue Donor Hub</Text>
                </View>
                <Text style={styles.onboardingHeroSub}>
                  Register your kitchen or shop once to connect surplus food with local shelters.
                </Text>

                {authError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>DONOR / SHOP NAME *</Text>
                <TextInput
                  style={styles.inputField}
                  value={donorName}
                  onChangeText={setDonorName}
                  placeholder="e.g. Royal Spice Bistro or Sharma Bakery"
                  placeholderTextColor={AppColors.textMuted}
                />

                <Text style={styles.inputLabel}>SELECT YOUR DONOR TYPE *</Text>
                <View style={styles.donorTypeGrid}>
                  {donorTypes.map((type) => {
                    const TypeIcon = type.icon;
                    const isSelected = selectedDonorType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.donorTypeCard,
                          isSelected && styles.donorTypeCardActive,
                        ]}
                        onPress={() => setSelectedDonorType(type.id)}>
                        <View style={[styles.donorTypeIcon, { backgroundColor: type.bgColor }]}>
                          <TypeIcon size={18} color={type.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.donorTypeLabel}>{type.label}</Text>
                          <Text style={styles.donorTypeDesc}>{type.desc}</Text>
                        </View>
                        {isSelected && <CheckCircle2 size={18} color="#18352b" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>CONTACT PERSON</Text>
                    <TextInput
                      style={styles.inputField}
                      value={contactPerson}
                      onChangeText={setContactPerson}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor={AppColors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                    <TextInput
                      style={styles.inputField}
                      value={contactPhone}
                      onChangeText={setContactPhone}
                      placeholder="+91 98765 43210"
                      keyboardType="phone-pad"
                      placeholderTextColor={AppColors.textMuted}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                    <TextInput
                      style={styles.inputField}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="owner@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={AppColors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>PASSWORD</Text>
                    <TextInput
                      style={styles.inputField}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Create a password"
                      secureTextEntry
                      placeholderTextColor={AppColors.textMuted}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 4 }}>
                  <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={styles.inputField}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    secureTextEntry
                    placeholderTextColor={AppColors.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  onPress={() => setOnboardingStep(2)}>
                  <Text style={styles.primaryBtnText}>Next: Location & Pickup Address</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {/* PAGE 2: Location & GPS Detection */}
            {onboardingStep === 2 && (
              <View style={styles.onboardingCard}>
                <View style={styles.cardHeroHeader}>
                  <MapPin size={20} color="#18352b" />
                  <Text style={styles.onboardingHeroTitle}>Pickup Address & GPS</Text>
                </View>
                <Text style={styles.onboardingHeroSub}>
                  Set your location so verified drivers can navigate to your pickup door.
                </Text>

                {/* Live GPS Detector */}
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
                    {isLocating ? 'Detecting GPS...' : '📍 Detect My Live GPS Location'}
                  </Text>
                </TouchableOpacity>

                {gpsCoordinates && (
                  <View style={styles.gpsFixedBadge}>
                    <Compass size={14} color="#7ea441" />
                    <Text style={styles.gpsFixedText}>
                      GPS Coordinates Locked: <Text style={{ fontWeight: '800' }}>{gpsCoordinates}</Text>
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>STREET ADDRESS & LANDMARK *</Text>
                <TextInput
                  style={styles.inputField}
                  value={streetAddress}
                  onChangeText={setStreetAddress}
                  placeholder="e.g. 42 Commercial Street, Next to City Bank"
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

                <Text style={styles.inputLabel}>PREFERRED DAILY PICKUP WINDOW</Text>
                
                <TouchableOpacity
                  style={[styles.inputField, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  activeOpacity={0.7}
                  onPress={() => setPickupDropdownVisible(true)}>
                  <Text style={{ fontSize: 16, color: '#18352b', fontWeight: '700' }}>
                    {pickupWindow}
                  </Text>
                  <ChevronDown size={20} color="#18352b" />
                </TouchableOpacity>

                <Modal visible={pickupDropdownVisible} transparent={true} animationType="fade">
                  <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickupDropdownVisible(false)}>
                    <View style={styles.modalCard}>
                      <Text style={[styles.modalTitle, { marginBottom: 20 }]}>Select Pickup Time</Text>
                      {[
                        { id: 'morning', label: 'Morning', sub: '7–10 AM' },
                        { id: 'lunch', label: 'Lunch', sub: '12–2 PM' },
                        { id: 'post_lunch', label: 'Afternoon', sub: '2–4 PM' },
                        { id: 'evening', label: 'Evening', sub: '5–7 PM' },
                        { id: 'dinner', label: 'Dinner', sub: '8–10 PM' },
                        { id: 'anytime', label: 'Anytime', sub: 'Call us' },
                      ].map((slot) => {
                        const isSelected = pickupWindow === slot.sub || pickupWindow === `${slot.label} (${slot.sub})`;
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            style={[
                              { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#dce2d8', flexDirection: 'row', justifyContent: 'space-between' },
                              isSelected && { backgroundColor: '#f0f5e1' }
                            ]}
                            onPress={() => {
                              setPickupWindow(`${slot.label} (${slot.sub})`);
                              setPickupDropdownVisible(false);
                            }}>
                            <Text style={{ fontSize: 16, color: '#18352b', fontWeight: isSelected ? '800' : '600' }}>
                              {slot.label} <Text style={{ color: '#6c7b73', fontWeight: 'normal' }}>({slot.sub})</Text>
                            </Text>
                            {isSelected && <Check size={18} color="#91bc48" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                </Modal>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setOnboardingStep(1)}>
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 2 }]}
                    activeOpacity={0.85}
                    onPress={handleCompleteOnboarding}
                    disabled={isAuthLoading}>
                    {isAuthLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Complete Setup & Unlock</Text>
                        <Check size={16} color="#ffffff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        ) : (
          /* UNLOCKED FOOD DONATION SECTION */
          <View>
            
            {/* Active Profile Bar */}
            <View style={styles.activeProfileBar}>
              <View style={styles.activeDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeProfileName}>
                  {donorName} <Text style={styles.activeProfileBadge}>({donorTypes.find((t) => t.id === selectedDonorType)?.label})</Text>
                </Text>
                <Text style={styles.activeProfileLoc} numberOfLines={1}>
                  📍 {streetAddress}, {city}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsOnboarded(false);
                  setOnboardingStep(1);
                }}>
                <Text style={styles.editProfileText}>Edit Setup</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Switcher Pills */}
            <View style={styles.tabPillsRow}>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'donate' && styles.tabPillActive]}
                onPress={() => setActiveTab('donate')}>
                <Plus size={15} color={activeTab === 'donate' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.tabPillText, activeTab === 'donate' && styles.tabPillTextActive]}>
                  Single Item
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'menu_basket' && styles.tabPillActive]}
                onPress={() => setActiveTab('menu_basket')}>
                <ShoppingBag size={15} color={activeTab === 'menu_basket' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.tabPillText, activeTab === 'menu_basket' && styles.tabPillTextActive]}>
                  Basket ({totalCartCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'my_donations' && styles.tabPillActive]}
                onPress={() => setActiveTab('my_donations')}>
                <Clock size={15} color={activeTab === 'my_donations' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.tabPillText, activeTab === 'my_donations' && styles.tabPillTextActive]}>
                  Active ({donationsList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'ngo_demands' && styles.tabPillActive]}
                onPress={() => setActiveTab('ngo_demands')}>
                <HeartHandshake size={15} color={activeTab === 'ngo_demands' ? '#ffffff' : AppColors.textSecondary} />
                <Text style={[styles.tabPillText, activeTab === 'ngo_demands' && styles.tabPillTextActive]}>
                  NGO Needs ({storeState.activeRequests.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: SINGLE ITEM DONATION FORM */}
            {activeTab === 'donate' && (
              <View style={styles.cardContainer}>
                
                {/* 1. PHOTO SECTION WITH REAL CAMERA & GALLERY PICKER */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Camera size={18} color="#18352b" />
                    <Text style={styles.sectionBoxTitle}>1. Food Photo Section</Text>
                  </View>
                  <Text style={styles.sectionBoxDesc}>
                    Take or upload a clear photo of the prepared food so shelters can inspect quality.
                  </Text>

                  {selectedPhoto ? (
                    <View style={styles.photoPreviewCard}>
                      <Image
                        source={{ uri: selectedPhoto }}
                        style={styles.photoImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={styles.photoOverlayBar}>
                        {visionAnalyzing && (
                          <View style={styles.analyzingPill}>
                            <ActivityIndicator size="small" color="#ffffff" />
                            <Text style={styles.analyzingPillText}>Detecting Food…</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.photoActionBtn}
                          onPress={() => setSelectedPhoto(null)}>
                          <Trash2 size={14} color="#ffffff" />
                          <Text style={styles.photoActionText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.photoUploadActionsRow}>
                      <TouchableOpacity
                        style={styles.photoTriggerBtn}
                        onPress={() => handlePickImage(true)}>
                        <Camera size={24} color="#18352b" />
                        <Text style={styles.photoTriggerText}>Open Camera</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.photoTriggerBtn}
                        onPress={() => handlePickImage(false)}>
                        <ImageIcon size={24} color="#18352b" />
                        <Text style={styles.photoTriggerText}>Upload Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {visionResult && !visionAnalyzing && (
                    <TouchableOpacity
                      style={styles.detectedBanner}
                      onPress={() => setVisionModalVisible(true)}>
                      <Sparkles size={15} color="#18352b" />
                      <Text style={styles.detectedBannerText}>
                        Detected: {visionResult.title} • {visionResult.category} ({visionResult.dietary_tag})
                      </Text>
                      <Text style={styles.detectedBannerEdit}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 2. FOOD DETAILS & CATEGORY */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Utensils size={18} color="#18352b" />
                    <Text style={styles.sectionBoxTitle}>2. Food Item Details</Text>
                  </View>

                  <Text style={styles.inputLabel}>FOOD ITEM TITLE / MENU DESCRIPTION *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={foodTitle}
                    onChangeText={setFoodTitle}
                    placeholder="e.g. Mixed Veg Curry, Dal Makhani & 40 Rotis"
                    placeholderTextColor={AppColors.textMuted}
                  />

                  <Text style={styles.inputLabel}>FOOD CATEGORY</Text>
                  <View style={styles.categoryChipsRow}>
                    {['Cooked Meals', 'Raw Produce', 'Bakery & Bread', 'Packaged Snacks', 'Dairy & Drinks'].map(
                      (cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.chipBtn,
                            foodCategory === cat && styles.chipBtnActive,
                          ]}
                          onPress={() => setFoodCategory(cat)}>
                          <Text
                            style={[
                              styles.chipText,
                              foodCategory === cat && styles.chipTextActive,
                            ]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  <Text style={styles.inputLabel}>DIETARY TAG</Text>
                  <View style={styles.dietRow}>
                    {(['Veg', 'Non-Veg', 'Egg'] as const).map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.dietChip,
                          vegTag === tag && styles.dietChipActive,
                          tag === 'Veg' && { backgroundColor: '#e6f0c9' },
                          tag === 'Non-Veg' && { backgroundColor: '#f9ddcb' },
                        ]}
                        onPress={() => setVegTag(tag)}>
                        <Text style={[styles.dietChipText, vegTag === tag && { fontWeight: '800' }]}>
                          {tag === 'Veg' ? '🌱 Pure Veg' : tag === 'Non-Veg' ? '🍖 Non-Veg' : '🥚 Contains Egg'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 3. TIMINGS, QUANTITY & SHELF LIFE */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Clock size={18} color="#18352b" />
                    <Text style={styles.sectionBoxTitle}>3. Freshness & Shelf Life</Text>
                  </View>

                  <Text style={styles.inputLabel}>WHEN WAS THE FOOD PREPARED? *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={preparedAt}
                    onChangeText={setPreparedAt}
                    placeholder="e.g. Today at 1:30 PM (1 hr ago)"
                    placeholderTextColor={AppColors.textMuted}
                  />

                  <Text style={styles.inputLabel}>APPROXIMATE QUANTITY *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="e.g. Serves ~30 people or 15 KG"
                    placeholderTextColor={AppColors.textMuted}
                  />

                  <Text style={styles.inputLabel}>SHELF LIFE / BEST BEFORE (BY DONOR) *</Text>
                  <TextInput
                    style={styles.inputField}
                    value={shelfLife}
                    onChangeText={setShelfLife}
                    placeholder="e.g. Best within 4 hours (consume by 8:00 PM)"
                    placeholderTextColor={AppColors.textMuted}
                  />

                  <Text style={styles.inputLabel}>SPECIAL PICKUP INSTRUCTIONS</Text>
                  <TextInput
                    style={[styles.inputField, { height: 70 }]}
                    value={specialInstructions}
                    onChangeText={setSpecialInstructions}
                    multiline
                    placeholder="e.g. Pickup from rear kitchen entrance. Contact Manager Ramesh."
                    placeholderTextColor={AppColors.textMuted}
                  />
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  style={styles.postSubmitBtn}
                  activeOpacity={0.85}
                  onPress={handlePostDonation}>
                  <Text style={styles.postSubmitBtnText}>Publish Surplus Food Donation</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>

              </View>
            )}

            {/* TAB 2: MULTI-ITEM MENU SURPLUS BASKET ("ADD TO CART" STYLE) */}
            {activeTab === 'menu_basket' && (
              <View style={styles.cardContainer}>
                
                <View style={styles.formHeaderCard}>
                  <View style={styles.badgePill}>
                    <ShoppingBag size={13} color="#18352b" />
                    <Text style={styles.badgePillText}>MENU SURPLUS BASKET</Text>
                  </View>
                  <Text style={styles.formTitle}>Select Surplus Items from Your Menu</Text>
                  <Text style={styles.formSub}>
                    Tap + or - on your restaurant menu items to add multiple surplus dishes into your donation basket.
                  </Text>
                </View>

                {/* Add Custom Item to Menu Box */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionBoxTitle}>➕ Add Custom Dish to Menu</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TextInput
                      style={[styles.inputField, { flex: 2 }]}
                      value={newItemName}
                      onChangeText={setNewItemName}
                      placeholder="e.g. Shahi Paneer Tray"
                      placeholderTextColor={AppColors.textMuted}
                    />
                    <TouchableOpacity
                      style={styles.addMenuBtn}
                      onPress={handleAddCustomMenuItem}>
                      <Plus size={16} color="#ffffff" />
                      <Text style={styles.addMenuBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Clickable Menu Item List */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionBoxTitle}>🍳 Menu Surplus Items</Text>
                  <View style={styles.menuItemsGrid}>
                    {menuItems.map((item) => {
                      const qty = cartQuantities[item.id] || 0;
                      return (
                        <View key={item.id} style={[styles.menuItemCard, qty > 0 && styles.menuItemCardActive]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.menuItemName}>{item.name}</Text>
                            <Text style={styles.menuItemUnit}>Unit: {item.unit}</Text>
                          </View>

                          {/* + / - Stepper Buttons */}
                          <View style={styles.stepperRow}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => handleUpdateCartQty(item.id, -1)}>
                              <Minus size={14} color="#18352b" />
                            </TouchableOpacity>

                            <Text style={styles.qtyNumberText}>{qty}</Text>

                            <TouchableOpacity
                              style={[styles.stepBtn, { backgroundColor: '#d7ee85' }]}
                              onPress={() => handleUpdateCartQty(item.id, 1)}>
                              <Plus size={14} color="#18352b" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Surplus Cart Summary Card */}
                {selectedCartItems.length > 0 && (
                  <View style={styles.cartSummaryCard}>
                    <View style={styles.cartHeaderRow}>
                      <ShoppingBag size={18} color="#ffffff" />
                      <Text style={styles.cartHeaderTitle}>Surplus Basket ({totalCartCount} items)</Text>
                    </View>

                    <View style={styles.cartItemsList}>
                      {selectedCartItems.map((item) => (
                        <View key={item.id} style={styles.cartLineItem}>
                          <Text style={styles.cartLineName}>{item.name}</Text>
                          <Text style={styles.cartLineQty}>x{cartQuantities[item.id]} {item.unit}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.publishCartBtn}
                      activeOpacity={0.85}
                      onPress={handlePublishCartBasket}>
                      <Text style={styles.publishCartBtnText}>
                        Publish All Selected Items ({totalCartCount})
                      </Text>
                      <ArrowRight size={16} color="#18352b" />
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            )}

            {/* TAB 3: ACTIVE LISTINGS FEED */}
            {activeTab === 'my_donations' && (
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Clock size={20} color="#18352b" />
                  <Text style={styles.formTitle}>Active Food Donations</Text>
                </View>
                <Text style={styles.formSub}>Real-time matching status for posted food surplus.</Text>

                {donationsList.map((item) => (
                  <View key={item.id} style={styles.donationCard}>

                    {/* Live Delivery Map — shown for every active donation */}
                    <LiveDeliveryMap
                      donorLat={12.9784}
                      donorLng={77.6408}
                      donorName={donorName}
                      status={item.status as any}
                      driverName={(item as any).driverName}
                    />

                    <View style={styles.donationTopRow}>
                      <Image
                        source={{ uri: item.photoUrl }}
                        style={styles.donationThumb}
                        contentFit="cover"
                        transition={150}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.tagRow}>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{item.category}</Text>
                          </View>
                          <View style={styles.vegBadge}>
                            <Text style={styles.vegBadgeText}>{item.vegTag}</Text>
                          </View>
                        </View>

                        <Text style={styles.donationItemTitle}>{item.title}</Text>
                        <Text style={styles.donationSubText}>{item.quantity}</Text>
                      </View>
                    </View>

                    <View style={styles.donationDetailsBox}>
                      <View style={styles.detailRow}>
                        <Clock size={14} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                          <Text style={{ fontWeight: '700' }}>Prepared:</Text> {item.preparedAt}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <ShieldCheck size={14} color="#9fbd42" />
                        <Text style={styles.detailText}>
                          <Text style={{ fontWeight: '700' }}>Shelf Life:</Text> {item.shelfLife}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <MapPin size={14} color={AppColors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statusFooter}>
                      {item.status === 'matching' ? (
                        <View style={styles.statusPillYellow}>
                          <RefreshCw size={14} color="#dd835d" />
                          <Text style={styles.statusPillYellowText}>
                            Searching Nearest Shelter (Algorithm Active)...
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.statusPillGreen}>
                          <Bike size={14} color="#7da750" />
                          <Text style={styles.statusPillGreenText}>
                            Driver Assigned: Amara (10 mins away)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* TAB 4: NGO DEMANDS — cross-view for donor */}
            {activeTab === 'ngo_demands' && (
              <View style={styles.cardContainer}>
                <View style={styles.sectionHeaderRow}>
                  <HeartHandshake size={20} color="#18352b" />
                  <Text style={styles.formTitle}>Shelter Food Requests</Text>
                </View>
                <Text style={styles.formSub}>
                  Live food needs broadcast by nearby NGOs and shelters. Donate directly to match their requirements.
                </Text>

                {storeState.activeRequests.map((req) => (
                  <View key={req.id} style={styles.ngoRequestCard}>
                    <View style={styles.ngoCardTop}>
                      <View style={styles.ngoOrgBadge}>
                        <Building2 size={13} color="#8871a4" />
                        <Text style={styles.ngoOrgText}>{req.ngoName}</Text>
                      </View>
                      <View style={[styles.categoryBadge, { backgroundColor: '#e6e0ef' }]}>
                        <Text style={[styles.categoryBadgeText, { color: '#8871a4' }]}>{req.ngoCategory}</Text>
                      </View>
                    </View>

                    <Text style={styles.ngoRequestTitle}>{req.title}</Text>

                    <View style={styles.donationDetailsBox}>
                      <View style={styles.detailRow}>
                        <Users size={13} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                          <Text style={{ fontWeight: '700' }}>People: </Text>{req.peopleCount}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Utensils size={13} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                          <Text style={{ fontWeight: '700' }}>Food Type: </Text>{req.category} • {req.dietPreference}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Clock size={13} color={AppColors.textSecondary} />
                        <Text style={styles.detailText}>
                          <Text style={{ fontWeight: '700' }}>Deadline: </Text>{req.requiredBy}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <MapPin size={13} color={AppColors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{req.address}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.respondToNgoBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        setFoodTitle(`Donation for: ${req.title}`);
                        setActiveTab('donate');
                      }}>
                      <Utensils size={14} color="#ffffff" />
                      <Text style={styles.respondToNgoBtnText}>Donate Food to This Shelter</Text>
                      <ArrowRight size={14} color="#ffffff" />
                    </TouchableOpacity>

                    <Text style={styles.postedAgoText}>Posted {req.postedAgo}</Text>
                  </View>
                ))}
              </View>
            )}

          </View>
        )}

      </ScrollView>

      {/* POST SUCCESS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={postSuccessModal}
        onRequestClose={() => setPostSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#ffffff" />
            </View>
            <Text style={styles.successModalTitle}>Food Donation Posted!</Text>
            <Text style={styles.successModalSub}>
              Your surplus food is now broadcast to verified shelters within 4 km. A volunteer driver will be assigned shortly.
            </Text>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => {
                setPostSuccessModal(false);
                setActiveTab('my_donations');
              }}>
              <Text style={styles.modalDoneBtnText}>View Active Donations</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FOOD VISION DETECTION MODAL */}
      <FoodVisionResult
        visible={visionModalVisible}
        photoUri={selectedPhoto}
        item={visionResult}
        analyzing={visionAnalyzing}
        onApply={handleApplyVisionResult}
        onRetake={() => {
          setVisionModalVisible(false);
        }}
        onManual={() => {
          setVisionModalVisible(false);
        }}
      />
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
  profileChip: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d7ee85',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.pill,
  },
  profileChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#18352b',
  },

  /* Short Onboarding Cards */
  onboardingWrapper: {
    gap: 16,
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

onboardingCard: {
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

  cardHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onboardingHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#18352b',
  },
  onboardingHeroSub: {
    fontSize: 13,
    color: '#6c7b73',
    lineHeight: 19,
    marginBottom: 4,
  },

  donorTypeGrid: {
    gap: 10,
  },
  donorTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: AppRadius.md,
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  donorTypeCardActive: {
    borderColor: '#18352b',
    backgroundColor: '#e7eddc',
    borderWidth: 2,
  },
  donorTypeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donorTypeLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18352b',
  },
  donorTypeDesc: {
    fontSize: 11,
    color: '#6c7b73',
    marginTop: 2,
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

  /* Form Containers */
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
  sectionBoxDesc: {
    fontSize: 12,
    color: '#6c7b73',
    lineHeight: 17,
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

  /* Photo Section */
  photoPreviewCard: {
    height: 180,
    borderRadius: AppRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayBar: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(24, 53, 43, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.pill,
  },
  photoActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  photoUploadActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  photoTriggerBtn: {
    flex: 1,
    height: 100,
    borderRadius: AppRadius.lg,
    backgroundColor: '#faf9f5',
    borderWidth: 1.5,
    borderColor: '#dce2d8',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoTriggerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#18352b',
  },
  analyzingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(24, 53, 43, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppRadius.pill,
  },
  analyzingPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  detectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#e7eddc',
    borderRadius: AppRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detectedBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#18352b',
  },
  detectedBannerEdit: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5c9686',
    textDecorationLine: 'underline',
  },

  /* Multi-Item Menu Basket */
  addMenuBtn: {
    backgroundColor: '#18352b',
    borderRadius: AppRadius.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMenuBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  menuItemsGrid: {
    gap: 10,
    marginTop: 4,
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: AppRadius.md,
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  menuItemCardActive: {
    borderColor: '#18352b',
    backgroundColor: '#e7eddc',
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18352b',
  },
  menuItemUnit: {
    fontSize: 11,
    color: '#6c7b73',
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f7f7f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18352b',
    minWidth: 18,
    textAlign: 'center',
  },

  /* Cart Summary Box */
  cartSummaryCard: {
    backgroundColor: '#18352b',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    gap: 12,
  },
  cartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cartItemsList: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  cartLineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartLineName: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  cartLineQty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#d7ee85',
  },
  publishCartBtn: {
    backgroundColor: '#d7ee85',
    borderRadius: AppRadius.pill,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  publishCartBtnText: {
    color: '#18352b',
    fontWeight: '800',
    fontSize: 14,
  },

  /* Category & Dietary Chips */
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
    gap: 10,
  },
  dietChip: {
    paddingHorizontal: 12,
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
    fontSize: 12,
    color: '#18352b',
  },

  /* Submit Buttons */
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

  /* Active Donations */
  donationCard: {
    backgroundColor: '#f7f7f2',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: '#dce2d8',
    gap: 12,
  },
  donationTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  donationThumb: {
    width: 64,
    height: 64,
    borderRadius: AppRadius.md,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
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
  vegBadge: {
    backgroundColor: '#e6f0c9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AppRadius.xs,
  },
  vegBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7ea441',
  },
  donationItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18352b',
  },
  donationSubText: {
    fontSize: 12,
    color: '#6c7b73',
    marginTop: 2,
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
