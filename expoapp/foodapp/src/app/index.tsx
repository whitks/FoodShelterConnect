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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

const steps = [
  {
    number: '01',
    title: 'Post surplus',
    text: 'Share what food is ready, quantity, and pickup window in under 60 seconds.',
    icon: Utensils,
    bgColor: '#e6f0c9',
    iconColor: '#7ea441',
  },
  {
    number: '02',
    title: 'Get matched',
    text: 'Algorithm pairs you with the nearest shelter or NGO with matching capacity.',
    icon: MapPin,
    bgColor: '#f9ddcb',
    iconColor: '#d68154',
  },
  {
    number: '03',
    title: 'Coordinate pickup',
    text: 'A verified local volunteer driver accepts the route with live GPS updates.',
    icon: Truck,
    bgColor: '#dcece9',
    iconColor: '#5c9686',
  },
  {
    number: '04',
    title: 'Deliver impact',
    text: 'Fresh food arrives safely. Every rescue is logged, certified, and tracked.',
    icon: HeartHandshake,
    bgColor: '#e6e0ef',
    iconColor: '#8871a4',
  },
];

const roles = [
  {
    icon: Utensils,
    eyebrow: 'For food businesses',
    title: 'Turn today’s extra into someone’s next meal.',
    text: 'Post surplus in 60 seconds, set pickup windows, and get certified tax deduction logs.',
    link: 'Start donating',
    tone: 'lime',
    type: 'donor',
  },
  {
    icon: Building2,
    eyebrow: 'For shelters & orgs',
    title: 'Bring fresh surplus directly to your community.',
    text: 'Specify what capacity and storage you have. Get linked to nearby kitchens and bakeries.',
    link: 'Join the network',
    tone: 'cream',
    type: 'shelter',
  },
  {
    icon: Bike,
    eyebrow: 'For volunteers',
    title: 'Make one small 15-min trip matter.',
    text: 'Accept rescue routes near your location, follow turn-by-turn directions, and see impact live.',
    link: 'Rescue a route',
    tone: 'cream',
    type: 'volunteer',
  },
];

