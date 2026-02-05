import { Link } from 'react-router-dom';
import { Icons } from './Icons';
import './Hero.css';
import modelImage from '../assets/model.png';

const Hero = () => {
    return (
        <section className="hero">
            <div className="hero-container">
                {/* Main Headline - positioned above everything */}
                <div className="hero-headline">
                    <span className="headline-own">Own the</span>
                    <span className="headline-edge">EDGE</span>
                    <svg className="headline-curve" viewBox="0 0 120 40" preserveAspectRatio="none">
                        <path d="M5 32 Q60 8 115 32" stroke="#E87D6F" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                    <span className="headline-keep">Keep the</span>
                    <span className="headline-vibe">VIBE</span>
                </div>

                {/* Hero Card Wrapper */}
                <div className="hero-wrapper">
                    {/* Background swoosh behind model */}
                    <svg className="background-swoosh" viewBox="0 0 400 150" preserveAspectRatio="none">
                        <path d="M0 100 Q100 20 200 60 Q300 100 400 40" stroke="#F5D5D0" strokeWidth="60" strokeLinecap="round" fill="none" opacity="0.6" />
                    </svg>

                    {/* Model Image - Positioned to pop out above card */}
                    <img
                        src={modelImage}
                        alt="Fashion Model"
                        className="model-image"
                    />

                    {/* Main Hero Card */}
                    <div className="hero-card">
                        <div className="hero-card-content">
                            {/* Left side - New Arrivals */}
                            <div className="hero-left">
                                <span className="new-arrivals-tag">New Arrivals</span>
                                <h2 className="hero-title">Where Art Meets<br />your Style</h2>
                                <p className="hero-subtitle">Step into the future of<br />streetwear today.</p>

                                <Link to="/shop" className="new-drops-btn">
                                    <span>New Drops</span>
                                    <span className="btn-arrow">→</span>
                                </Link>

                                {/* Rating */}
                                <div className="rating-section">
                                    <div className="rating-avatars">
                                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop" alt="User 1" />
                                        <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop" alt="User 2" />
                                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" alt="User 3" />
                                        <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop" alt="User 4" />
                                    </div>
                                    <div className="rating-text">
                                        <span className="rating-stars"><Icons.Star size={16} color="#E87D6F" filled /></span>
                                        <div>
                                            <span>Rated 5 Stars by</span>
                                            <strong>The Vybe Tribe</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center spacer for model image */}
                            <div className="hero-center"></div>

                            {/* Right side - Feature Icons + Featured Product */}
                            <div className="hero-right">
                                {/* Feature Icons Row */}
                                <div className="feature-icons">
                                    <div className="feature-item">
                                        <div className="feature-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                <path d="M2 17l10 5 10-5" />
                                                <path d="M2 12l10 5 10-5" />
                                            </svg>
                                        </div>
                                        <span>Future<br />Threads</span>
                                    </div>
                                    <div className="feature-item">
                                        <div className="feature-icon star">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        </div>
                                        <span>Unique<br />Designs</span>
                                    </div>
                                    <div className="feature-item">
                                        <div className="feature-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <path d="M12 8v8" />
                                                <path d="M8 12h8" />
                                            </svg>
                                        </div>
                                        <span>Limited<br />Drops</span>
                                    </div>
                                </div>

                                {/* Featured Product Card */}
                                <div className="featured-product">
                                    <span className="featured-label">Featured Product</span>
                                    <Link to="/product/1" className="product-card">
                                        <div className="product-image">
                                            <img
                                                src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=550&fit=crop"
                                                alt="Urban Vanguard Tee"
                                            />
                                        </div>
                                        <div className="product-info">
                                            <h4>Urban Vanguard Tee</h4>
                                            <p>Unmatched comfort.</p>
                                            <div className="product-price">
                                                <span className="cart-icon"><Icons.ShoppingBag size={16} color="#E87D6F" /></span>
                                                <span className="price">₹2,672</span>
                                            </div>
                                        </div>
                                    </Link>
                                    {/* Arrow button on the card */}
                                    <Link to="/product/1" className="product-nav-arrow">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Arrow - outside card on right */}
                        <button className="hero-nav-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
