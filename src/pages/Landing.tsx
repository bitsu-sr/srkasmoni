
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Shield, TrendingUp, Clock, CheckCircle } from 'lucide-react'
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
              <span className="highlight">{t('landing.hero.titleLine1')}</span>
              <br />
              {t('landing.hero.titleLine2')}
            </h1>
            <p className="hero-subtitle">
              {t('landing.hero.subtitle')}
            </p>
            <div className="hero-cta">
              <Link to="/dashboard" className="cta-button primary">
                {t('landing.hero.getStarted')}
                <ArrowRight size={20} />
              </Link>
              <Link to="/groups" className="cta-button secondary">
                {t('landing.hero.exploreGroups')}
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
                  src="/business11a.jpg" 
                  alt="Person planning financial future" 
                  className="hero-img"
                />
              </div>
              <div className="image-item">
                <img 
                  src="/investment01.jpg" 
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
