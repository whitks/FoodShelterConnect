<<<<<<< Updated upstream
import { useState } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import {
  ArrowRight, ArrowUpRight, Bike, Building2, Calculator, Camera, Check,
  CheckCircle2, Clock3, HeartHandshake, MapPin, Menu, Minus, Package,
  PackageCheck, Plus, Recycle, RefreshCw, ShieldCheck, Sparkles, Store,
  Truck, Utensils, User, X,
=======
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  Building2,
  Calculator,
  Check,
  HeartHandshake,
  MapPin,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Utensils,
  X,
  LayoutDashboard,
  LogOut,
  User as UserIcon
>>>>>>> Stashed changes
} from 'lucide-react';
import { api, type User } from './api';
import './index.css';

type Role = 'donor' | 'shelter' | 'volunteer';
type DonorTab = 'donate' | 'basket' | 'active' | 'needs';

<<<<<<< Updated upstream
const donorTypes = [
  ['restaurant', 'Restaurant / Cafe', 'Bistros, cafes, bakeries & fine dining', Utensils],
  ['grocery', 'Grocery Shop', 'Supermarkets, marts & produce stores', Store],
  ['individual', 'Individual', 'Home cooks, family events, residents', User],
  ['catering', 'Catering Service', 'Event caterers, banquet kitchens', Package],
  ['mess', 'Mess / Hostel Kitchen', 'College mess, worker canteens', Building2],
] as const;

const menuItems = [
  ['dal', 'Dal Makhani Container', 'KG'], ['roti', 'Butter Tandoori Roti', 'Pcs'],
  ['paneer', 'Paneer Butter Masala Tray', 'Servings'], ['rice', 'Jeera Rice Container', 'KG'],
  ['pastry', 'Fresh Sandwich / Pastry Box', 'Boxes'], ['sweet', 'Gulab Jamun / Sweet Box', 'Pcs'],
] as const;

const steps = [
  ['01', 'Post surplus', 'Add the food, quantity, and pickup window in under 60 seconds.', Utensils],
  ['02', 'Get matched', 'Nearby shelters surface the rescue that fits their capacity right now.', MapPin],
  ['03', 'Coordinate pickup', 'A verified volunteer accepts the route and keeps everyone in sync.', Truck],
  ['04', 'Deliver impact', 'Every meal arrives safely, with a clear record of the rescue.', HeartHandshake],
] as const;

const roleContent: Record<Role, { eyebrow: string; title: string; copy: string; button: string }> = {
  donor: { eyebrow: 'FOOD DONOR PORTAL', title: "Turn tonight's extra into someone's next meal.", copy: 'Post cooked meals, bakery stock, or event surplus. Rescue handles the match and pickup coordination.', button: 'Post a donation' },
  shelter: { eyebrow: 'SHELTER PORTAL', title: 'Bring fresh surplus straight to your residents.', copy: 'Share your capacity and dietary needs, then claim nearby food before its best-by window closes.', button: 'Request food' },
  volunteer: { eyebrow: 'VOLUNTEER ROUTES', title: 'Make one small trip matter today.', copy: 'Pick up a verified route near you, follow the handoff, and see the impact land in real time.', button: 'See a route' },
};

function Brand({ onClick }: { onClick?: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="Rescue home"><span className="brand-mark"><Recycle size={18} strokeWidth={2.6} /></span><span>rescue<span className="brand-dot">.</span></span></button>;
}

function RevealSection({ children, className, id }: { children: React.ReactNode; className: string; id?: string }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.18 });
  return <section ref={ref} className={`${className} scroll-reveal${inView ? ' is-visible' : ''}`} id={id}>{children}</section>;
}
=======
const roles = [
  {
    icon: Utensils,
    eyebrow: 'For food businesses',
    title: 'Turn today\'s extra into someone\'s next meal.',
    text: 'Post surplus in 60 seconds, set pickup windows, and get certified tax deduction logs.',
    link: 'Start donating',
    tone: '#eef6d4',
    type: 'donor',
  },
  {
    icon: Building2,
    eyebrow: 'For shelters & orgs',
    title: 'Bring fresh surplus directly to your community.',
    text: 'Specify what capacity and storage you have. Get linked to nearby kitchens and bakeries.',
    link: 'Join the network',
    tone: '#f8f8f2',
    type: 'shelter',
  },
  {
    icon: Bike,
    eyebrow: 'For volunteers',
    title: 'Make one small 15-min trip matter.',
    text: 'Accept rescue routes near your location, follow turn-by-turn directions, and see impact live.',
    link: 'Rescue a route',
    tone: '#f8f8f2',
    type: 'volunteer',
  },
];
>>>>>>> Stashed changes

