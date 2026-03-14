import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

interface WearPlugin {
    sendAuthToken(opts: { token: string; displayName: string }): Promise<{ success: boolean }>
    sendGameData(opts: {
        gameId: string
        title: string
        team1Name: string
        team2Name: string
        team1Colour: string
        team2Colour: string
        team1Players: string[]
        team2Players: string[]
        score1: number
        score2: number
        startedAt: number
        matchStarted?: boolean
        totalPausedMs?: number
        pausedAt?: number
        matchEnded?: boolean
    }): Promise<{ success: boolean }>
    clearGameData(): Promise<{ success: boolean }>
    sendMatchState(opts: {
        gameId: string
        state: string
        pausedAt?: number
        totalPausedMs?: number
        endedAt?: number
        score1?: number
        score2?: number
    }): Promise<{ success: boolean }>
    isWatchConnected(): Promise<{ connected: boolean; nodeCount: number }>
    addListener(
        eventName: 'watchMessage',
        listenerFunc: (data: { path: string; data: string }) => void,
    ): Promise<PluginListenerHandle>
}

const Wear = registerPlugin<WearPlugin>('Wear')

/** Check if we're on Android native (wear features only work there) */
function isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

/** Send Firebase custom token to the watch for auth */
export async function sendAuthToWatch(token: string, displayName: string): Promise<boolean> {
    if (!isAndroidNative()) return false
    try {
        const result = await Wear.sendAuthToken({ token, displayName })
        return result.success
    } catch (e) {
        console.error('Failed to send auth to watch:', e)
        return false
    }
}

/** Send active game data to the watch for scoring */
export async function sendGameToWatch(opts: {
    gameId: string
    title: string
    team1Name: string
    team2Name: string
    team1Colour: string
    team2Colour: string
    team1Players: string[]
    team2Players: string[]
    score1: number
    score2: number
    startedAt: number
    matchStarted?: boolean
    totalPausedMs?: number
    pausedAt?: number
    matchEnded?: boolean
}): Promise<boolean> {
    if (!isAndroidNative()) return false
    try {
        const result = await Wear.sendGameData(opts)
        return result.success
    } catch (e) {
        console.error('Failed to send game to watch:', e)
        return false
    }
}

/** Send match state change to the watch (pause/resume/end) */
export async function sendMatchStateToWatch(opts: {
    gameId: string
    state: 'paused' | 'resumed' | 'ended' | 'scoreUpdate'
    pausedAt?: number
    totalPausedMs?: number
    endedAt?: number
    score1?: number
    score2?: number
}): Promise<boolean> {
    if (!isAndroidNative()) return false
    try {
        const result = await Wear.sendMatchState(opts)
        return result.success
    } catch (e) {
        console.error('Failed to send match state to watch:', e)
        return false
    }
}

/** Clear game data from the watch */
export async function clearWatchGame(): Promise<boolean> {
    if (!isAndroidNative()) return false
    try {
        const result = await Wear.clearGameData()
        return result.success
    } catch (e) {
        console.error('Failed to clear watch game:', e)
        return false
    }
}

/** Check if a Wear OS watch is connected */
export async function isWatchConnected(): Promise<boolean> {
    if (!isAndroidNative()) return false
    try {
        const result = await Wear.isWatchConnected()
        return result.connected
    } catch {
        return false
    }
}

/**
 * Listen for messages from the watch (score updates, goals, end game).
 * Returns a cleanup function to remove the listener.
 */
export async function addWatchMessageListener(
    callback: (path: string, data: string) => void,
): Promise<(() => void) | null> {
    if (!isAndroidNative()) return null
    try {
        const handle = await Wear.addListener('watchMessage', (event) => {
            callback(event.path, event.data)
        })
        return () => handle.remove()
    } catch (e) {
        console.error('Failed to add watch message listener:', e)
        return null
    }
}
