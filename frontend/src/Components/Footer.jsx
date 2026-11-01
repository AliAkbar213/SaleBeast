import { Link } from "react-router";
import WhatsAppIcon from "./WhatsAppIcon";
import "./Footer.css";

export default function Footer() {
  return (
      <footer className="store-footer">
        <div className="page-container">
          <Link to="/" className="store-footer-brand">SALE<span>BEAST</span></Link>
          <nav className="store-footer-socials" aria-label="Contact and follow SaleBeast">
            <a href="https://wa.me/96599830926" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp: +965 9983 0926 (opens in a new tab)" title="WhatsApp: +965 9983 0926">
              <WhatsAppIcon size={22} />
            </a>
            <a href="https://www.instagram.com/salebeast.kwt/" target="_blank" rel="noopener noreferrer" aria-label="SaleBeast on Instagram (opens in a new tab)" title="Instagram: @salebeast.kwt">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="https://www.facebook.com/SaleBeast.kw" target="_blank" rel="noopener noreferrer" aria-label="SaleBeast on Facebook (opens in a new tab)" title="Facebook: SaleBeast.kw">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.25c0-1.01.28-1.7 1.74-1.7H17V2.42A23.5 23.5 0 0 0 14.44 2C11.9 2 10 3.55 10 6.4v3.1H7V13h3v9h3.5Z" />
              </svg>
            </a>
          </nav>
          <p>© {new Date().getFullYear()} SaleBeast</p>
          <Link className="store-footer-cart" to="/cart">View your cart <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
        </div>
      </footer>
  );
}
