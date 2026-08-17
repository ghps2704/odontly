import { useEffect, useState } from 'react';

/**
 * Drives the mount/visible states behind a full-screen slide-in/out panel.
 * Double rAF: the first frame commits the panel off-screen; only the second
 * flips it to visible, so the browser actually paints the "before" state —
 * a single rAF often fires before that first paint and the transition never
 * has anything to animate from.
 */
export function useSlidePanel(isOpen: boolean, durationMs = 250) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setVisible(true));
            });
            return () => {
                cancelAnimationFrame(raf1);
                cancelAnimationFrame(raf2);
            };
        }
        if (mounted) {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), durationMs);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    return { mounted, visible };
}
