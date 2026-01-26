import './Footer.css'
import { useLanguage } from '../contexts/LanguageContext'
import packageJson from '../../package.json'

const Footer = () => {
  const { t } = useLanguage()
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <p className="copyright">© 2024 Sranan Kasmoni. {t('footer.rights')}</p>
          <p className="email">{t('footer.email')}: bitsu.sr@gmail.com</p>
          <p className="version">Version: {packageJson.version}</p>
        </div>
        <div className="footer-right">
          <a 
            href="https://www.facebook.com/kasmoni.sr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-social-link footer-facebook-link"
            aria-label="Visit our Facebook page"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-2.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
            </svg>
          </a>
          <a 
            href="https://x.com/sr_kasmoni" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-social-link footer-twitter-link"
            aria-label="Visit our Twitter page"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer


