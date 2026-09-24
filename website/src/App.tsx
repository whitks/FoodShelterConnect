import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Recycle,
  Sparkles,
  X,
} from 'lucide-react';
import './index.css';

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState('donor');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const handleOpenModal = (roleType = 'donor') => {
    setSelectedRole(roleType);
    setFormSubmitted(false);
    setModalVisible(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactEmail.trim()) {
      setFormSubmitted(true);
    }
  };

  return (
    <div className="root-container">
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
      </main>

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
                <p>Our local rescue team will contact <strong>{contactEmail}</strong> within 2 hours.</p>
                <button className="modal-submit" onClick={() => setModalVisible(false)}>Done</button>
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
