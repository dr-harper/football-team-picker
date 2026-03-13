import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

export type FoldableMode = 'normal' | 'unfolded' | 'tabletop' | 'cover';

interface FoldableState {
    mode: FoldableMode;
    isUnfolded: boolean;
    isTabletop: boolean;
    isCover: boolean;
}

const COVER_MAX_WIDTH = 600;

function detectMode(
    horizontalSpanning: boolean,
    verticalSpanning: boolean,
): FoldableMode {
    if (horizontalSpanning) return 'unfolded';
    if (verticalSpanning) return 'tabletop';
    if (typeof window !== 'undefined' && window.innerWidth < COVER_MAX_WIDTH) return 'cover';
    return 'normal';
}

function buildState(mode: FoldableMode): FoldableState {
    return {
        mode,
        isUnfolded: mode === 'unfolded',
        isTabletop: mode === 'tabletop',
        isCover: mode === 'cover',
    };
}

export function useFoldableDisplay(): FoldableState {
    const [state, setState] = useState<FoldableState>(() => buildState('normal'));

    const update = useCallback((hSpanning: boolean, vSpanning: boolean) => {
        setState(buildState(detectMode(hSpanning, vSpanning)));
    }, []);

    useEffect(() => {
        const hMql = window.matchMedia('(horizontal-viewport-segments: 2)');
        const vMql = window.matchMedia('(vertical-viewport-segments: 2)');

        const onChange = () => update(hMql.matches, vMql.matches);

        // Initial check
        onChange();

        hMql.addEventListener('change', onChange);
        vMql.addEventListener('change', onChange);

        // Also listen for resize to detect cover → normal transitions
        window.addEventListener('resize', onChange);

        return () => {
            hMql.removeEventListener('change', onChange);
            vMql.removeEventListener('change', onChange);
            window.removeEventListener('resize', onChange);
        };
    }, [update]);

    return state;
}

const FoldableContext = createContext<FoldableState>(buildState('normal'));

export function FoldableProvider({ children }: { children: ReactNode }) {
    const state = useFoldableDisplay();
    return <FoldableContext.Provider value={state}>{children}</FoldableContext.Provider>;
}

export function useFoldable(): FoldableState {
    return useContext(FoldableContext);
}
