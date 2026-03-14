package uk.co.mlharper.teamshuffle.wear.data

import android.util.Log
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Listens for auth token sent from the phone app via the Wearable Data Layer.
 * When received, signs into Firebase using a custom token.
 */
class AuthListenerService : WearableListenerService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED && event.dataItem.uri.path == "/auth/token") {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                val customToken = dataMap.getString("token") ?: continue
                val displayName = dataMap.getString("displayName") ?: ""

                Log.d(TAG, "Received auth token from phone for: $displayName")

                scope.launch {
                    try {
                        FirebaseAuth.getInstance()
                            .signInWithCustomToken(customToken)
                            .await()
                        Log.d(TAG, "Signed in to Firebase on watch")

                        // Store display name for UI
                        WatchDataStore.displayName = displayName
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to sign in with custom token", e)
                    }
                }
            }
        }
    }

    companion object {
        private const val TAG = "AuthListenerService"
    }
}
