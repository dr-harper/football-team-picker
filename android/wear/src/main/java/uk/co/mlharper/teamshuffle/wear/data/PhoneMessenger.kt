package uk.co.mlharper.teamshuffle.wear.data

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.tasks.await

/**
 * Sends messages to the phone via Wearable MessageClient.
 * All Firestore writes go through the phone since it's already authenticated.
 */
object PhoneMessenger {

    private const val TAG = "PhoneMessenger"

    suspend fun sendScoreUpdate(context: Context, gameId: String, team1: Int, team2: Int) {
        sendMessage(context, "/game/score", "$gameId|$team1|$team2")
    }

    suspend fun sendGoalScored(context: Context, gameId: String, team: Int, scorerName: String, elapsedSec: Int) {
        sendMessage(context, "/game/goal", "$gameId|$team|$scorerName|$elapsedSec")
    }

    suspend fun sendMatchStarted(context: Context, gameId: String, startedAt: Long) {
        sendMessage(context, "/game/start", "$gameId|$startedAt")
    }

    suspend fun sendMatchPaused(context: Context, gameId: String, pausedAt: Long) {
        sendMessage(context, "/game/pause", "$gameId|$pausedAt")
    }

    suspend fun sendMatchResumed(context: Context, gameId: String, totalPausedMs: Long) {
        sendMessage(context, "/game/resume", "$gameId|$totalPausedMs")
    }

    suspend fun sendUndoGoal(context: Context, gameId: String, team: Int, newScore1: Int, newScore2: Int) {
        sendMessage(context, "/game/undo-goal", "$gameId|$team|$newScore1|$newScore2")
    }

    suspend fun sendEndGame(context: Context, gameId: String, endedAt: Long) {
        sendMessage(context, "/game/end", "$gameId|$endedAt")
    }

    private suspend fun sendMessage(context: Context, path: String, data: String) {
        try {
            Log.d(TAG, "Attempting to send $path data=$data")
            val nodes = Wearable.getNodeClient(context).connectedNodes.await()
            Log.d(TAG, "Found ${nodes.size} connected node(s)")
            if (nodes.isEmpty()) {
                Log.w(TAG, "No connected nodes — phone not reachable")
                return
            }
            for (node in nodes) {
                Log.d(TAG, "Sending to node: ${node.id} (${node.displayName})")
                Wearable.getMessageClient(context)
                    .sendMessage(node.id, path, data.toByteArray())
                    .await()
                Log.d(TAG, "Sent $path to ${node.displayName}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send message: $path", e)
        }
    }
}
