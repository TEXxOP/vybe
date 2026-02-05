import { Link } from 'react-router-dom';
import './CommunityHub.css';

const CommunityHub = () => {
    return (
        <section className="community-hub" id="community">
            <div className="community-container">
                {/* Left Section - Title */}
                <div className="community-left">
                    <h2 className="community-title">Community Hub</h2>
                    <p className="community-subtitle">Join the tribe. Express your vibe</p>

                    {/* Pink Description Card */}
                    <div className="description-card">
                        <p>Where fashion meets connection. Exclusive drops, style battles, and real connections — all in one place.</p>
                    </div>
                </div>

                {/* Main Cards Area */}
                <div className="community-cards">
                    {/* Row 1 */}
                    <div className="cards-row-1">
                        {/* Upcoming Challenge Card */}
                        <Link to="/shop" className="challenge-card upcoming">
                            <span className="challenge-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#E87D6F">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                                Upcoming Challenge
                            </span>
                            <div className="challenge-image">
                                <img
                                    src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=300&fit=crop"
                                    alt="Style Challenge"
                                />
                            </div>
                        </Link>

                        {/* Style Remix Challenge Card */}
                        <div className="challenge-card remix">
                            <div className="remix-image">
                                <img
                                    src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop"
                                    alt="Remix Challenge"
                                />
                            </div>
                            <div className="remix-content">
                                <h3>Style Remix Challenge</h3>
                                <p>Show off your unique vibe by mixing and matching your favorite pieces from our latest collection.</p>
                                <div className="challenge-details">
                                    <div className="detail-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E87D6F" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <div>
                                            <span className="detail-label">Deadline</span>
                                            <span className="detail-value">July 15</span>
                                        </div>
                                    </div>
                                    <div className="detail-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E87D6F" strokeWidth="2">
                                            <circle cx="12" cy="8" r="7" />
                                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                                        </svg>
                                        <div>
                                            <span className="detail-label">Rewards</span>
                                            <span className="detail-value">Exclusive discount code</span>
                                        </div>
                                    </div>
                                </div>
                                <Link to="/shop" className="join-challenge-btn">Join Challenge</Link>
                            </div>
                        </div>
                    </div>

                    {/* Row 2 - Testimonial */}
                    <div className="cards-row-2">
                        <div className="testimonial-card">
                            <div className="testimonial-user">
                                <img
                                    src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop"
                                    alt="Elena Jackson"
                                />
                                <div className="user-info">
                                    <h4>Elena Jackson</h4>
                                    <span>OG Member</span>
                                </div>
                            </div>
                            <p className="testimonial-text">
                                "Wearing VYBE makes me feel like I own the streets."
                            </p>
                            <span className="hashtag">#VybeTribe</span>
                        </div>

                        {/* Newsletter Card */}
                        <div className="newsletter-card">
                            <div className="newsletter-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#E87D6F">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                <span>Be Part of the Inner Circle</span>
                            </div>
                            <p>Get exclusive drops, member-only deals & fresh VYBE content — straight to your inbox.</p>
                            <div className="newsletter-form">
                                <input type="email" placeholder="Enter your email" />
                                <button className="subscribe-btn">
                                    Join Newsletter
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                            <div className="newsletter-options">
                                <label>
                                    <input type="checkbox" defaultChecked />
                                    <span>I want to be a VYBE faster</span>
                                </label>
                                <label>
                                    <input type="checkbox" defaultChecked />
                                    <span>I want early access to limited collections</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Section - Join Tribe & CTA */}
                <div className="community-right">
                    {/* Fashion Image */}
                    <div className="fashion-image-container">
                        <img
                            src="https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=500&fit=crop"
                            alt="Fashion"
                        />
                        {/* Join Tribe Button - Vertical */}
                        <Link to="/register" className="join-tribe-btn">
                            <span className="tribe-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                </svg>
                            </span>
                            <span>Join The Vybe Tribe</span>
                        </Link>
                    </div>

                    {/* CTA Text */}
                    <div className="cta-card">
                        <p>Whether you're here to get inspired or to inspire others, the tribe is waiting.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CommunityHub;