export default function MobileFirstLandingPage() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'donor' | 'shelter' | 'volunteer'>('donor');

  // Calculator state
  const [kgPerDay, setKgPerDay] = useState('25');
  const numericKg = parseFloat(kgPerDay) || 0;
  const estimatedMealsMonthly = Math.round(numericKg * 2.2 * 30);
  const estimatedCo2Saved = Math.round(numericKg * 2.5 * 30);

  // Form state
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [orgName, setOrgName] = useState('');
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
          { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom + 40 },
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
              <TouchableOpacity onPress={() => handleOpenModal('donor')}>
                <Text style={styles.navLinkText}>How it works</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpenModal('donor')}>
                <Text style={styles.navLinkText}>Calculator</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpenModal('donor')}>
                <Text style={styles.navLinkText}>For Businesses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navCtaButton}
                activeOpacity={0.8}
                onPress={() => handleOpenModal('donor')}>
                <Text style={styles.navCtaText}>Join Network</Text>
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
              onPress={() => setMenuOpen(false)}>
              <Text style={styles.mobileDrawerText}>How it works</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileDrawerItem}
              onPress={() => setMenuOpen(false)}>
              <Text style={styles.mobileDrawerText}>Impact Estimator</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileDrawerItem}
              onPress={() => setMenuOpen(false)}>
              <Text style={styles.mobileDrawerText}>For Businesses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileDrawerCta}
              onPress={() => {
                setMenuOpen(false);
                handleOpenModal('donor');
              }}>
              <Text style={styles.mobileDrawerCtaText}>Join Network</Text>
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
            Rescue connects surplus food from local kitchens and markets directly with shelters and people in need — before the clock runs out.
          </Text>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => handleOpenModal('donor')}>
              <Text style={styles.primaryButtonText}>Donate surplus</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.7}
              onPress={() => handleOpenModal('shelter')}>
              <Text style={styles.secondaryButtonText}>Join Shelter Network</Text>
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
            <View style={styles.flowKickerRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.flowKickerText}>LIVE ROUTE · 07 MIN LEFT</Text>
            </View>

            {/* Native SVG Route Graphic */}
            <View style={styles.svgContainer}>
              <Svg width="100%" height="220" viewBox="0 0 340 220">
                <Path
                  d="M 30 50 C 90 20, 130 110, 170 90 S 230 40, 310 60"
                  fill="none"
                  stroke="#21493b"
                  strokeWidth="3"
                  strokeDasharray="4, 6"
                />
                <Path
                  d="M 50 170 C 110 200, 160 130, 210 150 S 270 190, 310 160"
                  fill="none"
                  stroke="#9dbf68"
                  strokeWidth="3"
                  strokeDasharray="4, 6"
                />
              </Svg>
            </View>

            {/* Floating Flow Nodes */}
            <View style={styles.nodesOverlay}>
              <View style={[styles.flowNode, { top: 20, left: 10 }]}>
                <View style={[styles.flowIconBox, { backgroundColor: '#dd835d' }]}>
                  <Utensils size={15} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.flowNodeTitle}>Kitchen</Text>
                  <Text style={styles.flowNodeSub}>Olive & Grain · 15kg</Text>
                </View>
              </View>

              <View style={[styles.flowNode, { top: 90, alignSelf: 'center' }]}>
                <View style={[styles.flowIconBox, { backgroundColor: '#7da750' }]}>
                  <Bike size={15} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.flowNodeTitle}>Volunteer Driver</Text>
                  <Text style={styles.flowNodeSub}>Amara · en route</Text>
                </View>
              </View>

              <View style={[styles.flowNode, { bottom: 20, right: 10 }]}>
                <View style={[styles.flowIconBox, { backgroundColor: '#729798' }]}>
                  <HeartHandshake size={15} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.flowNodeTitle}>Shelter</Text>
                  <Text style={styles.flowNodeSub}>Harbor House NGO</Text>
                </View>
              </View>
            </View>

            <View style={styles.flowFooterStatus}>
              <View style={[styles.pulseDot, { backgroundColor: '#91bc48' }]} />
              <Text style={styles.flowFooterStatusText}>COORDINATED IN REAL TIME</Text>
            </View>
          </View>
        </View>

        {/* Ticker Banner */}
        <View style={styles.tickerBanner}>
          <Text style={styles.tickerText}>
            EVERY RESCUE COUNTS · <Text style={styles.tickerHighlight}>23,841 KG</Text> KEPT IN USE THIS MONTH · ♥ BUILT BY NEIGHBORS
          </Text>
        </View>

        {/* Problem Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.eyebrowBadge}>
            <Text style={styles.eyebrowText}>THE GAP IS REAL</Text>
          </View>
          <Text style={styles.sectionTitle}>
            There is enough food.{'\n'}
            <Text style={styles.heroTitleHighlight}>It just needs to move.</Text>
          </Text>
          <Text style={styles.sectionBody}>
            Every day, perfectly good food leaves commercial kitchens while community shelters nearby go without. The problem isn’t willingness — it’s the missing real-time connection between surplus, timing, distance, and capacity.
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
          <Text style={styles.sectionBody}>
            Not a static directory. A live mobile coordination layer for the exact moments when food needs somewhere to go — right now.
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

        {/* Live Network Dark Section */}
        <View style={styles.darkSection}>
          <View style={styles.eyebrowBadgeLight}>
            <View style={[styles.pulseDot, { backgroundColor: '#d7ee85' }]} />
            <Text style={styles.eyebrowTextLight}>THE LIVE LAYER</Text>
          </View>
          <Text style={styles.darkSectionTitle}>
            Timing changes{'\n'}
            <Text style={{ color: '#d7ee85' }}>everything.</Text>
          </Text>
          <Text style={styles.darkSectionBody}>
            Rescue sees what’s available, which shelters have storage, and who can get there — then connects everyone while food is fresh.
          </Text>

          {/* Live Map Card */}
          <View style={styles.networkCardDark}>
            <View style={styles.networkHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.pulseDot, { backgroundColor: '#91bc48' }]} />
                <Text style={styles.networkStatusText}>Live network</Text>
              </View>
              <Text style={styles.networkTimeText}>Active Now</Text>
            </View>

            <View style={styles.mapGridBox}>
              <View style={[styles.mapPin, { top: 20, left: 30, backgroundColor: '#df8960' }]}>
                <Utensils size={12} color="#ffffff" />
              </View>
              <View style={[styles.mapPin, { top: 80, right: 40, backgroundColor: '#79a948' }]}>
                <Bike size={12} color="#ffffff" />
              </View>
              <View style={[styles.mapPin, { bottom: 20, left: 70, backgroundColor: '#7b9fa0' }]}>
                <HeartHandshake size={12} color="#ffffff" />
              </View>
              <View style={styles.mapCenterPin}>
                <Route size={16} color="#d7ee85" />
              </View>
            </View>

            <View style={styles.networkFooterRow}>
              <View style={styles.netStatCol}>
                <Text style={styles.netStatVal}>8</Text>
                <Text style={styles.netStatSub}>Donors active</Text>
              </View>
              <View style={styles.netStatCol}>
                <Text style={styles.netStatVal}>14</Text>
                <Text style={styles.netStatSub}>Drivers nearby</Text>
              </View>
              <View style={styles.netStatCol}>
                <Text style={styles.netStatVal}>6</Text>
                <Text style={styles.netStatSub}>Shelters ready</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Roles Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.eyebrowBadge}>
            <Text style={styles.eyebrowText}>THERE’S A PLACE FOR YOU HERE</Text>
          </View>
          <Text style={styles.sectionTitle}>
            Many hands.{'\n'}
            <Text style={styles.heroTitleHighlight}>One shared table.</Text>
          </Text>

          <View style={styles.rolesStack}>
            {roles.map((role) => {
              const IconComponent = role.icon;
              const isLime = role.tone === 'lime';
              return (
                <View
                  style={[styles.roleCard, isLime ? styles.roleCardLime : styles.roleCardCream]}
                  key={role.title}>
                  <View style={styles.roleIconBox}>
                    <IconComponent size={22} color="#18352b" />
                  </View>
                  <Text style={styles.roleEyebrow}>{role.eyebrow}</Text>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleText}>{role.text}</Text>

                  <TouchableOpacity
                    style={styles.roleArrowLink}
                    activeOpacity={0.8}
                    onPress={() => handleOpenModal(role.type as any)}>
                    <Text style={styles.roleLinkText}>{role.link}</Text>
                    <ArrowRight size={15} color="#18352b" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Impact Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.eyebrowBadge}>
            <Text style={styles.eyebrowText}>SMALL ACTIONS, VISIBLE CHANGE</Text>
          </View>
          <Text style={styles.sectionTitle}>
            The numbers{'\n'}
            <Text style={styles.heroTitleHighlight}>tell the story.</Text>
          </Text>

          <View style={styles.impactGrid}>
            <View style={styles.impactStatCard}>
              <View style={[styles.impactIconBox, { backgroundColor: '#e5f0c5' }]}>
                <PackageCheck size={18} color="#80a542" />
              </View>
              <Text style={styles.impactStatVal}>186,420</Text>
              <Text style={styles.impactStatLabel}>kg food rescued</Text>
            </View>

            <View style={styles.impactStatCard}>
              <View style={[styles.impactIconBox, { backgroundColor: '#f8decb' }]}>
                <HeartHandshake size={18} color="#d87d51" />
              </View>
              <Text style={styles.impactStatVal}>421,800</Text>
              <Text style={styles.impactStatLabel}>meals shared</Text>
            </View>

            <View style={styles.impactStatCard}>
              <View style={[styles.impactIconBox, { backgroundColor: '#dcebe7' }]}>
                <ShieldCheck size={18} color="#639486" />
              </View>
              <Text style={styles.impactStatVal}>9,240</Text>
              <Text style={styles.impactStatLabel}>successful rescues</Text>
            </View>

            <View style={styles.impactStatCard}>
              <View style={[styles.impactIconBox, { backgroundColor: '#e8dfef' }]}>
                <Users size={18} color="#8a70a3" />
              </View>
              <Text style={styles.impactStatVal}>480+</Text>
              <Text style={styles.impactStatLabel}>local partners</Text>
            </View>
          </View>
        </View>

        {/* Join CTA Box */}
        <View style={styles.joinContainer}>
          <View style={styles.joinCard}>
            <Text style={styles.joinTitle}>
              Let’s make sure{'\n'}
              <Text style={{ color: '#18352b' }}>nothing good goes to waste.</Text>
            </Text>
            <Text style={styles.joinSub}>
              Start with one rescue. We handle connections, real-time coordination, and tax logs.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => handleOpenModal('donor')}>
              <Text style={styles.primaryButtonText}>Join the Rescue network</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Recycle size={15} color="#18352b" strokeWidth={2.6} />
            </View>
            <Text style={styles.brandText}>
              rescue<Text style={styles.brandDot}>.</Text>
            </Text>
          </View>
          <Text style={styles.footerTagline}>Food has a place. Find it.</Text>
          <Text style={styles.footerCopy}>© 2026 FoodShelter Connect · Rescue Mobile App</Text>
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
                <Text style={styles.modalTitle}>
                  {selectedRole === 'donor'
                    ? 'Donate Food Surplus'
                    : selectedRole === 'shelter'
                    ? 'Register Shelter / NGO'
                    : 'Become Volunteer Driver'}
                </Text>
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
                <Text style={styles.successTitleText}>You’re on the list!</Text>
                <Text style={styles.successSubText}>
                  Our local rescue team will contact <Text style={{ fontWeight: 'bold' }}>{contactEmail}</Text> within 2 hours.
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalFormStack}>
                <Text style={styles.formInstructionText}>
                  Submit your details to request immediate pickup or register your shelter.
                </Text>

                <Text style={styles.inputFieldLabel}>ORGANIZATION / FULL NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Green Bakery or John Doe"
                  placeholderTextColor="#909a93"
                  value={orgName}
                  onChangeText={setOrgName}
                />

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
    marginBottom: 40,
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
    fontSize: IS_MOBILE ? 42 : 64,
    fontWeight: '800',
    color: '#18352b',
    lineHeight: IS_MOBILE ? 46 : 68,
    letterSpacing: -2,
    marginBottom: 16,
  },
  heroTitleHighlight: {
    color: '#9fbd42',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6c7b73',
    lineHeight: 24,
    marginBottom: 24,
  },
  heroActionsRow: {
    flexDirection: IS_MOBILE ? 'column' : 'row',
    gap: 12,
    marginBottom: 28,
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
    marginBottom: 28,
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
    backgroundColor: '#e7eddc',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d5dec9',
    position: 'relative',
    minHeight: 260,
    justifyContent: 'space-between',
    overflow: 'hidden',
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
    color: '#66805e',
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
    shadowColor: '#18352b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
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
    color: '#678064',
    letterSpacing: 1,
  },

  /* Ticker */
  tickerBanner: {
    backgroundColor: '#18352b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 40,
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
    marginBottom: 48,
  },
  sectionTitle: {
    fontSize: IS_MOBILE ? 34 : 48,
    fontWeight: '800',
    color: '#18352b',
    lineHeight: IS_MOBILE ? 38 : 52,
    letterSpacing: -1.5,
    marginVertical: 12,
  },
  sectionBody: {
    fontSize: 15,
    color: '#687970',
    lineHeight: 23,
    marginBottom: 24,
  },

  /* Stat Pills */
  statPillsRow: {
    flexDirection: 'row',
    gap: 14,
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
    gap: 16,
  },
  stepCard: {
    backgroundColor: '#f7f7f2',
    padding: 22,
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
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18352b',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: '#7e8b83',
    lineHeight: 20,
  },

  /* Dark Section */
  darkSection: {
    backgroundColor: '#18352b',
    borderRadius: 28,
    padding: 24,
    marginBottom: 48,
  },
  eyebrowBadgeLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eyebrowTextLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b9d18d',
    letterSpacing: 1.2,
  },
  darkSectionTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 38,
    letterSpacing: -1,
    marginBottom: 12,
  },
  darkSectionBody: {
    fontSize: 14,
    color: '#adbbb0',
    lineHeight: 22,
    marginBottom: 24,
  },
  networkCardDark: {
    backgroundColor: '#f6f7ef',
    borderRadius: 20,
    padding: 18,
  },
  networkHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#18352b',
  },
  networkTimeText: {
    fontSize: 10,
    color: '#87968c',
  },
  mapGridBox: {
    height: 160,
    backgroundColor: '#dfe8d8',
    borderRadius: 14,
    position: 'relative',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  mapCenterPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18352b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e6dc',
    paddingTop: 12,
  },
  netStatCol: {
    alignItems: 'center',
  },
  netStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18352b',
  },
  netStatSub: {
    fontSize: 10,
    color: '#849087',
    marginTop: 2,
  },

  /* Roles */
  rolesStack: {
    gap: 16,
  },
  roleCard: {
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  roleCardLime: {
    backgroundColor: '#d7ee85',
  },
  roleCardCream: {
    backgroundColor: '#f7f7f2',
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#788b62',
    letterSpacing: 1,
    marginBottom: 6,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#18352b',
    marginBottom: 8,
    lineHeight: 24,
  },
  roleText: {
    fontSize: 13,
    color: '#687970',
    lineHeight: 20,
    marginBottom: 18,
  },
  roleArrowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#18352b',
  },

  /* Impact */
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  impactStatCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#f7f7f2',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dce2d8',
  },
  impactIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  impactStatVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18352b',
  },
  impactStatLabel: {
    fontSize: 11,
    color: '#849189',
    marginTop: 2,
  },

  /* Join Box */
  joinContainer: {
    marginBottom: 48,
  },
  joinCard: {
    backgroundColor: '#e2edbe',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: '#d2e2aa',
  },
  joinTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#18352b',
    lineHeight: 34,
    marginBottom: 10,
  },
  joinSub: {
    fontSize: 14,
    color: '#586b53',
    lineHeight: 21,
    marginBottom: 20,
  },

  /* Footer */
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#dce2d8',
    paddingTop: 24,
    paddingBottom: 20,
    gap: 10,
  },
  footerTagline: {
    fontSize: 13,
    color: '#687970',
    fontWeight: '600',
  },
  footerCopy: {
    fontSize: 11,
    color: '#909a93',
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
  formInstructionText: {
    fontSize: 13,
    color: '#6c7b73',
    lineHeight: 19,
    marginBottom: 6,
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
