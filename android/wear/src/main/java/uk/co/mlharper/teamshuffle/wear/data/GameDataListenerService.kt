package uk.co.mlharper.teamshuffle.wear.data

import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import uk.co.mlharper.teamshuffle.wear.presentation.MainActivity
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

/**
 * Listens for game data sent from the phone app via the Wearable Data Layer.
 * Updates the shared WatchDataStore so the UI can react.
 * Vibrates the watch when a new game is loaded.
 */
class GameDataListenerService : WearableListenerService() {

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED && event.dataItem.uri.path == "/game/active") {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap

                val gameId = dataMap.getString("gameId") ?: continue
                val title = dataMap.getString("title") ?: ""
                val team1Name = dataMap.getString("team1Name") ?: "Team 1"
                val team2Name = dataMap.getString("team2Name") ?: "Team 2"
                val team1Colour = dataMap.getString("team1Colour") ?: "#22C55E"
                val team2Colour = dataMap.getString("team2Colour") ?: "#3B82F6"
                val team1Players = dataMap.getStringArrayList("team1Players") ?: arrayListOf()
                val team2Players = dataMap.getStringArrayList("team2Players") ?: arrayListOf()
                val score1 = dataMap.getInt("score1", 0)
                val score2 = dataMap.getInt("score2", 0)
                val startedAt = dataMap.getLong("startedAt", 0L)
                val matchStarted = dataMap.getBoolean("matchStarted", false)
                val totalPausedMs = dataMap.getLong("totalPausedMs", 0L)
                val pausedAt = dataMap.getLong("pausedAt", 0L)
                val matchEnded = dataMap.getBoolean("matchEnded", false)

                Log.d(TAG, "Received game: $gameId ($team1Name vs $team2Name) " +
                    "t1=${team1Players.size} t2=${team2Players.size} started=$matchStarted " +
                    "paused=${pausedAt > 0} ended=$matchEnded")

                WatchDataStore.updateGame(
                    ActiveGame(
                        gameId = gameId,
                        title = title,
                        team1Name = team1Name,
                        team2Name = team2Name,
                        team1Colour = team1Colour,
                        team2Colour = team2Colour,
                        team1Players = team1Players,
                        team2Players = team2Players,
                        score1 = score1,
                        score2 = score2,
                        startedAt = startedAt,
                        matchStarted = matchStarted,
                        paused = pausedAt > 0,
                        pausedAt = pausedAt,
                        totalPausedMs = totalPausedMs,
                        matchEnded = matchEnded,
                    )
                )

                // Vibrate and launch the app
                vibrateNotification()
                launchApp()

            } else if (event.type == DataEvent.TYPE_CHANGED && event.dataItem.uri.path == "/game/state") {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                val gameId = dataMap.getString("gameId") ?: continue
                val state = dataMap.getString("state") ?: continue
                val pausedAt = dataMap.getLong("pausedAt", 0L)
                val totalPausedMs = dataMap.getLong("totalPausedMs", 0L)
                val score1 = dataMap.getInt("score1", -1)
                val score2 = dataMap.getInt("score2", -1)

                val currentGame = WatchDataStore.activeGame.value
                if (currentGame != null && currentGame.gameId == gameId) {
                    Log.d(TAG, "Received match state: $state for $gameId (score=$score1:$score2)")
                    WatchDataStore.applyPhoneState(state, pausedAt, totalPausedMs, score1, score2)
                } else {
                    Log.w(TAG, "Ignoring state for $gameId — current game is ${currentGame?.gameId}")
                }
            } else if (event.type == DataEvent.TYPE_DELETED && event.dataItem.uri.path == "/game/active") {
                Log.d(TAG, "Game cleared from phone")
                WatchDataStore.clearGame()
            }
        }
    }

    private fun vibrateNotification() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = getSystemService(VibratorManager::class.java)
                manager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(VIBRATOR_SERVICE) as? Vibrator
            }
            vibrator?.vibrate(
                VibrationEffect.createWaveform(longArrayOf(0, 100, 80, 100), -1)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Vibration failed", e)
        }
    }

    private fun launchApp() {
        try {
            val intent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch activity", e)
        }
    }

    companion object {
        private const val TAG = "GameDataListener"
    }
}
