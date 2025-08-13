import { Facebook, Twitter } from 'lucide-react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <p className="copyright">© 2024 Sranan Kasmoni. All Rights Reserved</p>
          <p className="email">Email: bitsu.sr@gmail.com</p>
        </div>
        <div className="footer-right">
          <a 
            href="https://www.facebook.com/kasmoni.sr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link facebook"
            aria-label="Visit our Facebook page"
          >
            <Facebook size={24} />
          </a>
          <a 
            href="https://x.com/sr_kasmoni" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link twitter"
            aria-label="Visit our Twitter page"
          >
            <Twitter size={24} />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer


