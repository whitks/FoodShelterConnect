import React, { useState } from 'react';
import {
  ArrowRight,
  Bike,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MapPin,
  Package,
  Plus,
  Recycle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  User,
  Utensils,
  X,
} from 'lucide-react-native';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, AppRadius, AppShadows, AppSpacing } from '@/constants/theme';

// Donor Type Options matching the minimal theme
const donorTypes = [
  {
    id: 'restaurant',
    label: 'Restaurant / Cafe',
    icon: Utensils,
    desc: 'Bistros, fine dining, fast food, bakeries',
    color: '#18352b',
    bgColor: '#e6f0c9',
  },
  {
    id: 'grocery',
    label: 'Grocery Shop',
    icon: Store,
    desc: 'Supermarkets, produce stores, bakeries',
    color: '#5c9686',
    bgColor: '#dcece9',
  },
  {
    id: 'mess',
    label: 'Mess / Hostel Kitchen',
    icon: Building2,
    desc: 'College mess, worker canteens, office pantries',
    color: '#8871a4',
    bgColor: '#e6e0ef',
  },
  {
    id: 'catering',
    label: 'Catering Service',
    icon: Package,
    desc: 'Event caterers, wedding halls, banquet kitchens',
    color: '#dd835d',
    bgColor: '#f9ddcb',
  },
  {
    id: 'individual',
    label: 'Normal Person / Individual',
    icon: User,
    desc: 'Home cooks, family events, residential donors',
    color: '#7ea441',
    bgColor: '#e6f0c9',
  },
];

// Sample Preset Photos for demo camera capture
const sampleFoodPhotos = [
  {
    id: 'photo1',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    name: 'Fresh Veg Meals & Rotis',
  },
  {
    id: 'photo2',
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    name: 'Bakery Breads & Pastries',
  },
  {
    id: 'photo3',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    name: 'Catered Rice & Trays',
  },
];

// Initial Mock Active Donations
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
  {
    id: 'don_100',
    title: '25 Loaves Fresh Bread & Milk',
    donorType: 'Grocery Shop',
    category: 'Bakery & Dairy',
    preparedAt: 'Baked today 9:00 AM',
    quantity: '25 loaves + 10L milk packets',
    shelfLife: 'Best within 24 hours',
    address: 'Sharma Supermarket, M.G. Road',
    status: 'assigned',
    driverName: 'Amara (Volunteer)',
    driverEta: '10 mins away',
    photoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    vegTag: 'Veg',
    postedAgo: '1 hour ago',
  },
];

