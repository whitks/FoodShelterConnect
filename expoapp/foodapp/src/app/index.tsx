import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  Building2,
  Calculator,
  Check,
  HeartHandshake,
  MapPin,
  Menu,
  PackageCheck,
  PlusCircle,
  Recycle,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Utensils,
  X,
} from 'lucide-react-native';
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

const steps = [
  {
    number: '01',
    title: 'Post surplus',
    text: 'Kitchens post available food in under 60 seconds.',
    icon: Utensils,
    bgColor: '#e6f0c9',
    iconColor: '#7ea441',
  },
  {
    number: '02',
    title: 'Get matched',
    text: 'Algorithm pairs with the nearest verified shelter.',
    icon: MapPin,
    bgColor: '#f9ddcb',
    iconColor: '#d68154',
  },
  {
    number: '03',
    title: 'Coordinate pickup',
    text: 'Volunteer driver accepts route with GPS tracking.',
    icon: Truck,
    bgColor: '#dcece9',
    iconColor: '#5c9686',
  },
  {
    number: '04',
    title: 'Deliver impact',
    text: 'Fresh food arrives safely. Tracked & tax certified.',
    icon: HeartHandshake,
    bgColor: '#e6e0ef',
    iconColor: '#8871a4',
  },
];

export default function MobileFirstLandingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scooterPlayer = useVideoPlayer(require('../../assets/videos/scootervideo.mp4'), (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'donor' | 'shelter' | 'volunteer'>('donor');

  // Calculator state
  const [kgPerDay, setKgPerDay] = useState('25');
  const numericKg = parseFloat(kgPerDay) || 0;
  const estimatedMealsMonthly = Math.round(numericKg * 2.2 * 30);
  const estimatedCo2Saved = Math.round(numericKg * 2.5 * 30);

  // Quick Action Form state
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [contactEmail, setContactEmail] = useState('');

  const handleOpenModal = (roleType: 'donor' | 'shelter' | 'volunteer' = 'donor') => {
    setSelectedRole(roleType);
    setFormSubmitted(false);
    setModalVisible(true);
  };

  const handleSubmitForm = () => {
    if (contactEmail.trim()) {
      setFormSubmitted(true);
    }
  };

  return (
    <View style={styles.rootContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Header Navigation Bar */}
        <View style={styles.navBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Recycle size={18} color="#18352b" strokeWidth={2.6} />
            </View>
            <Text style={styles.brandText}>
              rescue<Text style={styles.brandDot}>.</Text>
            </Text>
          </View>

          {!IS_MOBILE ? (
            <View style={styles.desktopNavLinks}>
              <TouchableOpacity onPress={() => router.push('/donor')}>
                <Text style={styles.navLinkText}>Donate Food</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/shelter')}>
                <Text style={styles.navLinkText}>Shelters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navCtaButton}
                activeOpacity={0.8}
                onPress={() => router.push('/donor')}>
                <Text style={styles.navCtaText}>Start Donation</Text>
                <ArrowUpRight size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.mobileMenuToggle}
              activeOpacity={0.7}
              onPress={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={22} color="#18352b" /> : <Menu size={22} color="#18352b" />}
            </TouchableOpacity>
          )}
        </View>

        {/* Mobile Nav Menu Drawer */}
        {menuOpen && (
          <View style={styles.mobileDrawer}>
            <TouchableOpacity
              style={styles.mobileDrawerItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/donor');
              }}>
              <Text style={styles.mobileDrawerText}>🍳 Food Donor Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileDrawerItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/shelter');
              }}>
              <Text style={styles.mobileDrawerText}>🏠 NGO & Shelter Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileDrawerCta}
              onPress={() => {
                setMenuOpen(false);
                router.push('/donor');
              }}>
              <Text style={styles.mobileDrawerCtaText}>Donate Surplus Now</Text>
              <ArrowUpRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.eyebrowBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.eyebrowText}>LIVE ACROSS YOUR CITY</Text>
          </View>

          <Text style={styles.heroTitle}>
            Good food.{'\n'}
            <Text style={styles.heroTitleHighlight}>Right place.</Text>
            {'\n'}
            Right now.
          </Text>

          <Text style={styles.heroSubtitle}>
            Connect surplus food from commercial kitchens directly with local shelters — before the clock runs out.
          </Text>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => router.push('/donor')}>
              <Text style={styles.primaryButtonText}>Donate Surplus Food</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => router.push('/shelter')}>
              <Text style={styles.secondaryButtonText}>NGO & Shelter Portal</Text>
            </TouchableOpacity>
          </View>

          {/* Social Proof Stack */}
          <View style={styles.trustedRow}>
            <View style={styles.avatarStack}>
              <View style={[styles.avatarCircle, { backgroundColor: '#bf8062' }]}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <View style={[styles.avatarCircle, { backgroundColor: '#779b88', marginLeft: -8 }]}>
                <Text style={styles.avatarText}>J</Text>
              </View>
              <View style={[styles.avatarCircle, { backgroundColor: '#cb9d4b', marginLeft: -8 }]}>
                <Text style={styles.avatarText}>S</Text>
              </View>
              <View style={[styles.avatarCircle, { backgroundColor: '#18352b', marginLeft: -8 }]}>
                <Text style={styles.avatarText}>+</Text>
              </View>
            </View>
            <Text style={styles.trustedText}>
              Trusted by <Text style={styles.trustedBold}>480+ local partners & shelters</Text>
            </Text>
          </View>

          {/* Native Animated Flow Visual Card */}
          <View style={styles.flowVisualCard}>
            <VideoView
              player={scooterPlayer}
              style={styles.flowVideo}
              contentFit="cover"
              nativeControls={false}
            />
          </View>
        </View>

        {/* Ticker Banner */}
        <View style={styles.tickerBanner}>
          <Text style={styles.tickerText}>
            EVERY RESCUE COUNTS · <Text style={styles.tickerHighlight}>23,841 KG</Text> KEPT IN USE THIS MONTH
          </Text>
        </View>

        {/* Streamlined Problem & Impact Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.eyebrowBadge}>
            <Text style={styles.eyebrowText}>THE GAP IS REAL</Text>
          </View>
          <Text style={styles.sectionTitle}>
            There is enough food.{'\n'}
            <Text style={styles.heroTitleHighlight}>It just needs to move.</Text>
          </Text>

          <View style={styles.statPillsRow}>
            <View style={styles.statPillCard}>
              <Text style={styles.statPillValue}>40%</Text>
              <Text style={styles.statPillLabel}>of food is wasted</Text>
            </View>
            <View style={styles.statPillCard}>
              <Text style={styles.statPillValue}>1 in 8</Text>
              <Text style={styles.statPillLabel}>face food insecurity</Text>
            </View>
          </View>
        </View>

        {/* Mobile Impact Calculator */}
        <View style={styles.sectionContainer}>
          <View style={styles.eyebrowBadge}>
            <Calculator size={13} color="#829283" style={{ marginRight: 4 }} />
            <Text style={styles.eyebrowText}>IMPACT ESTIMATOR</Text>
          </View>
          <Text style={styles.sectionTitle}>
            Calculate your{'\n'}
            <Text style={styles.heroTitleHighlight}>potential rescue.</Text>
          </Text>

          <View style={styles.calcCard}>
            <View style={styles.calcHeaderRow}>
              <Utensils size={18} color="#18352b" />
              <Text style={styles.calcHeaderTitle}>Daily Surplus Estimator</Text>
            </View>

            <Text style={styles.inputLabel}>Average Daily Surplus (in KG)</Text>
            <TextInput
              style={styles.calcInput}
              keyboardType="numeric"
              value={kgPerDay}
              onChangeText={setKgPerDay}
              placeholder="e.g. 25"
              placeholderTextColor="#a0aaa3"
            />

            <View style={styles.calcResultsGrid}>
              <View style={styles.calcResultBox}>
                <Text style={styles.calcResultVal}>{estimatedMealsMonthly.toLocaleString()}</Text>
                <Text style={styles.calcResultSub}>MEALS / MONTH</Text>
              </View>

              <View style={styles.calcResultBox}>
                <Text style={styles.calcResultVal}>{estimatedCo2Saved.toLocaleString()} kg</Text>
                <Text style={styles.calcResultSub}>CO₂ PREVENTED</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4-Step Workflow Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.eyebrowBadge}>
            <Text style={styles.eyebrowText}>THE RESCUE NETWORK</Text>
          </View>
          <Text style={styles.sectionTitle}>
            From surplus{'\n'}
            <Text style={styles.heroTitleHighlight}>to shared.</Text>
          </Text>

          <View style={styles.stepsStack}>
            {steps.map((step) => {
              const IconComp = step.icon;
              return (
                <View style={styles.stepCard} key={step.number}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                  <View style={[styles.stepIconBadge, { backgroundColor: step.bgColor }]}>
                    <IconComp size={20} color={step.iconColor} />
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.text}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Mobile Native App Hub Banner (Replacing Website Footer) */}
        <View style={styles.appHubCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Recycle size={18} color="#18352b" strokeWidth={2.6} />
            </View>
            <Text style={styles.brandText}>
              rescue<Text style={styles.brandDot}>.</Text>
            </Text>
          </View>
          <Text style={styles.appHubTitle}>FoodShelter Connect App</Text>
          <Text style={styles.appHubSub}>
            Real-time rescue coordination for kitchens, shelters, and volunteer drivers.
          </Text>

          <View style={styles.appHubActions}>
            <TouchableOpacity
              style={styles.appHubBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/donor')}>
              <PlusCircle size={16} color="#ffffff" />
              <Text style={styles.appHubBtnText}>Food Donor Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.appHubBtnSec}
              activeOpacity={0.8}
              onPress={() => router.push('/shelter')}>
              <Building2 size={16} color="#18352b" />
              <Text style={styles.appHubBtnSecText}>Shelter Portal</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Quick Action Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#93ad32" />
                <Text style={styles.modalTitle}>Quick Access Request</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#18352b" />
              </TouchableOpacity>
            </View>

            {formSubmitted ? (
              <View style={styles.modalSuccessBox}>
                <View style={styles.successIconCircle}>
                  <Check size={26} color="#ffffff" />
                </View>
                <Text style={styles.successTitleText}>Request Received!</Text>
                <Text style={styles.successSubText}>
                  Our rescue team will contact <Text style={{ fontWeight: 'bold' }}>{contactEmail}</Text> shortly.
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalFormStack}>
                <Text style={styles.inputFieldLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#909a93"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={contactEmail}
                  onChangeText={setContactEmail}
                />

                <TouchableOpacity
                  style={styles.modalSubmitButton}
                  activeOpacity={0.85}
                  onPress={handleSubmitForm}>
                  <Text style={styles.modalSubmitButtonText}>Submit Request</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#f4f2eb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  /* Navigation Bar */
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#d7ee85',
    justifyContent: 'center',
    alignItems: 'center',
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
  desktopNavLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#607169',
  },
  navCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18352b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  navCtaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  mobileMenuToggle: {
    padding: 6,
  },

  /* Mobile Drawer */
  mobileDrawer: {
    backgroundColor: '#f8f8f2',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  mobileDrawerItem: {
    paddingVertical: 10,
  },
  mobileDrawerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18352b',
  },
  mobileDrawerCta: {
    backgroundColor: '#18352b',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  mobileDrawerCtaText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },

  /* Hero Section */
  heroSection: {
    marginBottom: 36,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#98c941',
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#829283',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: IS_MOBILE ? 40 : 60,
    fontWeight: '800',
    color: '#18352b',
    lineHeight: IS_MOBILE ? 44 : 64,
    letterSpacing: -1.8,
    marginBottom: 14,
  },
  heroTitleHighlight: {
    color: '#9fbd42',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6c7b73',
    lineHeight: 22,
    marginBottom: 22,
  },
  heroActionsRow: {
    flexDirection: IS_MOBILE ? 'column' : 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#18352b',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#d7ee85',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#18352b',
    fontWeight: '800',
    fontSize: 14,
  },

  /* Social Proof */
  trustedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f4f2eb',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  trustedText: {
    fontSize: 12,
    color: '#809087',
  },
  trustedBold: {
    color: '#18352b',
    fontWeight: '700',
  },

  /* Flow Visual Card */
  flowVisualCard: {
    backgroundColor: '#18352b',
    borderRadius: 28,
    padding: 0,
    borderWidth: 1,
    borderColor: '#d5dec9',
    position: 'relative',
    minHeight: 320,
    height: 320,
    overflow: 'hidden',
  },
  flowVideo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
    zIndex: 1,
  },
  flowKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 5,
  },
  flowKickerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#eff7d8',
    letterSpacing: 1,
  },
  svgContainer: {
    position: 'absolute',
    inset: 0,
    top: 20,
  },
  nodesOverlay: {
    marginVertical: 10,
    gap: 12,
    zIndex: 5,
  },
  flowNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8f8f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  flowIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowNodeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#18352b',
  },
  flowNodeSub: {
    fontSize: 10,
    color: '#89988a',
  },
  flowFooterStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 5,
    marginTop: 12,
  },
  flowFooterStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#eff7d8',
    letterSpacing: 1,
  },

  /* Ticker */
  tickerBanner: {
    backgroundColor: '#18352b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 36,
  },
  tickerText: {
    color: '#c2cec0',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  tickerHighlight: {
    color: '#d7ee85',
    fontWeight: '800',
  },

  /* Section Common */
  sectionContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: IS_MOBILE ? 32 : 44,
    fontWeight: '800',
    color: '#18352b',
    lineHeight: IS_MOBILE ? 36 : 48,
    letterSpacing: -1.5,
    marginVertical: 10,
  },

  /* Stat Pills */
  statPillsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  statPillCard: {
    flex: 1,
    backgroundColor: '#f7f7f2',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  statPillValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#18352b',
  },
  statPillLabel: {
    fontSize: 11,
    color: '#849189',
    marginTop: 4,
    fontWeight: '600',
  },

  /* Calculator */
  calcCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dce2d8',
    gap: 14,
  },
  calcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calcHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#18352b',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6c7b73',
    letterSpacing: 0.5,
  },
  calcInput: {
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#d5dec9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#18352b',
  },
  calcResultsGrid: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f4f2eb',
    borderRadius: 16,
    padding: 16,
  },
  calcResultBox: {
    flex: 1,
    alignItems: 'center',
  },
  calcResultVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#9fbd42',
  },
  calcResultSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6c7b73',
    marginTop: 4,
  },

  /* Steps Stack */
  stepsStack: {
    gap: 14,
    marginTop: 10,
  },
  stepCard: {
    backgroundColor: '#f7f7f2',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dce2d8',
    position: 'relative',
  },
  stepNumberText: {
    position: 'absolute',
    top: 18,
    right: 18,
    fontSize: 12,
    fontWeight: '800',
    color: '#aab6a7',
  },
  stepIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18352b',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: '#7e8b83',
    lineHeight: 19,
  },

  /* App Hub Card (Replacing Website Footer) */
  appHubCard: {
    backgroundColor: '#f7f7f2',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: '#dce2d8',
    marginTop: 10,
    marginBottom: 20,
    gap: 12,
  },
  appHubTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#18352b',
  },
  appHubSub: {
    fontSize: 13,
    color: '#6c7b73',
    lineHeight: 19,
  },
  appHubActions: {
    flexDirection: IS_MOBILE ? 'column' : 'row',
    gap: 10,
    marginTop: 6,
  },
  appHubBtn: {
    backgroundColor: '#18352b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appHubBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  appHubBtnSec: {
    backgroundColor: '#d7ee85',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appHubBtnSecText: {
    color: '#18352b',
    fontWeight: '800',
    fontSize: 13,
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
    maxWidth: 440,
    backgroundColor: '#faf9f5',
    borderRadius: 24,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18352b',
  },
  modalFormStack: {
    gap: 12,
  },
  inputFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#18352b',
    letterSpacing: 0.8,
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce2d8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#18352b',
  },
  modalSubmitButton: {
    backgroundColor: '#18352b',
    borderRadius: 100,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  modalSuccessBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#91bc48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#18352b',
  },
  successSubText: {
    fontSize: 13,
    color: '#6c7b73',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalCloseButton: {
    backgroundColor: '#18352b',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
