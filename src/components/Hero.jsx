import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './Icons';
import './Hero.css';
import modelImage from '../assets/model.png';

const Hero = () => {
    const heroRef       = useRef(null);
    const wrapperRef    = useRef(null);
    const glitchRRef    = useRef(null);
    const glitchBRef    = useRef(null);
    const scanlinesRef  = useRef(null);

    // Preload model image
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'preload'; link.as = 'image'; link.href = modelImage;
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);

    // Rise-up parallax + 3D mouse tilt + subtle chromatic glitch
    useEffect(() => {
        const hero    = heroRef.current;
        const wrapper = wrapperRef.current;
        const rLayer  = glitchRRef.current;
        const bLayer  = glitchBRef.current;
        if (!wrapper) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const lerp = (a, b, t) => a + (b - a) * t;

        let tiltTargetX = 0, tiltTargetY = 0;
        let tiltX = 0, tiltY = 0;
        let scrollY    = 0;   // raw scrollY snapshot
        let chromatic  = 0;   // 0 → 1 chromatic intensity
        let spike = 0;
        let spikeTimer = null;
        let raf = 0;

        const tick = () => {
            tiltX = lerp(tiltX, tiltTargetX, 0.07);
            tiltY = lerp(tiltY, tiltTargetY, 0.07);

            const heroH = hero.offsetHeight || window.innerHeight;
            // progress 0→1 over first 65% of hero height
            const prog = Math.min(scrollY / (heroH * 0.65), 1);

            // ── Zoom toward camera ─────────────────────────────────────
            const scale = 1 + prog * 0.22;   // 1.0 → 1.22

            // ── Opacity: sharp fade, already 50% gone at 40% scroll ───
            const opacity = Math.max(0, 1 - prog * 1.5);

            // ── Glow: brightness surges as she fades (dissolve-into-light)
            const glow = 1 + prog * 0.9;     // 1.0 → 1.9

            wrapper.style.transform = [
                `translateX(-50%)`,
                `perspective(900px)`,
                `rotateX(${tiltX - prog * 6}deg)`,
                `rotateY(${tiltY}deg)`,
                `scale(${scale})`
            ].join(' ');
            wrapper.style.opacity = opacity;

            // ── Chromatic split builds with scroll ────────────────────
            const chrOff = chromatic * 8 + spike;
            rLayer.style.transform = `translateX(${chrOff}px)`;
            bLayer.style.transform = `translateX(${-chrOff}px)`;
            rLayer.style.opacity   = chromatic * 0.6;
            bLayer.style.opacity   = chromatic * 0.6;

            const shadowX = tiltY * 3;
            wrapper.style.filter =
                `brightness(${glow}) drop-shadow(${shadowX}px 28px 38px rgba(0,0,0,0.14))`;

            raf = requestAnimationFrame(tick);
        };

        // 3D mouse tilt (disabled while scrolled)
        const onMouseMove = (e) => {
            if (window.innerWidth <= 768) return;
            const r  = hero.getBoundingClientRect();
            const cx = r.left + r.width  / 2;
            const cy = r.top  + r.height / 2;
            // Dampen tilt based on how far user has scrolled
            const dampen = Math.max(0, 1 - (scrollY / hero.offsetHeight) * 3);
            tiltTargetY =  ((e.clientX - cx) / (r.width  / 2)) * 10 * dampen;
            tiltTargetX = -((e.clientY - cy) / (r.height / 2)) *  8 * dampen;
        };
        const onMouseLeave = () => { tiltTargetX = 0; tiltTargetY = 0; };

        // Scroll: capture raw scrollY + drive chromatic
        const onScroll = () => {
            scrollY   = window.scrollY;
            chromatic = Math.min(scrollY / (hero.offsetHeight * 0.5), 1);
        };

        // Occasional chromatic spike (more likely when scrolled)
        const spikeInterval = setInterval(() => {
            if (chromatic > 0.2 && Math.random() < chromatic * 0.45) {
                spike = (Math.random() - 0.5) * 22 * chromatic;
                clearTimeout(spikeTimer);
                spikeTimer = setTimeout(() => { spike = 0; }, 60 + Math.random() * 80);
            }
        }, 130);

        hero.addEventListener('mousemove', onMouseMove);
        hero.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('scroll', onScroll, { passive: true });
        raf = requestAnimationFrame(tick);

        return () => {
            hero.removeEventListener('mousemove', onMouseMove);
            hero.removeEventListener('mouseleave', onMouseLeave);
            window.removeEventListener('scroll', onScroll);
            cancelAnimationFrame(raf);
            clearInterval(spikeInterval);
            clearTimeout(spikeTimer);
            wrapper.style.transform = '';
            wrapper.style.opacity   = '';
            wrapper.style.filter    = '';
        };
    }, []);

    return (
        <section className="hero" ref={heroRef}>
            <div className="hero-container">

                {/* Headline */}
                <div className="hero-headline">
                    <span className="headline-own">Own the</span>
                    <span className="headline-edge">EDGE</span>
                    <svg className="headline-curve" viewBox="0 0 120 40" preserveAspectRatio="none">
                        <path d="M5 32 Q60 8 115 32" stroke="#E87D6F" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                    <span className="headline-keep">Keep the</span>
                    <span className="headline-vibe">VIBE</span>
                </div>

                <div className="hero-wrapper">
                    <svg className="background-swoosh" viewBox="0 0 400 150" preserveAspectRatio="none">
                        <path d="M0 100 Q100 20 200 60 Q300 100 400 40" stroke="#F5D5D0" strokeWidth="60" strokeLinecap="round" fill="none" opacity="0.6" />
                    </svg>

                    {/* Model + glitch layers */}
                    <div ref={wrapperRef} className="model-wrapper">
                        <img ref={glitchBRef} src={modelImage} alt="" aria-hidden="true"
                             className="model-glitch-layer model-glitch-b" decoding="async" />
                        <img src={modelImage} alt="Fashion Model"
                             className="model-image" decoding="async" />
                        <img ref={glitchRRef} src={modelImage} alt="" aria-hidden="true"
                             className="model-glitch-layer model-glitch-r" decoding="async" />
                        <div ref={scanlinesRef} className="glitch-scanlines" />
                    </div>

                    {/* Hero Card */}
                    <div className="hero-card">
                        <div className="hero-card-content">

                            {/* Left */}
                            <div className="hero-left">
                                <span className="new-arrivals-tag">New Arrivals</span>
                                <h2 className="hero-title">Where Art Meets<br />your Style</h2>
                                <p className="hero-subtitle">Step into the future of<br />streetwear today.</p>
                                <Link to="/shop" className="new-drops-btn">
                                    <span>New Drops</span>
                                    <span className="btn-arrow">&rarr;</span>
                                </Link>
                                <div className="rating-section">
                                    <div className="rating-avatars">
                                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop" alt="User 1" loading="lazy" decoding="async" />
                                        <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop" alt="User 2" loading="lazy" decoding="async" />
                                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" alt="User 3" loading="lazy" decoding="async" />
                                        <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop" alt="User 4" loading="lazy" decoding="async" />
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

                            {/* Center */}
                            <div className="hero-center">
                                <div className="hero-center-mark">
                                    <span>Drop 01</span>
                                    <strong>VYBE</strong>
                                </div>
                            </div>

                            {/* Right */}
                            <div className="hero-right">
                                <div className="feature-icons">
                                    <div className="feature-item">
                                        <div className="feature-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
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
                                                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" />
                                            </svg>
                                        </div>
                                        <span>Limited<br />Drops</span>
                                    </div>
                                </div>

                                <div className="featured-product">
                                    <span className="featured-label">Featured Product</span>
                                    <Link to="/product/1" className="product-card">
                                        <div className="product-image">
                                            <img src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=550&fit=crop"
                                                 alt="Urban Vanguard Tee" loading="lazy" decoding="async" />
                                        </div>
                                        <div className="product-info">
                                            <h4>Urban Vanguard Tee</h4>
                                            <p>Unmatched comfort.</p>
                                            <div className="product-price">
                                                <span className="cart-icon"><Icons.ShoppingBag size={16} color="#E87D6F" /></span>
                                                <span className="price">&#8377;2,672</span>
                                            </div>
                                        </div>
                                    </Link>
                                    <Link to="/product/1" className="product-nav-arrow">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>

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
