package uk.co.mlharper.teamshuffle.wear.data

import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Handles Firestore operations for game scoring from the watch.
 */
object GameRepository {

    private val db = FirebaseFirestore.getInstance()

    /** Update the score for a game in Firestore */
    suspend fun updateScore(gameId: String, team1: Int, team2: Int) {
        try {
            db.collection("games").document(gameId)
                .update(
                    mapOf(
                        "score.team1" to team1,
                        "score.team2" to team2,
                    )
                )
                .await()
            Log.d(TAG, "Score updated: $team1 - $team2")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update score", e)
            throw e
        }
    }

    /** Record a goal scorer in Firestore */
    suspend fun addGoalScorer(gameId: String, team: Int, scorerName: String) {
        try {
            val field = if (team == 1) "goalScorers.team1" else "goalScorers.team2"
            db.collection("games").document(gameId)
                .update(field, FieldValue.arrayUnion(scorerName))
                .await()
            Log.d(TAG, "Goal scorer added: $scorerName (team $team)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to add goal scorer", e)
            throw e
        }
    }

    /** Mark a game as completed */
    suspend fun endGame(gameId: String) {
        try {
            db.collection("games").document(gameId)
                .update("status", "completed")
                .await()
            Log.d(TAG, "Game ended: $gameId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to end game", e)
            throw e
        }
    }

    /** Listen to real-time score changes for a game */
    fun observeScore(gameId: String): Flow<Pair<Int, Int>> = callbackFlow {
        val listener: ListenerRegistration = db.collection("games").document(gameId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e(TAG, "Score listener error", error)
                    return@addSnapshotListener
                }
                val score = snapshot?.get("score") as? Map<*, *> ?: return@addSnapshotListener
                val t1 = (score["team1"] as? Long)?.toInt() ?: 0
                val t2 = (score["team2"] as? Long)?.toInt() ?: 0
                trySend(Pair(t1, t2))
            }

        awaitClose { listener.remove() }
    }

    private const val TAG = "GameRepository"
}
