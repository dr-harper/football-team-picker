package uk.co.mlharper.teamshuffle.wear.presentation

import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import uk.co.mlharper.teamshuffle.wear.data.ActiveGame
import uk.co.mlharper.teamshuffle.wear.data.PhoneMessenger
import uk.co.mlharper.teamshuffle.wear.data.WatchDataStore
import uk.co.mlharper.teamshuffle.wear.presentation.theme.TeamShuffleWearTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Init persistence — restores from SharedPreferences if available
        WatchDataStore.init(applicationContext)

        // If SharedPreferences was empty, try DataLayer as fallback
        if (WatchDataStore.activeGame.value == null) {
            lifecycleScope.launch(Dispatchers.IO) {
                restoreGameFromDataLayer()
            }
        }

        setContent {
            TeamShuffleWearTheme {
                WatchApp()
            }
        }
    }

    private suspend fun restoreGameFromDataLayer() {
        try {
            val dataItems = Wearable.getDataClient(this)
                .getDataItems(Uri.parse("wear://*/game/active"))
                .await()

            for (item in dataItems) {
                val dataMap = DataMapItem.fromDataItem(item).dataMap
                val gameId = dataMap.getString("gameId") ?: continue

                Log.d(TAG, "Restoring game from DataLayer: $gameId")
                WatchDataStore.updateGame(
                    ActiveGame(
                        gameId = gameId,
                        title = dataMap.getString("title") ?: "",
                        team1Name = dataMap.getString("team1Name") ?: "Team 1",
                        team2Name = dataMap.getString("team2Name") ?: "Team 2",
                        team1Colour = dataMap.getString("team1Colour") ?: "#22C55E",
                        team2Colour = dataMap.getString("team2Colour") ?: "#3B82F6",
                        team1Players = dataMap.getStringArrayList("team1Players") ?: arrayListOf(),
                        team2Players = dataMap.getStringArrayList("team2Players") ?: arrayListOf(),
                        score1 = dataMap.getInt("score1", 0),
                        score2 = dataMap.getInt("score2", 0),
                        startedAt = dataMap.getLong("startedAt", 0L),
                        matchStarted = dataMap.getBoolean("matchStarted", false),
                        paused = dataMap.getLong("pausedAt", 0L) > 0,
                        pausedAt = dataMap.getLong("pausedAt", 0L),
                        totalPausedMs = dataMap.getLong("totalPausedMs", 0L),
                        matchEnded = dataMap.getBoolean("matchEnded", false),
                    )
                )
                break // Only one active game
            }
            dataItems.release()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restore game from DataLayer", e)
        }
    }
}

@Composable
private fun WatchApp() {
    val activeGame by WatchDataStore.activeGame.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val game = activeGame
    when {
        game == null -> {
            WaitingScreen(displayName = WatchDataStore.displayName)
        }
        game.matchEnded -> {
            FullTimeScreen(
                game = game,
                onDismiss = { WatchDataStore.clearGame() },
            )
        }
        !game.matchStarted -> {
            PreMatchScreen(
                game = game,
                onStartMatch = {
                    WatchDataStore.startMatch()
                    val startedAt = System.currentTimeMillis()
                    scope.launch {
                        try {
                            PhoneMessenger.sendMatchStarted(context, game.gameId, startedAt)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send match start to phone", e)
                        }
                    }
                },
            )
        }
        else -> {
            ScoringScreen(
                game = game,
                onGoalScored = { team, scorerName ->
                    val newScore1 = if (team == 1) game.score1 + 1 else game.score1
                    val newScore2 = if (team == 2) game.score2 + 1 else game.score2
                    val totalPaused = game.totalPausedMs
                    val elapsedSec = ((System.currentTimeMillis() - game.startedAt - totalPaused) / 1000).toInt()
                    WatchDataStore.updateScore(score1 = newScore1, score2 = newScore2)
                    scope.launch {
                        try {
                            PhoneMessenger.sendScoreUpdate(context, game.gameId, newScore1, newScore2)
                            if (scorerName != null) {
                                PhoneMessenger.sendGoalScored(context, game.gameId, team, scorerName, elapsedSec)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send score to phone", e)
                        }
                    }
                },
                onUndoGoal = { team ->
                    val newScore1 = if (team == 1) maxOf(0, game.score1 - 1) else game.score1
                    val newScore2 = if (team == 2) maxOf(0, game.score2 - 1) else game.score2
                    WatchDataStore.updateScore(score1 = newScore1, score2 = newScore2)
                    scope.launch {
                        try {
                            PhoneMessenger.sendUndoGoal(context, game.gameId, team, newScore1, newScore2)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send undo to phone", e)
                        }
                    }
                },
                onPause = {
                    val pausedAt = WatchDataStore.pauseMatch()
                    scope.launch {
                        try {
                            PhoneMessenger.sendMatchPaused(context, game.gameId, pausedAt)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send pause to phone", e)
                        }
                    }
                },
                onResume = {
                    val totalPausedMs = WatchDataStore.resumeMatch()
                    scope.launch {
                        try {
                            PhoneMessenger.sendMatchResumed(context, game.gameId, totalPausedMs)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send resume to phone", e)
                        }
                    }
                },
                onEndGame = {
                    val gameId = game.gameId
                    val endedAt = System.currentTimeMillis()
                    WatchDataStore.endMatch()
                    scope.launch {
                        try {
                            PhoneMessenger.sendEndGame(context, gameId, endedAt)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to send end game to phone", e)
                        }
                    }
                },
            )
        }
    }
}

private const val TAG = "WatchMain"
