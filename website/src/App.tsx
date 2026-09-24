import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
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
  LayoutDashboard
} from 'lucide-react';
import './index.css';

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

function LandingPage() {
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

  const navigate = useNavigate();

  const handleOpenModal = (roleType = 'donor') => {
    setSelectedRole(roleType);
    setFormSubmitted(false);
    setModalVisible(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactEmail.trim()) {
      setFormSubmitted(true);
      setTimeout(() => {
        setModalVisible(false);
        navigate('/dashboard');
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
          <button className="nav-cta" onClick={() => handleOpenModal('donor')}>
            Join Network <ArrowUpRight size={14} />
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
            Every day, perfectly good food leaves commercial kitchens while community shelters nearby go without. The problem isn’t willingness — it’s the missing real-time connection between surplus, timing, distance, and capacity.
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
          <div className="eyebrow-badge"><span>THERE’S A PLACE FOR YOU HERE</span></div>
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
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 1rem' }}>Let’s make sure nothing good goes to waste.</h2>
            <p style={{ margin: '0 0 2rem' }}>Start with one rescue. We handle connections, real-time coordination, and tax logs.</p>
            <button className="primary-button" onClick={() => handleOpenModal('donor')}>
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
                <p>Redirecting you to the dashboard...</p>
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

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="root-container">
      <nav className="nav-bar">
        <div className="brand-row" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="brand-badge">
            <Recycle size={18} color="#18352b" strokeWidth={2.6} />
          </div>
          <div className="brand-text">
            rescue<span className="brand-dot">.</span>
          </div>
        </div>
        <div className="desktop-nav-links">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <LayoutDashboard size={18} /> Dashboard
          </div>
        </div>
      </nav>

      <main style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome to your Dashboard</h1>
        <p style={{ color: '#607169', marginBottom: '3rem', fontSize: '1.1rem' }}>Manage your food surplus donations and track your impact here.</p>
        
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
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
