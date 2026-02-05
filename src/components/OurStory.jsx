import { Link } from 'react-router-dom';
import './OurStory.css';

const OurStory = () => {
    const milestones = [
        { year: '2022', title: 'The Spark' },
        { year: '2023', title: 'The First Drop' },
        { year: '2024', title: 'The Culture Collab' }
    ];

    return (
        <section className="our-story" id="about">
            <div className="our-story-container">
                {/* Left Section - Title, Description, Timeline */}
                <div className="story-left">
                    <h2 className="story-title">Our Story</h2>
                    <p className="story-description">
                        VYBE started as a passion project — a rebellion against mass trends and an embrace of raw, unapologetic style. We design for those who own their vibe and live it loud.
                    </p>

                    {/* Brush stroke decoration */}
                    <div className="brush-decoration">
                        <svg width="140" height="25" viewBox="0 0 140 25">
                            <path d="M5 18 Q35 8 70 15 Q105 22 135 10" stroke="#E87D6F" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.35" />
                            <path d="M15 22 Q45 14 80 18" stroke="#E87D6F" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.25" />
                        </svg>
                    </div>

                    {/* Timeline */}
                    <div className="timeline">
                        {milestones.map((item) => (
                            <div key={item.year} className="timeline-item">
                                <span className="timeline-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E87D6F" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                </span>
                                <div className="timeline-text">
                                    <span className="timeline-year">{item.year}</span>
                                    <span className="timeline-dash">–</span>
                                    <span className="timeline-title">{item.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Small Blob Image - Gemini Generated */}
                    <div className="illustration-blob">
                        <img
                            src="/Gemini_Generated_Image_ahmdzoahmdzoahmd.png"
                            alt="Fashion illustration"
                            className="illustration-img"
                        />
                    </div>
                </div>

                {/* Center - 2025 Content + Stats */}
                <div className="story-center">
                    <div className="featured-2025">
                        <div className="featured-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#E87D6F">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="featured-year">2025</span>
                            <span className="featured-dash">–</span>
                            <span className="featured-title">Going Global</span>
                        </div>
                        <p className="featured-text">
                            Our official site went live. Now, we're taking VYBE worldwide — one bold fit at a time. The movement has just begun.
                        </p>

                        {/* Read More Button - Vertical */}
                        <Link to="/register" className="read-more-btn">
                            <span className="btn-arrow">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 19V5M5 12l7-7 7 7" />
                                </svg>
                            </span>
                            <span className="read-more-text">Join The Movement</span>
                        </Link>
                    </div>

                    {/* Stats Section */}
                    <div className="story-stats">
                        <div className="stat-item">
                            <span className="stat-number">50+</span>
                            <span className="stat-label">Countries</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">100K</span>
                            <span className="stat-label">Community</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">500+</span>
                            <span className="stat-label">Designs</span>
                        </div>
                    </div>

                    {/* Quote */}
                    <div className="story-quote">
                        <p>"Fashion is the armor to survive the reality of everyday life."</p>
                        <span className="quote-author">— Bill Cunningham</span>
                    </div>
                </div>

                {/* Right - Large Fashion Image */}
                <div className="story-right">
                    <div className="fashion-image">
                        <img
                            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&h=650&fit=crop"
                            alt="Fashion model"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default OurStory;