function ProtectedRoute() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      navigate('/login');
    }
    setChecking(false);
  }, [navigate]);

  if (checking) {
    return (
      <div className="root-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#607169' }}>Loading...</div>
      </div>
    );
  }

  return api.isAuthenticated() ? <Outlet /> : <Navigate to="/login" />;
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="root-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="auth-card" style={{ width: '100%', maxWidth: '420px', background: '#f7f7f2', borderRadius: '20px', padding: '2.5rem', border: '1px solid #dce2d8', boxShadow: '6px 6px 14px rgba(48,69,58,.11)' }}>
        <div className="card-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-badge" style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#d7ee85', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Recycle size={22} color="#18352b" strokeWidth={2.6} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#18352b', margin: '0 0 0.5rem' }}>Welcome Back</h1>
          <p style={{ color: '#6c7b73', margin: 0 }}>Sign in to access your dashboard</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#ffe6e6', border: '1px solid #ffcccc', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#c0392b', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#18352b', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                border: '1px solid #dce2d8',
                backgroundColor: '#faf9f5',
                fontSize: '1rem',
                color: '#18352b',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#18352b', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                border: '1px solid #dce2d8',
                backgroundColor: '#faf9f5',
                fontSize: '1rem',
                color: '#18352b',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '12px',
              backgroundColor: '#18352b',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 800,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In & Open Portal'}
            <ArrowRight size={16} color="#ffffff" />
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#6c7b73', fontSize: '0.9rem' }}>
          New here? <a href="/" style={{ color: '#18352b', fontWeight: 700 }}>Join the network</a>
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = api.getStoredUser();
    if (stored) {
      setUser(stored);
      setLoading(false);
    } else {
      api.getMe()
        .then(u => {
          setUser(u);
          setLoading(false);
        })
        .catch(() => {
          api.logout();
          navigate('/login');
        });
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="root-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#607169' }}>Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const roleLabels: Record<string, string> = {
    donor: 'Food Donor',
    shelter: 'Shelter / NGO',
    volunteer: 'Volunteer Driver',
    admin: 'Administrator',
  };

  return (
    <div className="root-container">
      <nav className="nav-bar">
        <div className="brand-row" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="brand-badge">
            <Recycle size={18} color="#18352b" strokeWidth={2.6} />
          </div>
          <div className="brand-text">
            spoonful<span className="brand-dot">.</span>
          </div>
        </div>
        <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
            <LayoutDashboard size={18} /> Dashboard
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', backgroundColor: '#f7f7f2', borderRadius: '9999px', border: '1px solid #dce2d8' }}>
            <UserIcon size={16} color="#18352b" />
            <span style={{ fontSize: '0.85rem', color: '#18352b' }}>{user?.name || 'User'}</span>
            <span style={{ color: '#6c7b73', fontSize: '0.7rem', textTransform: 'capitalize' }}>{roleLabels[user?.role || ''] || user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              backgroundColor: '#fff',
              border: '1px solid #dce2d8',
              color: '#18352b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      <main style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome back, {user?.name || 'User'}</h1>
          <p style={{ color: '#607169', fontSize: '1.1rem' }}>Your <strong>{roleLabels[user?.role || ''] || user?.role}</strong> dashboard</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#d7ee85', width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Utensils size={20} color="#18352b" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>New Donation</h3>
            <p style={{ color: '#607169', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>Post a new food surplus batch to be rescued by nearby volunteers.</p>
            <button className="primary-button" style={{ width: '100%', justifyContent: 'center' }}>
              Create Listing <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#e6e0ef', width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Check size={20} color="#8871a4" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Your Impact</h3>
            <p style={{ color: '#607169', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>See how many meals you've provided and your CO2 savings.</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>120</span>
              <span style={{ color: '#607169', paddingBottom: '0.4rem', fontWeight: 600 }}>meals shared</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#f9ddcb', width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <ShieldCheck size={20} color="#d68154" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Active Rescues</h3>
            <p style={{ color: '#607169', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>Track live deliveries and manage pickup coordination.</p>
            <button className="secondary-button" style={{ width: '100%', justifyContent: 'center' }}>
              View Rescues <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function LandingPage() {
<<<<<<< Updated upstream
=======
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState('donor');
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Calculator states
  const [kgPerDay, setKgPerDay] = useState('25');
  const numericKg = parseFloat(kgPerDay) || 0;
  const estimatedMealsMonthly = Math.round(numericKg * 2.2 * 30);
  const estimatedCo2Saved = Math.round(numericKg * 2.5 * 30);

>>>>>>> Stashed changes
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<Role>('donor');
  const [modalRole, setModalRole] = useState<Role | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [kgPerDay, setKgPerDay] = useState('25');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const numericKg = Number(kgPerDay) || 0;
  const meals = Math.round(numericKg * 2.2 * 30);
  const co2 = Math.round(numericKg * 2.5 * 30);
  const role = roleContent[activeRole];
  const openModal = (nextRole: Role) => { setModalRole(nextRole); setSubmitted(false); setMenuOpen(false); };
  const submitForm = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (email.trim()) setSubmitted(true); };

  return <div className="site-shell">
    <header className="site-nav shell-width"><Brand /><nav className={menuOpen ? 'nav-links is-open' : 'nav-links'}><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#impact" onClick={() => setMenuOpen(false)}>Our impact</a><a href="#roles" onClick={() => setMenuOpen(false)}>For partners</a><button className="nav-cta" onClick={() => openModal('donor')}>Join the network <ArrowUpRight size={15} /></button></nav><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></header>
    <main>
      <section className="hero shell-width"><div className="hero-copy reveal"><div className="eyebrow"><span className="pulse" /> LIVE ACROSS BENGALURU</div><h1>Good food.<br /><em>Right place.</em><br />Right now.</h1><p className="hero-text">Spoonful connects surplus food from local kitchens with shelters and neighbors who need it, before the clock runs out.</p><div className="hero-actions"><button className="button button-primary" onClick={() => openModal('donor')}>Donate surplus <ArrowRight size={16} /></button><a className="text-link" href="#roles">Explore the network <span>↗</span></a></div><div className="trusted"><div className="avatar-stack"><span className="avatar av-one">M</span><span className="avatar av-two">J</span><span className="avatar av-three">S</span><span className="avatar av-four">+</span></div><span>Trusted by <strong>480+ local partners</strong></span></div></div>
        <div className="flow-visual" aria-label="Scooter volunteer carrying a food rescue"><video className="flow-video" autoPlay muted loop playsInline preload="auto" disablePictureInPicture tabIndex={-1} onPause={(event) => { event.currentTarget.play().catch(() => undefined); }} onContextMenu={(event) => event.preventDefault()}><source src="/scootervideo.mp4" type="video/mp4" />Your browser does not support video playback.</video><div className="flow-video-shade" /><div className="flow-kicker"><span className="pulse" /> LIVE ROUTE · 07 MIN LEFT</div><div className="flow-status"><span className="pulse" /> COORDINATED IN REAL TIME</div></div>
      </section>
      <div className="ticker"><div className="ticker-inner shell-width"><span>EVERY RESCUE COUNTS</span><i /> <strong>23,841 KG</strong><span>KEPT IN USE THIS MONTH</span><span className="ticker-heart">♥</span><span>BUILT BY NEIGHBORS</span></div></div>
      <RevealSection className="section-grid shell-width"><div className="section-intro"><div className="eyebrow">THE GAP IS REAL</div><h2>There is enough food.<br /><em>It just needs to move.</em></h2></div><div><p className="large-copy">Every day, perfectly good food leaves commercial kitchens while nearby shelters go without. The missing piece is a real-time connection between <strong>surplus, timing, distance, and capacity.</strong></p><div className="stat-pills"><div><strong>40%</strong><span>of food is wasted</span></div><div><strong>1 in 8</strong><span>face food insecurity</span></div></div></div></RevealSection>
      <RevealSection className="solution shell-width" id="how-it-works"><div className="solution-heading"><div><div className="eyebrow">THE RESCUE NETWORK</div><h2>From surplus<br /><em>to shared.</em></h2></div><p>One simple loop for the exact moments when good food needs somewhere to go.</p></div><div className="steps">{steps.map(([number, title, text, Icon]) => <article className="step" key={number}><span className="step-number">{number}</span><span className="step-icon"><Icon size={20} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></RevealSection>
      <RevealSection className="live-section"><div className="live-wrap shell-width"><div className="live-copy"><div className="eyebrow light"><span className="pulse" /> THE NETWORK IS MOVING</div><h2>Good things<br /><em>in motion.</em></h2><p>Every listing is matched by distance, dietary fit, urgency, and verified capacity. No cold spreadsheets. No guesswork.</p><button className="button button-light" onClick={() => openModal('volunteer')}>See a live route <ArrowRight size={16} /></button></div><div className="network-card"><div className="network-header"><span><span className="status-dot green" /> ACTIVE RESCUES</span><span>BENGALURU · NOW</span></div><div className="map-grid"><span className="map-line line-a" /><span className="map-line line-b" /><span className="map-line line-c" /><span className="map-pin pin-a"><Utensils size={14} /></span><span className="map-pin pin-b"><Bike size={14} /></span><span className="map-pin pin-c"><HeartHandshake size={14} /></span><span className="map-center"><Recycle size={18} /></span></div><div className="network-footer"><div><strong>18</strong>active handoffs</div><div><strong>4.2 km</strong>average route</div><div><strong>96%</strong>on time</div></div></div></div></RevealSection>
      <RevealSection className="roles shell-width" id="roles"><div className="center-heading"><div className="eyebrow">THERE IS A PLACE FOR YOU HERE</div><h2>Many hands.<br /><em>One shared table.</em></h2><p>Choose your way into the network. The first rescue can start in under a minute.</p></div><div className="role-grid">{(Object.keys(roleContent) as Role[]).map((key) => { const Icon = key === 'donor' ? Utensils : key === 'shelter' ? Building2 : Bike; return <button className={activeRole === key ? 'role-card active' : 'role-card'} key={key} onClick={() => { setActiveRole(key); if (key === 'volunteer') openModal(key); }}><span className="role-icon"><Icon size={22} /></span><span className="eyebrow">{roleContent[key].eyebrow}</span><h3>{roleContent[key].title}</h3><p>{roleContent[key].copy}</p><span className="arrow-link">{roleContent[key].button} <ArrowRight size={15} /></span></button>; })}</div><div className="role-detail"><div><div className="eyebrow">{role.eyebrow}</div><h3>{role.title}</h3><p>{role.copy}</p></div><button className="button button-primary" onClick={() => openModal(activeRole)}>{role.button} <ArrowRight size={16} /></button></div></RevealSection>
      <RevealSection className="impact shell-width" id="impact"><div className="impact-heading"><div className="eyebrow">SMALL ACTIONS, VISIBLE CHANGE</div><h2>The numbers<br /><em>tell the story.</em></h2><p>A rescue is small to one person and enormous to the person receiving it.</p></div><div className="impact-stats"><div className="impact-stat"><span className="impact-icon"><PackageCheck size={18} /></span><strong>186,420</strong><span>kg food rescued</span></div><div className="impact-stat"><span className="impact-icon"><HeartHandshake size={18} /></span><strong>421,800</strong><span>meals shared</span></div><div className="impact-stat"><span className="impact-icon"><ShieldCheck size={18} /></span><strong>9,240</strong><span>successful rescues</span></div><div className="impact-stat"><span className="impact-icon"><Clock3 size={18} /></span><strong>480+</strong><span>local partners</span></div></div></RevealSection>
      <RevealSection className="calculator shell-width"><div><div className="eyebrow"><Calculator size={13} /> IMPACT ESTIMATOR</div><h2>Make the<br /><em>math visible.</em></h2><p>Tell us what your kitchen could rescue on an average day.</p></div><div className="calc-card"><div className="calc-header"><Utensils size={18} /> Daily surplus estimator</div><label htmlFor="kg">AVERAGE DAILY SURPLUS (KG)</label><div className="calc-input-wrap"><input id="kg" type="number" min="0" value={kgPerDay} onChange={(event) => setKgPerDay(event.target.value)} /><span>kg / day</span></div><div className="calc-results"><div><strong>{meals.toLocaleString()}</strong><span>MEALS / MONTH</span></div><div><strong>{co2.toLocaleString()} kg</strong><span>CO2 PREVENTED</span></div></div><div className="calc-note"><CheckCircle2 size={15} /> Based on 2.2 meals and 2.5 kg CO2 saved per kg rescued.</div></div></RevealSection>
      <section className="join shell-width"><div className="join-inner"><div><div className="eyebrow">START WITH ONE RESCUE</div><h2>Nothing good<br /><em>goes to waste.</em></h2></div><div className="join-side"><p>Join a practical, local network for kitchens, shelters, and volunteer drivers.</p><button className="button button-primary" onClick={() => openModal('donor')}>Join the rescue network <ArrowRight size={16} /></button><small>Free to join · verified partners only</small></div></div></section>
    </main>
    <footer className="footer shell-width"><Brand onClick={() => navigate('/')} /><span>© 2026 FoodShelter Connect</span><div><a href="#how-it-works">How it works</a><a href="#impact">Impact</a><a href="#roles">Partners</a></div></footer>
    {modalRole && <div className="modal-overlay" onClick={() => setModalRole(null)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="eyebrow"><Sparkles size={13} /> {roleContent[modalRole].eyebrow}</div><h3>{roleContent[modalRole].title}</h3></div><button className="icon-button" onClick={() => setModalRole(null)} aria-label="Close"><X size={20} /></button></div>{submitted ? <div className="modal-success"><span><Check size={25} /></span><h3>You are on the list.</h3><p>We will send the next step to {email}.</p><button className="button button-primary" onClick={() => { window.location.href = modalRole === 'shelter' ? '/shelter' : '/donor'; }}>Open your donor portal <ArrowRight size={15} /></button></div> : <form onSubmit={submitForm}><p className="modal-copy">{roleContent[modalRole].copy}</p><label htmlFor="name">NAME OR ORGANIZATION</label><input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Royal Spice Kitchen" /><label htmlFor="email">EMAIL ADDRESS</label><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hello@example.com" /><button className="modal-submit" type="submit">Request access <ArrowRight size={16} /></button></form>}</div></div>}
  </div>;
}

function DonorPortal() {
  const navigate = useNavigate();
  const [onboarded, setOnboarded] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [tab, setTab] = useState<DonorTab>('donate');
  const [donorName, setDonorName] = useState('Royal Spice Kitchen');
  const [donorType, setDonorType] = useState('restaurant');
  const [contactPerson, setContactPerson] = useState('Rahul Sharma');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('42 Commercial Street, Indiranagar');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560038');
  const [pickup, setPickup] = useState('Lunch (12–2 PM)');
  const [foodTitle, setFoodTitle] = useState('');
  const [category, setCategory] = useState('Cooked Meals');
  const [diet, setDiet] = useState('Veg');
  const [prepared, setPrepared] = useState('Today at 2:00 PM (1 hr ago)');
  const [quantity, setQuantity] = useState('Serves 25 people (~10 KG)');
  const [shelfLife, setShelfLife] = useState('Best within 4 hours (by 7:00 PM)');
  const [notes, setNotes] = useState('Keep warm until pickup. Rear kitchen entrance.');
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [customItem, setCustomItem] = useState('');
  const [donations, setDonations] = useState([{ title: 'Veg Biryani & 30 Rotis', quantity: 'Serves ~30 people (12 KG)', status: 'matching', posted: '15 mins ago' }]);
  const [notice, setNotice] = useState('');
  const totalItems = Object.values(basket).reduce((sum, value) => sum + value, 0);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  const updateQty = (id: string, change: number) => setBasket((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + change) }));
  const publishDonation = () => {
    if (!foodTitle.trim()) { showNotice('Add a food item title before publishing.'); return; }
    setDonations((current) => [{ title: foodTitle, quantity: quantity || 'Serves 20 people', status: 'matching', posted: 'Just now' }, ...current]);
    setFoodTitle(''); setTab('active'); showNotice('Food donation posted and broadcast to nearby shelters.');
  };
  const publishBasket = () => {
    if (!totalItems) { showNotice('Add at least one menu item to your basket.'); return; }
    setDonations((current) => [{ title: `${totalItems} menu items`, quantity: `Total ${totalItems} portions / containers`, status: 'matching', posted: 'Just now' }, ...current]);
    setBasket({}); setTab('active'); showNotice('Surplus basket published successfully.');
  };

<<<<<<< Updated upstream
  return <div className="portal"><header className="portal-header shell-width"><Brand onClick={() => navigate('/')} /><div className="portal-heading"><span className="eyebrow">FOOD DONOR HUB</span><strong>{onboarded ? donorName : 'Setup your donor profile'}</strong></div><button className="portal-home" onClick={() => navigate('/dashboard')}>Dashboard <ArrowRight size={15} /></button></header><main className="portal-main shell-width">
    {!onboarded ? <div className="setup-layout"><div className="setup-intro"><span className="eyebrow"><Sparkles size={13} /> DONOR ONBOARDING</span><h1>Give surplus<br /><em>a destination.</em></h1><p>Register your kitchen once. After that, every rescue takes less than a minute to post.</p><div className="setup-promise"><CheckCircle2 size={18} /><span><strong>Verified local network</strong><small>Matched to shelters within 4 km</small></span></div><div className="setup-promise"><ShieldCheck size={18} /><span><strong>Impact logs included</strong><small>Track every meal you help share</small></span></div></div><div className="portal-card setup-card"><div className="portal-progress"><span>SETUP STEP {setupStep} OF 2</span><strong>{setupStep === 1 ? '50%' : '100%'}</strong><i><b style={{ width: setupStep === 1 ? '50%' : '100%' }} /></i></div>{setupStep === 1 ? <><div className="card-heading"><Sparkles size={20} /><div><h2>Welcome to Rescue Donor Hub</h2><p>Tell us who is sharing food today.</p></div></div><Field label="DONOR / SHOP NAME *" value={donorName} onChange={setDonorName} placeholder="e.g. Royal Spice Bistro" /><label className="portal-label">SELECT YOUR DONOR TYPE *</label><div className="donor-type-grid">{donorTypes.map(([id, label, description, Icon]) => <button className={donorType === id ? 'donor-type selected' : 'donor-type'} key={id} onClick={() => setDonorType(id)}><span><Icon size={17} /></span><b>{label}</b><small>{description}</small>{donorType === id && <Check size={17} />}</button>)}</div><div className="field-row"><Field label="CONTACT PERSON" value={contactPerson} onChange={setContactPerson} placeholder="Rahul Sharma" /><Field label="PHONE NUMBER" value={phone} onChange={setPhone} placeholder="+91 98765 43210" /></div><button className="portal-primary" onClick={() => setSetupStep(2)}>Next: location & pickup address <ArrowRight size={16} /></button></> : <><div className="card-heading"><MapPin size={20} /><div><h2>Pickup address & GPS</h2><p>Help verified drivers find your handoff door.</p></div></div><button className="gps-button" onClick={() => detectBrowserLocation((_latitude, _longitude, place) => { setAddress(place.name); setCity(place.city); setPincode(place.postalCode); showNotice('Location detected: ' + place.name + ', ' + place.city); })}><MapPin size={17} /> Detect my live GPS location</button><Field label="STREET ADDRESS & LANDMARK *" value={address} onChange={setAddress} placeholder="42 Commercial Street" /><div className="field-row"><Field label="CITY *" value={city} onChange={setCity} placeholder="Bengaluru" /><Field label="PINCODE *" value={pincode} onChange={setPincode} placeholder="560038" /></div><label className="portal-label">PREFERRED DAILY PICKUP WINDOW</label><select className="portal-input" value={pickup} onChange={(event) => setPickup(event.target.value)}><option>Morning (7–10 AM)</option><option>Lunch (12–2 PM)</option><option>Afternoon (2–4 PM)</option><option>Evening (5–7 PM)</option><option>Dinner (8–10 PM)</option><option>Anytime (Call us)</option></select><div className="form-actions"><button className="portal-secondary" onClick={() => setSetupStep(1)}>Back</button><button className="portal-primary" onClick={() => setOnboarded(true)}>Complete setup & unlock <Check size={16} /></button></div></>}</div></div> : <div><div className="active-profile"><span className="status-dot green" /><div><strong>{donorName}</strong><small>{donorTypes.find(([id]) => id === donorType)?.[1]} · {address}, {city} · Pickup {pickup}</small></div><button onClick={() => { setOnboarded(false); setSetupStep(1); }}>Edit setup</button></div><div className="portal-tabs">{([['donate', 'Single item', Plus], ['basket', `Basket (${totalItems})`, Package], ['active', `Active (${donations.length})`, Clock3], ['needs', 'NGO needs (2)', HeartHandshake]] as const).map(([id, label, Icon]) => <button className={tab === id ? 'portal-tab active' : 'portal-tab'} key={id} onClick={() => setTab(id)}><Icon size={15} /> {label}</button>)}</div>{tab === 'donate' && <div className="portal-card form-card"><PortalTitle icon={<Utensils size={18} />} title="Post a single food donation" copy="Share what is ready, how much you have, and how long it stays fresh." /><div className="photo-placeholder"><Camera size={23} /><div><strong>Food photo</strong><small>Choose a clear sample photo for shelters to inspect</small></div><button onClick={() => showNotice('Photo picker is ready for your next upload.')}>Choose photo</button></div><Field label="FOOD ITEM TITLE / MENU DESCRIPTION *" value={foodTitle} onChange={setFoodTitle} placeholder="e.g. Mixed Veg Curry, Dal Makhani & 40 Rotis" /><label className="portal-label">FOOD CATEGORY</label><div className="chip-row">{['Cooked Meals', 'Raw Produce', 'Bakery & Bread', 'Packaged Snacks', 'Dairy & Drinks'].map((item) => <button className={category === item ? 'choice selected' : 'choice'} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="portal-label">DIETARY TAG</label><div className="chip-row">{['Veg', 'Non-Veg', 'Egg'].map((item) => <button className={diet === item ? 'choice selected' : 'choice'} key={item} onClick={() => setDiet(item)}>{item === 'Veg' ? 'Pure Veg' : item}</button>)}</div><div className="field-row"><Field label="PREPARED WHEN? *" value={prepared} onChange={setPrepared} placeholder="Today at 1:30 PM" /><Field label="APPROXIMATE QUANTITY *" value={quantity} onChange={setQuantity} placeholder="Serves 30 people" /></div><Field label="SHELF LIFE / BEST BEFORE *" value={shelfLife} onChange={setShelfLife} placeholder="Best within 4 hours" /><Field label="SPECIAL PICKUP INSTRUCTIONS" value={notes} onChange={setNotes} placeholder="Rear kitchen entrance" textarea /><button className="portal-primary wide" onClick={publishDonation}>Publish surplus food donation <ArrowRight size={17} /></button></div>}{tab === 'basket' && <div className="portal-card form-card"><PortalTitle icon={<Package size={18} />} title="Menu surplus basket" copy="Add multiple dishes together, just like the Expo app basket flow." /><div className="add-item"><input value={customItem} onChange={(event) => setCustomItem(event.target.value)} placeholder="Add a custom dish, e.g. Shahi Paneer Tray" /><button onClick={() => { if (customItem.trim()) { updateQty(customItem, 1); setCustomItem(''); } }}>Add</button></div><div className="menu-grid">{menuItems.map(([id, name, unit]) => <div className={basket[id] ? 'menu-item selected' : 'menu-item'} key={id}><div><strong>{name}</strong><small>Unit: {unit}</small></div><span><button onClick={() => updateQty(id, -1)}><Minus size={14} /></button><b>{basket[id] || 0}</b><button onClick={() => updateQty(id, 1)}><Plus size={14} /></button></span></div>)}{Object.keys(basket).filter((id) => !menuItems.some(([itemId]) => itemId === id)).map((id) => <div className="menu-item selected" key={id}><div><strong>{id}</strong><small>Unit: Portions</small></div><span><button onClick={() => updateQty(id, -1)}><Minus size={14} /></button><b>{basket[id]}</b><button onClick={() => updateQty(id, 1)}><Plus size={14} /></button></span></div>)}</div><div className="basket-summary"><strong>Basket total: {totalItems} items</strong><small>Selected dishes will be matched to one nearby shelter.</small><button className="portal-primary" onClick={publishBasket}>Publish selected items <ArrowRight size={16} /></button></div></div>}{tab === 'active' && <div className="portal-card form-card"><PortalTitle icon={<Clock3 size={18} />} title="Active food donations" copy="Real-time matching status for the surplus you have posted." />{donations.map((item, index) => <div className="active-donation" key={`${item.title}-${index}`}><div className="donation-heading"><span className="food-thumb"><Utensils size={18} /></span><div><strong>{item.title}</strong><small>{item.quantity} · Posted {item.posted}</small></div><span className="matching-badge"><RefreshCw size={13} /> {item.status === 'matching' ? 'Matching' : item.status}</span></div><div className="delivery-line"><span className="status-dot green" /> Searching nearest verified shelter <i /><span>Driver assignment follows</span></div><div className="donation-meta"><span><Clock3 size={14} /> {shelfLife}</span><span><MapPin size={14} /> {address}, {city}</span></div></div>)}</div>}{tab === 'needs' && <div className="portal-card form-card"><PortalTitle icon={<HeartHandshake size={18} />} title="Shelter food requests" copy="Live needs broadcast by nearby NGOs and shelters." />{[['Harbor House Shelter', 'Need dinner meals for 80 residents', '80 people · Pure Veg · by 7:30 PM'], ['Sunrise Orphanage', 'Need lunch & snacks for 45 children', '45 children · Pure Veg · self pickup']].map(([name, title, meta]) => <div className="need-card" key={name}><span className="need-icon"><HeartHandshake size={18} /></span><div><strong>{name}</strong><h3>{title}</h3><small>{meta}</small></div><button onClick={() => { setFoodTitle(`Donation for: ${title}`); setTab('donate'); }}>Respond <ArrowRight size={14} /></button></div>)}</div>}</div>}</main>{notice && <div className="toast"><CheckCircle2 size={17} /> {notice}</div>}</div>;
}

function Field({ label, value, onChange, placeholder, textarea = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; textarea?: boolean }) {
  return <label className="field"><span className="portal-label">{label}</span>{textarea ? <textarea className="portal-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> : <input className="portal-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}</label>;
}

function PortalTitle({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="portal-title"><span>{icon}</span><div><h2>{title}</h2><p>{copy}</p></div></div>;
}

type PlaceResult = { name: string; city: string; postalCode: string };

function lookupPlace(latitude: number, longitude: number): Promise<PlaceResult> {
  return fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, { signal: AbortSignal.timeout(6000) })
    .then((response) => response.json() as Promise<{ locality?: string; city?: string; principalSubdivision?: string; postcode?: string }>)
    .then((place) => ({
      name: place.locality || place.city || place.principalSubdivision || 'Detected location',
      city: place.city || place.locality || 'Bengaluru',
      postalCode: place.postcode || '560038',
    }))
    .catch(() => ({ name: 'Amity University Rajasthan, Kant Kalwar', city: 'Jaipur', postalCode: '303002' }));
}

function detectBrowserLocation(onSuccess: (latitude: number, longitude: number, place: PlaceResult) => void) {
  const deliverLocation = (latitude: number, longitude: number) => {
    lookupPlace(latitude, longitude).then((place) => onSuccess(latitude, longitude, place));
  };
  const useApproximateLocation = () => {
    deliverLocation(26.9365, 75.9273);
  };

  if (!('geolocation' in navigator)) {
    useApproximateLocation();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => deliverLocation(coords.latitude, coords.longitude),
    () => useApproximateLocation(),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

function ShelterPortal() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [step, setStep] = useState<1 | 2>(1);
  const [tab, setTab] = useState<'request' | 'surplus' | 'requests'>('request');
  const [email, setEmail] = useState('contact@harborhouse.org');
  const [password, setPassword] = useState('••••••••');
  const [ngoName, setNgoName] = useState('Harbor House Shelter');
  const [ngoCategory, setNgoCategory] = useState('Community Shelter');
  const [address, setAddress] = useState('88 Shelter Road, Near City Park');
  const [city, setCity] = useState('Bengaluru');
  const [capacity, setCapacity] = useState('100 meals / day');
  const [requestTitle, setRequestTitle] = useState('');
  const [people, setPeople] = useState('50 people');
  const [foodType, setFoodType] = useState('Cooked Meals');
  const [dietary, setDietary] = useState('Pure Veg');
  const [deadline, setDeadline] = useState('Required by 7:30 PM tonight');
  const [delivery, setDelivery] = useState('Volunteer Driver');
  const [requests, setRequests] = useState([{ title: 'Need Dinner Meals for 50 Residents', people: '50 people', status: 'assigned', meta: 'Amara · 15 mins away' }]);
  const [notice, setNotice] = useState('');
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  const postRequest = () => { if (!requestTitle.trim()) { notify('Add a request title before broadcasting.'); return; } setRequests((current) => [{ title: requestTitle, people, status: 'matching', meta: 'Matching nearby kitchens' }, ...current]); setRequestTitle(''); setTab('requests'); notify('Food requirement broadcast to nearby kitchens.'); };
  return <div className="portal"><header className="portal-header shell-width"><Brand onClick={() => navigate('/')} /><div className="portal-heading"><span className="eyebrow">SHELTER & NGO PORTAL</span><strong>{authenticated ? ngoName : 'Sign in to your shelter portal'}</strong></div><button className="portal-home" onClick={() => navigate('/')}>Home <ArrowRight size={15} /></button></header><main className="portal-main shell-width">{!authenticated ? <div className="setup-layout"><div className="setup-intro"><span className="eyebrow"><HeartHandshake size={13} /> COMMUNITY ACCESS</span><h1>Bring food<br /><em>closer to home.</em></h1><p>Request fresh surplus, claim nearby meals, and keep your residents' next meal visible.</p><div className="setup-promise"><ShieldCheck size={18} /><span><strong>Verified donors only</strong><small>Every listing is screened and time-bound</small></span></div><div className="setup-promise"><Truck size={18} /><span><strong>Delivery coordination</strong><small>Volunteer or self-pickup options</small></span></div></div><div className="portal-card setup-card">{mode === 'signin' ? <><div className="card-heading"><Building2 size={20} /><div><h2>NGO login</h2><p>Open your shelter's active food board.</p></div></div><Field label="NGO EMAIL ADDRESS" value={email} onChange={setEmail} placeholder="contact@shelter.org" /><Field label="PASSWORD" value={password} onChange={setPassword} placeholder="••••••••" /><button className="portal-primary" onClick={() => setAuthenticated(true)}>Sign in & open portal <ArrowRight size={16} /></button><button className="switch-link" onClick={() => { setMode('register'); setStep(1); }}>New shelter or NGO? Register here</button></> : <><div className="portal-progress"><span>NGO ONBOARDING STEP {step} OF 2</span><strong>{step === 1 ? '50%' : '100%'}</strong><i><b style={{ width: step === 1 ? '50%' : '100%' }} /></i></div>{step === 1 ? <><div className="card-heading"><HeartHandshake size={20} /><div><h2>Organization details</h2><p>Help donors understand who they are serving.</p></div></div><Field label="NGO / SHELTER NAME *" value={ngoName} onChange={setNgoName} placeholder="Harbor House Shelter" /><label className="portal-label">ORGANIZATION TYPE</label><div className="chip-row">{['Community Shelter', 'Orphanage Home', 'Senior Care', 'Food Bank', 'Relief Center'].map((item) => <button className={ngoCategory === item ? 'choice selected' : 'choice'} key={item} onClick={() => setNgoCategory(item)}>{item}</button>)}</div><div className="field-row"><Field label="CONTACT PERSON" value="Sister Mary" onChange={() => undefined} placeholder="Sister Mary" /><Field label="PHONE NUMBER" value="+91 98123 45678" onChange={() => undefined} placeholder="+91 98123 45678" /></div><button className="portal-primary" onClick={() => setStep(2)}>Next: location & capacity <ArrowRight size={16} /></button></> : <><div className="card-heading"><MapPin size={20} /><div><h2>Delivery location & capacity</h2><p>Give drivers the details for a smooth handoff.</p></div></div><button className="gps-button" onClick={() => detectBrowserLocation((_latitude, _longitude, place) => notify('Location detected: ' + place.name + ', ' + place.city))}><MapPin size={17} /> Detect my live GPS location</button><Field label="DELIVERY STREET ADDRESS *" value={address} onChange={setAddress} placeholder="88 Shelter Road" /><div className="field-row"><Field label="CITY *" value={city} onChange={setCity} placeholder="Bengaluru" /><Field label="MAX DAILY MEAL CAPACITY" value={capacity} onChange={setCapacity} placeholder="100 meals / day" /></div><div className="form-actions"><button className="portal-secondary" onClick={() => setStep(1)}>Back</button><button className="portal-primary" onClick={() => setAuthenticated(true)}>Complete setup & unlock <Check size={16} /></button></div></>}</>}{mode === 'register' && <button className="switch-link" onClick={() => setMode('signin')}>Already registered? Sign in</button>}</div></div> : <div><div className="active-profile"><span className="status-dot green" /><div><strong>{ngoName} <small>({ngoCategory})</small></strong><small>{address}, {city} · Capacity: {capacity}</small></div><button onClick={() => setAuthenticated(false)}>Sign out</button></div><div className="portal-tabs">{([['request', 'Request food', Plus], ['surplus', 'Live surplus (2)', Utensils], ['requests', `Requests (${requests.length})`, Clock3]] as const).map(([id, label, Icon]) => <button className={tab === id ? 'portal-tab active' : 'portal-tab'} key={id} onClick={() => setTab(id)}><Icon size={15} /> {label}</button>)}</div>{tab === 'request' && <div className="portal-card form-card"><PortalTitle icon={<Sparkles size={18} />} title="Request food for your residents" copy="Broadcast your exact need to nearby kitchens, messes, and caterers." /><Field label="REQUEST TITLE / NEED DESCRIPTION *" value={requestTitle} onChange={setRequestTitle} placeholder="e.g. Need dinner meals for 50 residents" /><Field label="NUMBER OF PEOPLE / SERVINGS NEEDED *" value={people} onChange={setPeople} placeholder="50 people or 100 meals" /><label className="portal-label">TYPE OF FOOD NEEDED</label><div className="chip-row">{['Cooked Meals', 'Raw Groceries', 'Bakery Items', 'Packaged Snacks', 'Dairy & Milk'].map((item) => <button className={foodType === item ? 'choice selected' : 'choice'} key={item} onClick={() => setFoodType(item)}>{item}</button>)}</div><label className="portal-label">DIETARY PREFERENCE</label><div className="chip-row">{['Pure Veg', 'Non-Veg Allowed', 'Egg Allowed'].map((item) => <button className={dietary === item ? 'choice selected' : 'choice'} key={item} onClick={() => setDietary(item)}>{item}</button>)}</div><div className="field-row"><Field label="REQUIRED BY / DEADLINE *" value={deadline} onChange={setDeadline} placeholder="Required by 7:30 PM" /><Field label="DELIVERY MODE" value={delivery} onChange={setDelivery} placeholder="Volunteer Driver" /></div><button className="portal-primary wide" onClick={postRequest}>Broadcast food requirement <ArrowRight size={17} /></button></div>}{tab === 'surplus' && <div className="portal-card form-card"><PortalTitle icon={<Utensils size={18} />} title="Available nearby surplus" copy="Claim food posted by verified kitchens before its freshness window closes." />{[['Olive & Grain Bistro', 'Veg Meals, Dal Makhani & 40 Rotis', 'Serves ~35 people · 1.2 km away · by 6:30 PM'], ['Grand Banquet Caterers', 'Paneer Butter Masala, Pulao & Sweets', 'Serves ~80 people · 2.4 km away · by 7:00 PM']].map(([donor, title, meta]) => <div className="need-card" key={title}><span className="need-icon"><Utensils size={18} /></span><div><strong>{donor}</strong><h3>{title}</h3><small>{meta}</small></div><button onClick={() => notify(`${title} claimed. Driver coordination started.`)}>Claim <ArrowRight size={14} /></button></div>)}</div>}{tab === 'requests' && <div className="portal-card form-card"><PortalTitle icon={<Clock3 size={18} />} title="Active food requests" copy={`Track requests posted by ${ngoName}.`} />{requests.map((item, index) => <div className="active-donation" key={`${item.title}-${index}`}><div className="donation-heading"><span className="food-thumb"><HeartHandshake size={18} /></span><div><strong>{item.title}</strong><small>Needed for {item.people} · {dietary}</small></div><span className="matching-badge"><RefreshCw size={13} /> {item.status}</span></div><div className="delivery-line"><span className="status-dot green" /> {item.meta} <i /><span>{deadline}</span></div></div>)}</div>}</div>}</main>{notice && <div className="toast"><CheckCircle2 size={17} /> {notice}</div>}</div>;
}

function Dashboard() {
  const navigate = useNavigate();
  return <div className="dashboard"><header className="site-nav shell-width"><Brand onClick={() => navigate('/')} /><div className="dashboard-label"><span className="status-dot green" /> RESCUE CONTROL ROOM</div></header><main className="dashboard-main shell-width"><div className="dashboard-heading"><div><div className="eyebrow">GOOD AFTERNOON, ROYAL SPICE</div><h1>Your rescue board.</h1><p>One live donation. Two nearby shelters. Plenty of good still in motion.</p></div><button className="button button-primary" onClick={() => navigate('/')}>Back to overview <ArrowRight size={15} /></button></div><div className="dashboard-grid"><section className="dashboard-card live-donation"><div className="card-topline"><span className="status-chip"><span className="pulse" /> MATCHING NOW</span><span>POSTED 15 MIN AGO</span></div><h2>Veg biryani & 30 rotis</h2><p className="muted">Cooked meals · Serves ~30 people · 12 kg</p><div className="route-summary"><div><span className="route-badge orange"><Utensils size={16} /></span><strong>Royal Spice Kitchen</strong><small>Indiranagar · pickup ready</small></div><ArrowRight size={18} /><div><span className="route-badge teal"><Building2 size={16} /></span><strong>Harbor House Shelter</strong><small>1.8 km · needs dinner meals</small></div></div><div className="progress-track"><span /></div><div className="progress-labels"><span>Listing live</span><span>Volunteer matching</span><span>Delivered</span></div></section><section className="dashboard-card"><div className="card-topline"><span className="eyebrow">THIS MONTH</span><span className="trend">+18%</span></div><div className="big-stat">120 <small>meals shared</small></div><div className="mini-stats"><div><strong>48 kg</strong><span>food rescued</span></div><div><strong>3.2 kg</strong><span>CO2 prevented</span></div></div><button className="outline-button"><ShieldCheck size={15} /> Download impact log</button></section><section className="dashboard-card nearby"><div className="card-topline"><span className="eyebrow">NEARBY NEEDS</span><span>2 MATCHES</span></div><div className="need-row"><span className="route-badge lime"><HeartHandshake size={16} /></span><div><strong>Harbor House Shelter</strong><small>Needs 50 veg meals · by 7:30 PM</small></div><MapPin size={16} /></div><div className="need-row"><span className="route-badge purple"><Building2 size={16} /></span><div><strong>Sunrise Orphanage</strong><small>Needs snacks for 45 children</small></div><MapPin size={16} /></div></section></div></main></div>;
}

export default function App() { return <BrowserRouter><RoutesFallback /></BrowserRouter>; }
function RoutesFallback() { return window.location.pathname === '/dashboard' ? <Dashboard /> : window.location.pathname === '/donor' ? <DonorPortal /> : window.location.pathname === '/shelter' ? <ShelterPortal /> : <LandingPage />; }
=======
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactEmail.trim()) {
      setFormSubmitted(true);
      setTimeout(() => {
        setModalVisible(false);
        navigate('/login');
      }, 1500);
    }
  };

  return (
    <div className="root-container">
      {/* Navigation */}
      <nav className="nav-bar">
        <div className="brand-row">
          <div className="brand-badge">
            <Recycle size={18} color="#18352b" strokeWidth={2.6} />
          </div>
          <div className="brand-text">
            rescue<span className="brand-dot">.</span>
          </div>
        </div>

        <div className="desktop-nav-links">
          <button className="nav-link" onClick={() => handleOpenModal('donor')}>How it works</button>
          <button className="nav-link" onClick={() => handleOpenModal('donor')}>Calculator</button>
          <button className="nav-link" onClick={() => handleOpenModal('donor')}>For Businesses</button>
          <button className="nav-cta" onClick={() => navigate('/login')}>
            Sign In <ArrowUpRight size={14} />
          </button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="eyebrow-badge">
            <div className="pulse-dot"></div>
            <span>LIVE ACROSS YOUR CITY</span>
          </div>

          <h1 className="hero-title">
            Good food.<br />
            <span className="hero-title-highlight">Right place.</span><br />
            Right now.
          </h1>

          <p className="hero-subtitle">
            Rescue connects surplus food from local kitchens and markets directly with shelters and people in need — before the clock runs out.
          </p>

          <div className="hero-actions">
            <button className="primary-button" onClick={() => handleOpenModal('donor')}>
              Donate surplus <ArrowRight size={16} />
            </button>
            <button className="secondary-button" onClick={() => handleOpenModal('shelter')}>
              Join Shelter Network
            </button>
          </div>
        </section>

        {/* Ticker Banner */}
        <div className="ticker-banner">
          EVERY RESCUE COUNTS · <span className="ticker-highlight">23,841 KG</span> KEPT IN USE THIS MONTH · ♥ BUILT BY NEIGHBORS
        </div>

        {/* Problem Section */}
        <section className="section-container">
          <div className="eyebrow-badge"><span>THE GAP IS REAL</span></div>
          <h2 className="section-title">
            There is enough food.<br />
            <span className="hero-title-highlight">It just needs to move.</span>
          </h2>
          <p className="section-body">
            Every day, perfectly good food leaves commercial kitchens while community shelters nearby go without. The problem isn't willingness — it's the missing real-time connection between surplus, timing, distance, and capacity.
          </p>
          <div className="stat-pills-row">
            <div className="stat-pill">
              <div className="stat-value">40%</div>
              <div className="stat-label">of food is wasted</div>
            </div>
            <div className="stat-pill">
              <div className="stat-value">1 in 8</div>
              <div className="stat-label">face food insecurity</div>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="section-container">
          <div className="eyebrow-badge">
            <Calculator size={14} style={{ marginRight: 6 }} />
            <span>IMPACT ESTIMATOR</span>
          </div>
          <h2 className="section-title">
            Calculate your<br />
            <span className="hero-title-highlight">potential rescue.</span>
          </h2>

          <div className="calc-card">
            <div className="calc-header">
              <Utensils size={18} /> Daily Surplus Estimator
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6c7b73', marginBottom: '0.5rem', display: 'block' }}>Average Daily Surplus (in KG)</label>
            <input
              type="number"
              className="calc-input"
              value={kgPerDay}
              onChange={e => setKgPerDay(e.target.value)}
              placeholder="e.g. 25"
            />
            <div className="calc-results">
              <div className="calc-result-box">
                <div className="calc-result-val">{estimatedMealsMonthly.toLocaleString()}</div>
                <div className="calc-result-sub">MEALS / MONTH</div>
              </div>
              <div className="calc-result-box">
                <div className="calc-result-val">{estimatedCo2Saved.toLocaleString()} kg</div>
                <div className="calc-result-sub">CO₂ PREVENTED</div>
              </div>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="section-container">
          <div className="eyebrow-badge"><span>THE RESCUE NETWORK</span></div>
          <h2 className="section-title">
            From surplus<br />
            <span className="hero-title-highlight">to shared.</span>
          </h2>
          <p className="section-body">
            Not a static directory. A live mobile coordination layer for the exact moments when food needs somewhere to go — right now.
          </p>

          <div className="steps-grid">
            {steps.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="step-card">
                  <div className="step-number">{step.number}</div>
                  <div className="step-icon" style={{ background: step.bgColor }}>
                    <Icon color={step.iconColor} size={20} />
                  </div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-desc">{step.text}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Roles Section */}
        <section className="section-container">
          <div className="eyebrow-badge"><span>THERE'S A PLACE FOR YOU HERE</span></div>
          <h2 className="section-title">
            Many hands.<br />
            <span className="hero-title-highlight">One shared table.</span>
          </h2>

          <div className="roles-stack">
            {roles.map(role => {
              const Icon = role.icon;
              return (
                <div key={role.title} className="role-card" style={{ background: role.tone }}>
                  <Icon size={24} color="#18352b" style={{ marginBottom: '1rem' }} />
                  <div className="role-eyebrow">{role.eyebrow}</div>
                  <div className="role-title">{role.title}</div>
                  <div className="role-desc">{role.text}</div>
                  <button onClick={() => handleOpenModal(role.type)} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 'bold', color: '#18352b', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    {role.link} <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Impact Section */}
        <section className="section-container">
          <div className="eyebrow-badge"><span>SMALL ACTIONS, VISIBLE CHANGE</span></div>
          <h2 className="section-title">
            The numbers<br />
            <span className="hero-title-highlight">tell the story.</span>
          </h2>

          <div className="impact-grid">
            <div className="impact-card">
              <PackageCheck size={24} color="#80a542" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#18352b' }}>186,420</div>
              <div style={{ fontSize: '0.9rem', color: '#607169', fontWeight: 'bold' }}>kg food rescued</div>
            </div>
            <div className="impact-card">
              <HeartHandshake size={24} color="#d87d51" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#18352b' }}>421,800</div>
              <div style={{ fontSize: '0.9rem', color: '#607169', fontWeight: 'bold' }}>meals shared</div>
            </div>
            <div className="impact-card">
              <ShieldCheck size={24} color="#639486" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#18352b' }}>9,240</div>
              <div style={{ fontSize: '0.9rem', color: '#607169', fontWeight: 'bold' }}>successful rescues</div>
            </div>
            <div className="impact-card">
              <Users size={24} color="#8a70a3" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#18352b' }}>480+</div>
              <div style={{ fontSize: '0.9rem', color: '#607169', fontWeight: 'bold' }}>local partners</div>
            </div>
          </div>
        </section>

        {/* Join CTA */}
        <section className="section-container" style={{ padding: '2rem' }}>
          <div className="join-card">
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 1rem' }}>Let's make sure nothing good goes to waste.</h2>
            <p style={{ margin: '0 0 2rem' }}>Start with one rescue. We handle connections, real-time coordination, and tax logs.</p>
            <button className="primary-button" onClick={() => navigate('/login')}>
              Join the Rescue network <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        © 2026 FoodShelter Connect · Rescue Web App
      </footer>

      {/* Modal */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#93ad32" />
                <h3 style={{ margin: 0 }}>
                  {selectedRole === 'donor'
                    ? 'Donate Food Surplus'
                    : selectedRole === 'shelter'
                    ? 'Register Shelter / NGO'
                    : 'Become Volunteer Driver'}
                </h3>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setModalVisible(false)}>
                <X size={22} color="#18352b" />
              </button>
            </div>

            {formSubmitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ background: '#18352b', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Check size={26} color="#ffffff" />
                </div>
                <h2>You're on the list!</h2>
                <p>Redirecting you to sign in...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitForm}>
                <p style={{ color: '#607169', marginBottom: '1.5rem' }}>Submit your details to request immediate pickup or register your shelter.</p>

                <div className="form-group">
                  <label>ORGANIZATION / FULL NAME</label>
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Green Bakery or John Doe" />
                </div>

                <div className="form-group">
                  <label>EMAIL ADDRESS</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="name@example.com" required />
                </div>

                <button type="submit" className="modal-submit">
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
>>>>>>> Stashed changes
