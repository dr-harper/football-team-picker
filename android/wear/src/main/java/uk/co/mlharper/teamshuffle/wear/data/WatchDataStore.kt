package uk.co.mlharper.teamshuffle.wear.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

data class ActiveGame(
    val gameId: String,
    val title: String,
    val team1Name: String,
    val team2Name: String,
    val team1Colour: String,
    val team2Colour: String,
    val team1Players: List<String>,
    val team2Players: List<String>,
    val score1: Int,
    val score2: Int,
    val startedAt: Long,
    val matchStarted: Boolean = false,
    val paused: Boolean = false,
    val pausedAt: Long = 0L,
    val totalPausedMs: Long = 0L,
    val matchEnded: Boolean = false,
)

/**
 * In-memory store for watch state with SharedPreferences persistence.
 * Shared between Data Layer listener services and the Compose UI.
 * Call init(context) once on app start to enable persistence.
 */
object WatchDataStore {

    private const val TAG = "WatchDataStore"
    private const val PREFS_NAME = "active_game"
    private const val KEY_GAME_JSON = "game_json"

    var displayName: String = ""

    private var prefs: SharedPreferences? = null

    private val _activeGame = MutableStateFlow<ActiveGame?>(null)
    val activeGame: StateFlow<ActiveGame?> = _activeGame.asStateFlow()

    /** Initialise persistence and restore saved game. */
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val saved = loadFromPrefs()
        if (saved != null && _activeGame.value == null) {
            Log.d(TAG, "Restored game from SharedPreferences: ${saved.gameId}")
            _activeGame.value = saved
        }
    }

    fun updateGame(game: ActiveGame) {
        _activeGame.value = game
        persist()
    }

    fun clearGame() {
        _activeGame.value = null
        prefs?.edit()?.remove(KEY_GAME_JSON)?.apply()
    }

    fun startMatch(startedAt: Long = System.currentTimeMillis()) {
        _activeGame.value = _activeGame.value?.copy(
            startedAt = startedAt,
            matchStarted = true,
        )
        persist()
    }

    fun pauseMatch(): Long {
        val now = System.currentTimeMillis()
        _activeGame.value = _activeGame.value?.copy(paused = true, pausedAt = now)
        persist()
        return now
    }

    fun resumeMatch(): Long {
        val game = _activeGame.value ?: return 0L
        val additionalPaused = System.currentTimeMillis() - game.pausedAt
        val newTotal = game.totalPausedMs + additionalPaused
        _activeGame.value = game.copy(paused = false, pausedAt = 0L, totalPausedMs = newTotal)
        persist()
        return newTotal
    }

    fun endMatch() {
        _activeGame.value = _activeGame.value?.copy(matchEnded = true)
        persist()
    }

    fun reopenMatch() {
        _activeGame.value = _activeGame.value?.copy(matchEnded = false)
        persist()
    }

    fun applyPhoneState(state: String, pausedAt: Long, totalPausedMs: Long, score1: Int = -1, score2: Int = -1) {
        val current = _activeGame.value ?: return
        val withScores = if (score1 >= 0 && score2 >= 0) {
            current.copy(score1 = score1, score2 = score2)
        } else {
            current
        }
        _activeGame.value = when (state) {
            "paused" -> withScores.copy(paused = true, pausedAt = pausedAt, totalPausedMs = totalPausedMs)
            "resumed" -> withScores.copy(paused = false, pausedAt = 0L, totalPausedMs = totalPausedMs, matchEnded = false)
            "ended" -> withScores.copy(matchEnded = true)
            "scoreUpdate" -> withScores
            else -> withScores
        }
        persist()
    }

    fun updateScore(score1: Int, score2: Int) {
        _activeGame.value = _activeGame.value?.copy(score1 = score1, score2 = score2)
        persist()
    }

    // --- Persistence helpers ---

    private fun persist() {
        val game = _activeGame.value ?: return
        val p = prefs ?: return
        try {
            val json = JSONObject().apply {
                put("gameId", game.gameId)
                put("title", game.title)
                put("team1Name", game.team1Name)
                put("team2Name", game.team2Name)
                put("team1Colour", game.team1Colour)
                put("team2Colour", game.team2Colour)
                put("team1Players", JSONArray(game.team1Players))
                put("team2Players", JSONArray(game.team2Players))
                put("score1", game.score1)
                put("score2", game.score2)
                put("startedAt", game.startedAt)
                put("matchStarted", game.matchStarted)
                put("paused", game.paused)
                put("pausedAt", game.pausedAt)
                put("totalPausedMs", game.totalPausedMs)
                put("matchEnded", game.matchEnded)
            }
            p.edit().putString(KEY_GAME_JSON, json.toString()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist game", e)
        }
    }

    private fun loadFromPrefs(): ActiveGame? {
        val p = prefs ?: return null
        val jsonStr = p.getString(KEY_GAME_JSON, null) ?: return null
        return try {
            val j = JSONObject(jsonStr)
            ActiveGame(
                gameId = j.getString("gameId"),
                title = j.optString("title", ""),
                team1Name = j.optString("team1Name", "Team 1"),
                team2Name = j.optString("team2Name", "Team 2"),
                team1Colour = j.optString("team1Colour", "#22C55E"),
                team2Colour = j.optString("team2Colour", "#3B82F6"),
                team1Players = j.optJSONArray("team1Players")?.let { arr ->
                    (0 until arr.length()).map { arr.getString(it) }
                } ?: emptyList(),
                team2Players = j.optJSONArray("team2Players")?.let { arr ->
                    (0 until arr.length()).map { arr.getString(it) }
                } ?: emptyList(),
                score1 = j.optInt("score1", 0),
                score2 = j.optInt("score2", 0),
                startedAt = j.optLong("startedAt", 0L),
                matchStarted = j.optBoolean("matchStarted", false),
                paused = j.optBoolean("paused", false),
                pausedAt = j.optLong("pausedAt", 0L),
                totalPausedMs = j.optLong("totalPausedMs", 0L),
                matchEnded = j.optBoolean("matchEnded", false),
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load game from prefs", e)
            null
        }
    }
}
