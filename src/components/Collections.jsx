import { Link } from 'react-router-dom';
import './Collections.css';

const Collections = () => {
    const collections = [
        {
            id: 1,
            name: 'EDGE',
            slug: 'jackets',
            color: '#1A8B8B',
            images: [
                'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=250&h=350&fit=crop',
                'https://images.unsplash.com/photo-1475180429745-21d79e2e5d90?w=250&h=350&fit=crop'
            ]
        },
        {
            id: 2,
            name: 'CANVAS',
            slug: 'shirts',
            color: '#E87D6F',
            images: [
                'https://images.unsplash.com/photo-1544441893-675973e31985?w=250&h=350&fit=crop',
                'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=250&h=350&fit=crop'
            ]
        },
        {
            id: 3,
            name: 'ENERGY',
            slug: 'hoodies',
            color: '#2D2D2D',
            images: [
                'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=250&h=350&fit=crop',
                'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=250&h=350&fit=crop'
            ]
        }
    ];

    return (
        <section className="collections" id="collections">
            {/* Dark Container - extends full width */}
            <div className="collections-box">
                {/* Left Arrow */}
                <button className="nav-arrow left-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                {/* Center Content */}
                <div className="collections-center">
                    {/* Cards Row */}
                    <div className="cards-row">
                        {collections.map((collection) => (
                            <Link
                                to={`/shop?category=${collection.slug}`}
                                key={collection.id}
                                className="card"
                                style={{ '--label-color': collection.color }}
                            >
                                {/* Two tall images side by side */}
                                <div className="card-images">
                                    <div className="card-img">
                                        <img src={collection.images[0]} alt={collection.name} />
                                    </div>
                                    <div className="card-img">
                                        <img src={collection.images[1]} alt={collection.name} />
                                    </div>
                                </div>

                                {/* Vertical label */}
                                <div className="card-label">
                                    <span className="label-arrow">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M7 17L17 7M17 7H7M17 7v10" />
                                        </svg>
                                    </span>
                                    <span className="label-text">{collection.name}</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* View All Button - inside the box */}
                    <Link to="/shop" className="view-all-btn">
                        <span>View All Collections</span>
                        <span className="btn-arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </span>
                    </Link>
                </div>

                {/* Right Arrow */}
                <button className="nav-arrow right-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>
        </section>
    );
};

export default Collections;
