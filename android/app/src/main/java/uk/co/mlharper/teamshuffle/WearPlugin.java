package uk.co.mlharper.teamshuffle;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.Wearable;

import java.util.ArrayList;

/**
 * Capacitor plugin that sends data to a paired Wear OS watch
 * via the Wearable Data Layer API, and receives messages back
 * from the watch via WatchMessageService.
 */
@CapacitorPlugin(name = "Wear")
public class WearPlugin extends Plugin {

    private static final String TAG = "WearPlugin";

    @Override
    public void load() {
        WatchMessageService.setCallback((path, data) -> {
            Log.d(TAG, "Watch message forwarded: " + path + " data=" + data);
            JSObject eventData = new JSObject();
            eventData.put("path", path);
            eventData.put("data", data);
            notifyListeners("watchMessage", eventData);
        });
    }

    @Override
    protected void handleOnDestroy() {
        WatchMessageService.setCallback(null);
    }

    /**
     * Send auth token to the watch so it can sign into Firebase.
     * Expects: { token: string, displayName: string }
     */
    @PluginMethod
    public void sendAuthToken(PluginCall call) {
        String token = call.getString("token");
        String displayName = call.getString("displayName", "");

        if (token == null || token.isEmpty()) {
            call.reject("Token is required");
            return;
        }

        DataClient dataClient = Wearable.getDataClient(getActivity());
        PutDataMapRequest putReq = PutDataMapRequest.create("/auth/token");
        putReq.getDataMap().putString("token", token);
        putReq.getDataMap().putString("displayName", displayName);
        putReq.getDataMap().putLong("timestamp", System.currentTimeMillis());
        putReq.setUrgent();

        dataClient.putDataItem(putReq.asPutDataRequest())
            .addOnSuccessListener(dataItem -> {
                Log.d(TAG, "Auth token sent to watch");
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "Failed to send auth token", e);
                call.reject("Failed to send auth token: " + e.getMessage());
            });
    }

    /**
     * Send active game data to the watch for scoring.
     */
    @PluginMethod
    public void sendGameData(PluginCall call) {
        String gameId = call.getString("gameId");

        if (gameId == null || gameId.isEmpty()) {
            call.reject("gameId is required");
            return;
        }

        ArrayList<String> t1Players = toArrayList(call.getArray("team1Players"));
        ArrayList<String> t2Players = toArrayList(call.getArray("team2Players"));
        long startedAt = call.getLong("startedAt", 0L);

        Log.d(TAG, "Sending game: " + gameId + " t1=" + t1Players.size() + " t2=" + t2Players.size()
            + " startedAt=" + startedAt + " matchStarted=" + call.getBoolean("matchStarted", false));

        DataClient dataClient = Wearable.getDataClient(getActivity());
        PutDataMapRequest putReq = PutDataMapRequest.create("/game/active");
        putReq.getDataMap().putString("gameId", gameId);
        putReq.getDataMap().putString("title", call.getString("title", ""));
        putReq.getDataMap().putString("team1Name", call.getString("team1Name", "Team 1"));
        putReq.getDataMap().putString("team2Name", call.getString("team2Name", "Team 2"));
        putReq.getDataMap().putString("team1Colour", call.getString("team1Colour", "#22C55E"));
        putReq.getDataMap().putString("team2Colour", call.getString("team2Colour", "#3B82F6"));
        putReq.getDataMap().putStringArrayList("team1Players", t1Players);
        putReq.getDataMap().putStringArrayList("team2Players", t2Players);
        putReq.getDataMap().putInt("score1", call.getInt("score1", 0));
        putReq.getDataMap().putInt("score2", call.getInt("score2", 0));
        putReq.getDataMap().putLong("startedAt", startedAt);
        putReq.getDataMap().putBoolean("matchStarted", call.getBoolean("matchStarted", false));
        putReq.getDataMap().putLong("totalPausedMs", call.getLong("totalPausedMs", 0L));
        putReq.getDataMap().putLong("pausedAt", call.getLong("pausedAt", 0L));
        putReq.getDataMap().putBoolean("matchEnded", call.getBoolean("matchEnded", false));
        putReq.getDataMap().putLong("timestamp", System.currentTimeMillis());
        putReq.setUrgent();

        dataClient.putDataItem(putReq.asPutDataRequest())
            .addOnSuccessListener(dataItem -> {
                Log.d(TAG, "Game data sent to watch: " + gameId);
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "Failed to send game data", e);
                call.reject("Failed to send game data: " + e.getMessage());
            });
    }

    /**
     * Send match state change (pause/resume/end) to the watch.
     */
    @PluginMethod
    public void sendMatchState(PluginCall call) {
        String gameId = call.getString("gameId");
        String state = call.getString("state");

        if (gameId == null || state == null) {
            call.reject("gameId and state are required");
            return;
        }

        DataClient dataClient = Wearable.getDataClient(getActivity());
        PutDataMapRequest putReq = PutDataMapRequest.create("/game/state");
        putReq.getDataMap().putString("gameId", gameId);
        putReq.getDataMap().putString("state", state);
        putReq.getDataMap().putLong("pausedAt", call.getLong("pausedAt", 0L));
        putReq.getDataMap().putLong("totalPausedMs", call.getLong("totalPausedMs", 0L));
        putReq.getDataMap().putLong("endedAt", call.getLong("endedAt", 0L));
        putReq.getDataMap().putInt("score1", call.getInt("score1", -1));
        putReq.getDataMap().putInt("score2", call.getInt("score2", -1));
        putReq.getDataMap().putLong("timestamp", System.currentTimeMillis());
        putReq.setUrgent();

        dataClient.putDataItem(putReq.asPutDataRequest())
            .addOnSuccessListener(dataItem -> {
                Log.d(TAG, "Match state sent to watch: " + state);
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "Failed to send match state", e);
                call.reject("Failed to send match state: " + e.getMessage());
            });
    }

    /**
     * Clear game data on the watch (game ended or navigated away).
     */
    @PluginMethod
    public void clearGameData(PluginCall call) {
        DataClient dataClient = Wearable.getDataClient(getActivity());
        dataClient.deleteDataItems(
            android.net.Uri.parse("wear://*/game/active")
        )
            .addOnSuccessListener(count -> {
                Log.d(TAG, "Cleared game data from watch (" + count + " items)");
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "Failed to clear game data", e);
                call.reject("Failed to clear game data: " + e.getMessage());
            });
    }

    private ArrayList<String> toArrayList(JSArray jsArray) {
        ArrayList<String> list = new ArrayList<>();
        if (jsArray != null) {
            try {
                for (int i = 0; i < jsArray.length(); i++) {
                    list.add(jsArray.getString(i));
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to parse player array", e);
            }
        }
        return list;
    }

    /**
     * Check if a Wear OS watch is connected.
     */
    @PluginMethod
    public void isWatchConnected(PluginCall call) {
        Wearable.getNodeClient(getActivity()).getConnectedNodes()
            .addOnSuccessListener(nodes -> {
                JSObject result = new JSObject();
                result.put("connected", !nodes.isEmpty());
                result.put("nodeCount", nodes.size());
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "Failed to check watch connection", e);
                JSObject result = new JSObject();
                result.put("connected", false);
                result.put("nodeCount", 0);
                call.resolve(result);
            });
    }
}
