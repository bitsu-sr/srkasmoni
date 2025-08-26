
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Shield, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import './Landing.css'

const Landing = () => {
  // Mock data - you can replace these with actual data from your backend
  const stats = {
    groups: 47,
    members: 284,
    totalSavings: 284000,
    roundsCompleted: 156
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <div className="logo-container">
              <img src="/logokasmonigr.png" alt="Sranan Kasmoni Logo" className="hero-logo" />
            </div>
            <h1 className="hero-title">
              <span className="highlight">Kasmoni</span>
              <br />
              Build Wealth. Build Trust. Together.
            </h1>
            <p className="hero-subtitle">
              Join the trusted community savings platform that brings people together 
              to achieve financial goals through mutual support and transparency.
            </p>
            <div className="hero-cta">
              <Link to="/dashboard" className="cta-button primary">
                Get Started Today
                <ArrowRight size={20} />
              </Link>
              <Link to="/groups" className="cta-button secondary">
                Explore Groups
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="image-grid">
              <div className="image-item">
                <img 
                  src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop&crop=face" 
                  alt="Happy person managing finances" 
                  className="hero-img"
                />
              </div>
              <div className="image-item">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face" 
                  alt="Person planning financial future" 
                  className="hero-img"
                />
              </div>
              <div className="image-item">
                <img 
                  src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face" 
                  alt="Community member saving together" 
                  className="hero-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">
                <Users size={32} />
              </div>
              <div className="stat-number">{stats.groups}</div>
              <div className="stat-label">Active Groups</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <TrendingUp size={32} />
              </div>
              <div className="stat-number">{stats.members}</div>
              <div className="stat-label">Community Members</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <Shield size={32} />
              </div>
              <div className="stat-number">SRD {stats.totalSavings.toLocaleString()}</div>
              <div className="stat-label">Total Savings</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <Clock size={32} />
              </div>
              <div className="stat-number">{stats.roundsCompleted}</div>
              <div className="stat-label">Rounds Completed</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How Kasmoni Works</h2>
          <p className="section-subtitle">
            A simple, transparent system that empowers communities to save together
          </p>
          
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Join a Group</h3>
              <p>Find a savings group that fits your schedule and contribution amount, starting from SRD 1,000.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Save Regularly</h3>
              <p>Make your monthly contributions on time. Everyone contributes the same amount each month.</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Receive Your Turn</h3>
              <p>When it's your turn, receive the full pot - all contributions from your group members.</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h3>Build Trust</h3>
              <p>Continue saving and supporting others, building lasting relationships and financial security.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2>Why Choose Sranan Kasmoni?</h2>
              <div className="benefits-list">
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>No Banks, No Credit Checks</h4>
                    <p>Just real people helping real people with transparent, community-based savings.</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>Secure & Transparent</h4>
                    <p>Every transaction is recorded and visible to all group members for complete transparency.</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>Flexible & Accessible</h4>
                    <p>Choose your contribution amount and join groups that fit your financial situation.</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>Community Support</h4>
                    <p>Build lasting relationships while achieving your financial goals together.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="benefits-image">
              <img 
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=500&h=600&fit=crop" 
                alt="Community members working together" 
                className="benefits-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Your Financial Journey?</h2>
            <p>Join thousands of Surinamese who are already building wealth and trust together.</p>
            <div className="cta-buttons">
              <Link to="/dashboard" className="cta-button primary large">
                Start Saving Today
                <ArrowRight size={24} />
              </Link>
              <Link to="/groups" className="cta-button secondary large">
                Browse Groups
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="container">
          <h2 className="section-title">Get in Touch</h2>
          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-item">
                <h4>Email</h4>
                <p>bitsu.sr@gmail.com</p>
              </div>
              <div className="contact-item">
                <h4>Follow Us</h4>
                <div className="social-links">
                  <a 
                    href="https://www.facebook.com/kasmoni.sr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="social-link"
                  >
                    Facebook
                  </a>
                  <a 
                    href="https://x.com/sr_kasmoni" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="social-link"
                  >
                    Twitter
                  </a>
                </div>
              </div>
            </div>
            <div className="contact-message">
              <p>
                Have questions about joining a Kasmoni group? Our team is here to help 
                you get started on your community savings journey.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landing
