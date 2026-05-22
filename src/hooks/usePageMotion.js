import { useEffect } from 'react';

const reduceMotionQuery = '(prefers-reduced-motion: reduce)';

const getReduceMotion = () => window.matchMedia(reduceMotionQuery).matches;

export const useScrollReveal = (watchKey) => {
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const observed = new WeakSet();

        if (getReduceMotion()) {
            document.querySelectorAll('[data-reveal], .reveal').forEach((el) => {
                el.classList.add('is-visible');
            });
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        const observeTargets = () => {
            const targets = Array.from(document.querySelectorAll('[data-reveal], .reveal'));

            targets.forEach((el, index) => {
                if (observed.has(el)) return;

                if (!el.style.getPropertyValue('--reveal-delay')) {
                    el.style.setProperty('--reveal-delay', `${Math.min(index * 60, 420)}ms`);
                }

                observed.add(el);
                observer.observe(el);
            });
        };

        const mutationObserver = new MutationObserver(observeTargets);
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        observeTargets();

        return () => {
            mutationObserver.disconnect();
            observer.disconnect();
        };
    }, [watchKey]);
};

export const useImageLoadClass = (watchKey) => {
    useEffect(() => {
        if (typeof document === 'undefined') return undefined;

        const watched = new WeakSet();

        const markLoaded = (event) => {
            event.currentTarget.classList.add('image-loaded');
        };

        const watchImages = () => {
            const images = Array.from(document.querySelectorAll('img'));

            images.forEach((image) => {
                if (watched.has(image)) return;
                watched.add(image);

                if (image.complete) {
                    image.classList.add('image-loaded');
                } else {
                    image.addEventListener('load', markLoaded, { once: true });
                }
            });
        };

        const mutationObserver = new MutationObserver(watchImages);
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        watchImages();

        return () => {
            mutationObserver.disconnect();
            Array.from(document.querySelectorAll('img')).forEach((image) => {
                image.removeEventListener('load', markLoaded);
            });
        };
    }, [watchKey]);
};