export default function FoodDonorScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'donate' | 'my_donations' | 'profile'>('donate');

  // First-time Setup State
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [selectedDonorType, setSelectedDonorType] = useState('restaurant');

  // Donor Profile Data
  const [donorProfile, setDonorProfile] = useState({
    businessName: 'Royal Spice Kitchen',
    contactPerson: 'Rahul Sharma',
    phone: '+91 98765 43210',
    address: '42 Commercial Street, Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
    pickupWindow: 'Lunch (2 PM - 4 PM) & Dinner (9 PM - 11 PM)',
    donorType: 'restaurant',
  });

  // Food Donation Form State
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(
    sampleFoodPhotos[0].url
  );
  const [foodTitle, setFoodTitle] = useState('');
  const [foodCategory, setFoodCategory] = useState('Cooked Meals');
  const [preparedAt, setPreparedAt] = useState('Today at 2:00 PM (1 hr ago)');
  const [quantity, setQuantity] = useState('Serves 25 people (~10 KG)');
  const [shelfLife, setShelfLife] = useState('Best within 4 hours (by 7:00 PM)');
  const [vegTag, setVegTag] = useState<'Veg' | 'Non-Veg' | 'Egg'>('Veg');
  const [packagingType, setPackagingType] = useState('Self-packed in disposable containers');
  const [specialInstructions, setSpecialInstructions] = useState('Keep warm until pickup. Separate curry containers.');

  // Active Donations
  const [donationsList, setDonationsList] = useState(initialActiveDonations);
  const [postSuccessModal, setPostSuccessModal] = useState(false);

  // Handle Profile Setup Submit
  const handleCompleteSetup = () => {
    setIsFirstTimeSetup(false);
    setActiveTab('donate');
  };

  // Handle Post Surplus Submit
  const handlePostDonation = () => {
    if (!foodTitle.trim()) {
      alert('Please enter the food item title.');
      return;
    }

    const newDonation = {
      id: `don_${Date.now()}`,
      title: foodTitle,
      donorType:
        donorTypes.find((t) => t.id === donorProfile.donorType)?.label || 'Donor',
      category: foodCategory,
      preparedAt: preparedAt || 'Just now',
      quantity: quantity || 'Serves 20 people',
      shelfLife: shelfLife || 'Consume within 4 hours',
      address: `${donorProfile.address}, ${donorProfile.city}`,
      status: 'matching',
      photoUrl: selectedPhoto || sampleFoodPhotos[0].url,
      vegTag: vegTag,
      postedAgo: 'Just now',
    };

    setDonationsList([newDonation, ...donationsList]);
    setPostSuccessModal(true);

    // Reset Form
    setFoodTitle('');
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

            <TouchableOpacity
              style={styles.profileChip}
              onPress={() => setIsFirstTimeSetup(true)}>
              <Building2 size={13} color="#18352b" />
              <Text style={styles.profileChipText}>
                {donorTypes.find((t) => t.id === donorProfile.donorType)?.label.split(' ')[0] || 'Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher Pills (Minimal Theme) */}
        <View style={styles.tabPillsRow}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'donate' && styles.tabPillActive]}
            onPress={() => setActiveTab('donate')}>
            <Plus size={15} color={activeTab === 'donate' ? '#ffffff' : AppColors.textSecondary} />
            <Text style={[styles.tabPillText, activeTab === 'donate' && styles.tabPillTextActive]}>
              Donate Food
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
            style={[styles.tabPill, activeTab === 'profile' && styles.tabPillActive]}
            onPress={() => setActiveTab('profile')}>
            <User size={15} color={activeTab === 'profile' ? '#ffffff' : AppColors.textSecondary} />
            <Text style={[styles.tabPillText, activeTab === 'profile' && styles.tabPillTextActive]}>
              Donor Setup
            </Text>
          </TouchableOpacity>
        </View>

        {/* FIRST-TIME SETUP BANNER */}
        {isFirstTimeSetup && (
          <View style={styles.setupCard}>
            <View style={styles.setupHeader}>
              <Sparkles size={20} color="#9fbd42" />
              <Text style={styles.setupTitle}>First-Time Donor Setup</Text>
            </View>
            <Text style={styles.setupSub}>
              Set up your donor type and pickup location once so shelters and drivers can locate your surplus quickly.
            </Text>

            {/* Step 1: Donor Type Selection */}
            {setupStep === 1 && (
              <View style={styles.stepBlock}>
                <Text style={styles.stepTitle}>1. Select Your Food Donor Type</Text>
                <View style={styles.donorTypeGrid}>
                  {donorTypes.map((type) => {
                    const TypeIcon = type.icon;
                    const isSelected = selectedDonorType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.donorTypeCard,
                          isSelected && { borderColor: '#18352b', backgroundColor: '#e7eddc' },
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

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    setDonorProfile({ ...donorProfile, donorType: selectedDonorType });
                    setSetupStep(2);
                  }}>
                  <Text style={styles.primaryBtnText}>Continue to Address & Details</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Address & Business Info */}
            {setupStep === 2 && (
              <View style={styles.stepBlock}>
                <Text style={styles.stepTitle}>2. Enter Pickup Address & Details</Text>

                <Text style={styles.inputLabel}>BUSINESS / DONOR NAME</Text>
                <TextInput
                  style={styles.inputField}
                  value={donorProfile.businessName}
                  onChangeText={(txt) => setDonorProfile({ ...donorProfile, businessName: txt })}
                  placeholder="e.g. Royal Spice Restaurant or Sharma Mess"
                  placeholderTextColor={AppColors.textMuted}
                />

                <Text style={styles.inputLabel}>CONTACT PERSON & PHONE</Text>
                <TextInput
                  style={styles.inputField}
                  value={donorProfile.phone}
                  onChangeText={(txt) => setDonorProfile({ ...donorProfile, phone: txt })}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={AppColors.textMuted}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>STREET / BUILDING ADDRESS</Text>
                <TextInput
                  style={styles.inputField}
                  value={donorProfile.address}
                  onChangeText={(txt) => setDonorProfile({ ...donorProfile, address: txt })}
                  placeholder="Street, Landmark, Building No."
                  placeholderTextColor={AppColors.textMuted}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>CITY</Text>
                    <TextInput
                      style={styles.inputField}
                      value={donorProfile.city}
                      onChangeText={(txt) => setDonorProfile({ ...donorProfile, city: txt })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>PINCODE</Text>
                    <TextInput
                      style={styles.inputField}
                      value={donorProfile.pincode}
                      onChangeText={(txt) => setDonorProfile({ ...donorProfile, pincode: txt })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>PREFERRED PICKUP WINDOW</Text>
                <TextInput
                  style={styles.inputField}
                  value={donorProfile.pickupWindow}
                  onChangeText={(txt) => setDonorProfile({ ...donorProfile, pickupWindow: txt })}
                  placeholder="e.g. Lunch 2-4 PM & Dinner 9-11 PM"
                  placeholderTextColor={AppColors.textMuted}
                />

                <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteSetup}>
                  <Text style={styles.primaryBtnText}>Save Profile & Start Donating</Text>
                  <Check size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 1: DONATE FOOD FORM */}
        {activeTab === 'donate' && !isFirstTimeSetup && (
          <View style={styles.cardContainer}>
            {/* Header banner */}
            <View style={styles.formHeaderCard}>
              <View style={styles.badgePill}>
                <Sparkles size={13} color="#18352b" />
                <Text style={styles.badgePillText}>POST SURPLUS FOOD</Text>
              </View>
              <Text style={styles.formTitle}>What food are you donating today?</Text>
              <Text style={styles.formSub}>
                Posting for <Text style={{ fontWeight: '700', color: '#18352b' }}>{donorProfile.businessName}</Text> ({donorTypes.find((t) => t.id === donorProfile.donorType)?.label})
              </Text>
            </View>

            {/* 1. PHOTO SECTION */}
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
                  <Image source={{ uri: selectedPhoto }} style={styles.photoImage} />
                  <View style={styles.photoOverlayBar}>
                    <TouchableOpacity
                      style={styles.photoActionBtn}
                      onPress={() => setSelectedPhoto(null)}>
                      <Trash2 size={14} color="#ffffff" />
                      <Text style={styles.photoActionText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoUploadPlaceholder}>
                  <Camera size={32} color={AppColors.textMuted} />
                  <Text style={styles.uploadMainText}>Tap to Capture Food Photo</Text>
                  <Text style={styles.uploadSubText}>Take photo via camera or select from gallery</Text>
                </View>
              )}

              {/* Sample Quick Preset Photos Selector */}
              <Text style={styles.presetLabel}>Or select quick sample photo:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                {sampleFoodPhotos.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.presetThumbBox,
                      selectedPhoto === item.url && { borderColor: '#18352b', borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedPhoto(item.url)}>
                    <Image source={{ uri: item.url }} style={styles.presetThumb} />
                    <Text style={styles.presetThumbTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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

              <Text style={styles.inputLabel}>CONTAINERS / PACKAGING</Text>
              <TextInput
                style={styles.inputField}
                value={packagingType}
                onChangeText={setPackagingType}
                placeholder="e.g. Packed in disposable foil trays"
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

        {/* TAB 2: MY ACTIVE DONATIONS LIST */}
        {activeTab === 'my_donations' && (
          <View style={styles.cardContainer}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={20} color="#18352b" />
              <Text style={styles.formTitle}>Active Food Donations</Text>
            </View>
            <Text style={styles.formSub}>Real-time matching status for posted food surplus.</Text>

            {donationsList.map((item) => (
              <View key={item.id} style={styles.donationCard}>
                <View style={styles.donationTopRow}>
                  <Image source={{ uri: item.photoUrl }} style={styles.donationThumb} />
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

                {/* Status Bar */}
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
                        Driver Assigned: {item.driverName} ({item.driverEta})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: PROFILE & DONOR SETUP */}
        {activeTab === 'profile' && (
          <View style={styles.cardContainer}>
            <View style={styles.formHeaderCard}>
              <Building2 size={24} color="#18352b" />
              <Text style={styles.formTitle}>Food Donor Profile</Text>
              <Text style={styles.formSub}>Manage your donor type, pickup address, and tax records.</Text>
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.inputLabel}>DONOR TYPE</Text>
              <Text style={styles.profileValText}>
                {donorTypes.find((t) => t.id === donorProfile.donorType)?.label}
              </Text>

              <Text style={styles.inputLabel}>BUSINESS / KITCHEN NAME</Text>
              <Text style={styles.profileValText}>{donorProfile.businessName}</Text>

              <Text style={styles.inputLabel}>CONTACT PHONE</Text>
              <Text style={styles.profileValText}>{donorProfile.phone}</Text>

              <Text style={styles.inputLabel}>PICKUP ADDRESS</Text>
              <Text style={styles.profileValText}>
                {donorProfile.address}, {donorProfile.city} - {donorProfile.pincode}
              </Text>

              <Text style={styles.inputLabel}>PREFERRED PICKUP WINDOW</Text>
              <Text style={styles.profileValText}>{donorProfile.pickupWindow}</Text>

              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => {
                  setSetupStep(1);
                  setIsFirstTimeSetup(true);
                }}>
                <Text style={styles.editProfileBtnText}>Edit Donor Registration Details</Text>
              </TouchableOpacity>
            </View>
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

  /* Tab Pills */
  tabPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: AppSpacing.lg,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#6c7b73',
  },
  tabPillTextActive: {
    color: '#ffffff',
  },

  /* Setup Card */
  setupCard: {
    backgroundColor: '#f7f7f2',
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    borderWidth: 1,
    borderColor: '#dce2d8',
    marginBottom: AppSpacing.xl,
    boxShadow: '6px 6px 14px rgba(48,69,58,.11)',
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18352b',
  },
  setupSub: {
    fontSize: 13,
    color: '#6c7b73',
    lineHeight: 19,
    marginBottom: AppSpacing.lg,
  },
  stepBlock: {
    gap: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18352b',
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

  /* Form Common */
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
    fontSize: 20,
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
  photoUploadPlaceholder: {
    height: 140,
    borderRadius: AppRadius.lg,
    backgroundColor: '#faf9f5',
    borderWidth: 2,
    borderColor: '#dce2d8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18352b',
  },
  uploadSubText: {
    fontSize: 11,
    color: '#89958e',
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6c7b73',
    marginTop: 4,
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetThumbBox: {
    width: 100,
    marginRight: 10,
    borderRadius: AppRadius.md,
    overflow: 'hidden',
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  presetThumb: {
    width: '100%',
    height: 60,
  },
  presetThumbTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#18352b',
    padding: 4,
    textAlign: 'center',
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
    boxShadow: '5px 6px 12px rgba(23,50,41,.24)',
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

  /* Profile Tab */
  profileValText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18352b',
    marginBottom: 8,
  },
  editProfileBtn: {
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#dce2d8',
    paddingVertical: 12,
    borderRadius: AppRadius.pill,
    alignItems: 'center',
    marginTop: 10,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18352b',
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
