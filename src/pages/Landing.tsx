
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Shield, TrendingUp, Clock, CheckCircle, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import './Landing.css'

const Landing = () => {
  const { t } = useLanguage()
  // Mock data - you can replace these with actual data from your backend
  const stats = {
    groups: 47,
    members: 284,
    totalSavings: 284000,
    roundsCompleted: 156
  }

  // Hero carousel slides
  const slides = useMemo(
    () => [
      {
        id: 'slide-1',
        image: '/business11a.jpg',
        headline: 'Your trusted partner in collective prosperity',
        subheadline: 'Secure, transparent, and always by your side.'
      },
      {
        id: 'slide-2',
        image: '/investment01.jpg',
        headline: 'Empowering each other, one round at a time',
        subheadline: 'Build wealth with your community through modern tandas.'
      },
      {
        id: 'slide-3',
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80&auto=format&fit=crop',
        headline: 'Why Choose Sranan Kasmoni for Your Tanda?',
        subheadline: 'Bank-level security, complete transparency, automated management.'
      }
    ],
    []
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const goTo = (index: number) => {
    const next = (index + slides.length) % slides.length
    setCurrentIndex(next)
  }
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <div className="landing-page">
      {/* Hero Carousel */}
      <section className="hero hero-carousel">
        <div className="carousel-wrapper">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
              aria-hidden={index !== currentIndex}
            >
              <div className="carousel-overlay" />
              <div className="carousel-content">
                <div className="logo-container">
                  <img src="/logokasmonigr.png" alt="Sranan Kasmoni Logo" className="hero-logo" />
                </div>
                <h1 className="hero-title">
                  <span className="highlight">{slide.headline}</span>
                  <br />
                  {slide.subheadline}
                </h1>
                <p className="hero-subtitle">
                  Traditional tandas built communities for generations, but shouldn't be complicated. Sranan Kasmoni brings trusted tanda systems into the digital age with complete transparency, bank-level security, and automated management.
                </p>
                <div className="hero-cta">
                  <Link to="/dashboard" className="cta-button primary">
                    Get started
                    <ArrowRight size={20} />
                  </Link>
                  <Link to="/groups" className="cta-button secondary">
                    Explore groups
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <button className="carousel-nav prev" aria-label="Previous" onClick={() => goTo(currentIndex - 1)}>
            <ChevronLeft size={28} />
          </button>
          <button className="carousel-nav next" aria-label="Next" onClick={() => goTo(currentIndex + 1)}>
            <ChevronRight size={28} />
          </button>

          <div className="carousel-dots" role="tablist" aria-label="Hero slides">
            {slides.map((s, i) => (
              <button
                key={s.id}
                className={`dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                role="tab"
                aria-selected={i === currentIndex}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trust logos */}
      <section className="trust-logos-section">
        <div className="container">
          <div className="trust-logos-strip">
            <span className="trust-title">Trusted by organized communities</span>
            <div className="logos">
              <img src="/logo.svg" alt="Sranan Kasmoni" />
              <img src="/Kasmoni.ai" alt="Kasmoni AI" />
              <img src="/logokasmonigr.png" alt="Kasmoni Green" />
              <img src="/pwa-192x192.png" alt="Kasmoni App" />
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
              <div className="stat-label">{t('landing.stats.activeGroups')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <TrendingUp size={32} />
              </div>
              <div className="stat-number">{stats.members}</div>
              <div className="stat-label">{t('landing.stats.communityMembers')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <Shield size={32} />
              </div>
              <div className="stat-number">SRD {stats.totalSavings.toLocaleString()}</div>
              <div className="stat-label">{t('landing.stats.totalSavings')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <Clock size={32} />
              </div>
              <div className="stat-number">{stats.roundsCompleted}</div>
              <div className="stat-label">{t('landing.stats.roundsCompleted')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">{t('landing.how.title')}</h2>
          <p className="section-subtitle">{t('landing.how.subtitle')}</p>
          
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>{t('landing.how.step1.title')}</h3>
              <p>{t('landing.how.step1.desc')}</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>{t('landing.how.step2.title')}</h3>
              <p>{t('landing.how.step2.desc')}</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>{t('landing.how.step3.title')}</h3>
              <p>{t('landing.how.step3.desc')}</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h3>{t('landing.how.step4.title')}</h3>
              <p>{t('landing.how.step4.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="why-choose-section">
        <div className="container">
          <div className="why-choose-content">
            <div className="why-choose-text">
              <h2>Why Choose Sranan Kasmoni for Your Tanda?</h2>
              <p className="why-lead">Empowering each other, one round at a time.</p>
              <p>
                Traditional tandas built communities for generations, but shouldn't be complicated. Sranan Kasmoni brings trusted tanda systems into the digital age with complete transparency, bank-level security, and automated management. Join thousands who've successfully saved for homes, businesses, and emergencies through our organized platform that eliminates disputes and stress.
              </p>
              <p className="why-sub">Ready to build wealth with your community? Start your tanda journey today.</p>
              <div className="why-cta">
                <Link to="/dashboard" className="cta-button primary">Start now <ArrowRight size={18} /></Link>
                <span className="trust-badge">Your trusted partner in collective prosperity</span>
              </div>
            </div>
            <div className="why-choose-cards">
              <div className="why-card">
                <div className="why-icon"><Shield size={24} /></div>
                <h4>Bank-level Security</h4>
                <p>Enterprise-grade auth, RLS, and encrypted storage to protect your funds.</p>
              </div>
              <div className="why-card">
                <div className="why-icon"><TrendingUp size={24} /></div>
                <h4>Automated Management</h4>
                <p>Slots, payouts, and reminders handled automatically with clear logs.</p>
              </div>
              <div className="why-card">
                <div className="why-icon"><Users size={24} /></div>
                <h4>Community-first</h4>
                <p>Tools to reduce disputes and keep everyone aligned and informed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2>{t('landing.why.title')}</h2>
              <div className="benefits-list">
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>{t('landing.why.item1.title')}</h4>
                    <p>{t('landing.why.item1.desc')}</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>{t('landing.why.item2.title')}</h4>
                    <p>{t('landing.why.item2.desc')}</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>{t('landing.why.item3.title')}</h4>
                    <p>{t('landing.why.item3.desc')}</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={24} className="benefit-icon" />
                  <div>
                    <h4>{t('landing.why.item4.title')}</h4>
                    <p>{t('landing.why.item4.desc')}</p>
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

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title">What members say</h2>
          <p className="section-subtitle">Real stories from successful tandas.</p>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="stars" aria-label="Rated 5 out of 5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} />
                ))}
              </div>
              <p className="quote">“Sranan Kasmoni made our tanda effortless. No more confusion—just results.”</p>
              <div className="author">— Aisha Ramdhin</div>
            </div>
            <div className="testimonial-card">
              <div className="stars" aria-label="Rated 5 out of 5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} />
                ))}
              </div>
              <p className="quote">“I saved for my food truck faster than expected. The transparency is unmatched.”</p>
              <div className="author">— Kevin Pinas</div>
            </div>
            <div className="testimonial-card">
              <div className="stars" aria-label="Rated 5 out of 5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} />
                ))}
              </div>
              <p className="quote">“Our group trusts the system. Automated logs end disputes before they start.”</p>
              <div className="author">— Mireille Abena</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing plans */}
      <section className="pricing-section">
        <div className="container">
          <h2 className="section-title">Simple, transparent pricing</h2>
          <p className="section-subtitle">Start free. Upgrade as your community grows.</p>
          <div className="pricing-grid">
            <div className="plan-card">
              <div className="plan-header">
                <h3>Starter</h3>
                <div className="price">Free</div>
              </div>
              <ul className="plan-features">
                <li>Up to 1 active tanda</li>
                <li>Up to 12 members</li>
                <li>Automated slots and payouts</li>
                <li>Basic notifications</li>
              </ul>
              <Link to="/dashboard" className="cta-button secondary">Get started</Link>
            </div>

            <div className="plan-card featured">
              <div className="badge">Popular</div>
              <div className="plan-header">
                <h3>Community</h3>
                <div className="price">SRD 49<span>/mo</span></div>
              </div>
              <ul className="plan-features">
                <li>Up to 5 active tandas</li>
                <li>Up to 60 members</li>
                <li>Advanced logs and reminders</li>
                <li>Priority support</li>
              </ul>
              <Link to="/dashboard" className="cta-button primary">Start Community</Link>
            </div>

            <div className="plan-card">
              <div className="plan-header">
                <h3>Organization</h3>
                <div className="price">Contact</div>
              </div>
              <ul className="plan-features">
                <li>Unlimited tandas and members</li>
                <li>Custom policies and workflows</li>
                <li>Dedicated success manager</li>
                <li>Integrations and SSO</li>
              </ul>
              <a href="mailto:bitsu.sr@gmail.com" className="cta-button secondary">Contact sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container">
          <h2 className="section-title">Frequently asked questions</h2>
          <div className="faq-list" role="list">
            <details className="faq-item">
              <summary>What is a tanda and how does it work?</summary>
              <p>A tanda is a rotating savings group. Members contribute on a schedule and each round one member receives the pooled payout until all have received their turn.</p>
            </details>
            <details className="faq-item">
              <summary>How does Sranan Kasmoni keep tandas secure?</summary>
              <p>We use bank-level auth, granular roles, and audit trails. Automated logs ensure transparency and reduce disputes.</p>
            </details>
            <details className="faq-item">
              <summary>Can we manage multiple tandas?</summary>
              <p>Yes. Paid plans support multiple active tandas and larger member limits.</p>
            </details>
            <details className="faq-item">
              <summary>Do members need to download an app?</summary>
              <p>No. It’s a PWA—installable from the browser on desktop and mobile.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>{t('landing.cta.title')}</h2>
            <p>{t('landing.cta.subtitle')}</p>
            <div className="cta-buttons">
              <Link to="/dashboard" className="cta-button primary large">
                {t('landing.cta.primary')}
                <ArrowRight size={24} />
              </Link>
              <Link to="/groups" className="cta-button secondary large">
                {t('landing.cta.secondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="container">
          <h2 className="section-title">{t('landing.contact.title')}</h2>
          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-item">
                <h4>{t('landing.contact.email')}</h4>
                <p>bitsu.sr@gmail.com</p>
              </div>
              <div className="contact-item">
                <h4>{t('landing.contact.followUs')}</h4>
                <div className="social-links">
                  <a 
                    href="https://www.facebook.com/kasmoni.sr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="social-link"
                  >
                    {t('landing.contact.facebook')}
                  </a>
                  <a 
                    href="https://x.com/sr_kasmoni" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="social-link"
                  >
                    {t('landing.contact.twitter')}
                  </a>
                </div>
              </div>
            </div>
            <div className="contact-message">
              <p>{t('landing.contact.message')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landing
