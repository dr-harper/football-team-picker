package uk.co.mlharper.teamshuffle;

import android.util.Log;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;

/**
 * Receives messages from the watch and forwards them to WearPlugin
 * which emits them as Capacitor events to the JS WebView.
 * The WebView has Firebase auth, so Firestore writes happen there.
 */
public class WatchMessageService extends WearableListenerService {

    private static final String TAG = "WatchMessageService";

    public interface WatchMessageCallback {
        void onWatchMessage(String path, String data);
    }

    private static WatchMessageCallback callback;

    public static void setCallback(WatchMessageCallback cb) {
        callback = cb;
    }

    @Override
    public void onMessageReceived(MessageEvent messageEvent) {
        String path = messageEvent.getPath();
        String data = new String(messageEvent.getData());

        Log.d(TAG, "Received: " + path + " data=" + data);

        if (callback != null) {
            callback.onWatchMessage(path, data);
        } else {
            Log.w(TAG, "No callback registered — message dropped");
        }
    }
}
