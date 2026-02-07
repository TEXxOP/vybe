import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Header.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cart, user, logout } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <nav className="nav-left">
          <Link to="/shop" className="nav-link">Shop</Link>
          <Link to="/#collections" className="nav-link">Collections</Link>
          <Link to="/#about" className="nav-link">About</Link>
          <Link to="/#contact" className="nav-link">Contact</Link>
        </nav>

        <Link to="/" className="logo">
          <span className="logo-text">VYBE</span>
        </Link>

        <div className="nav-right">
          <button className="icon-btn search-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>

          {user ? (
            <div className="user-dropdown">
              <div className="user-avatar">
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" alt={user.name} />
              </div>
              <div className="dropdown-menu">
                <span className="user-name">{user.name}</span>
                {user.role === 'admin' && (
                  <Link to="/admin" className="admin-link">Admin Dashboard</Link>
                )}
                <Link to="/orders">My Orders</Link>
                <button onClick={handleLogout}>Logout</button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="login-link">Login</Link>
          )}

          <Link to="/cart" className="cart-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            {cart.totalItems > 0 && (
              <span className="cart-count">{cart.totalItems}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <span className="logo-text">VYBE</span>
          <button className="close-btn" onClick={() => setMobileMenuOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="mobile-nav">
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)}>Shop</Link>
          <Link to="/#collections" onClick={() => setMobileMenuOpen(false)}>Collections</Link>
          <Link to="/#about" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link to="/#contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          {!user && (
            <Link to="/login" className="mobile-login" onClick={() => setMobileMenuOpen(false)}>
              Login / Register
            </Link>
          )}
        </nav>
      </div>

      {/* Backdrop */}
      {mobileMenuOpen && (
        <div className="drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
    </header>
  );
};

export default Header;
