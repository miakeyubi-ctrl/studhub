package tn.studhub.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "StudHubMain";
    private Bundle pendingIncoming;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private int deliverAttempts = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingCallWakePlugin.class);
        super.onCreate(savedInstanceState);
        handleIncomingIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingIncoming != null) {
            deliverPendingIncoming();
        }
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("incomingCall", false)) return;
        pendingIncoming = intent.getExtras() != null ? new Bundle(intent.getExtras()) : new Bundle();
        deliverAttempts = 0;
        deliverPendingIncoming();
    }

    private void deliverPendingIncoming() {
        if (pendingIncoming == null) return;
        if (this.bridge == null) {
            scheduleRetry();
            return;
        }
        try {
            int conversationId = pendingIncoming.getInt("conversationId", 0);
            String callerName = escape(pendingIncoming.getString("callerName"));
            boolean acceptCall = pendingIncoming.getBoolean("acceptCall", false);
            boolean declineCall = pendingIncoming.getBoolean("declineCall", false);
            String json = "{"
                + "\"conversationId\":" + conversationId + ","
                + "\"callerName\":\"" + callerName + "\","
                + "\"acceptCall\":" + acceptCall + ","
                + "\"declineCall\":" + declineCall
                + "}";
            this.bridge.triggerJSEvent("studhubIncomingCall", "window", json);
            pendingIncoming = null;
            deliverAttempts = 0;
            Log.i(TAG, "Delivered incoming call event to JS");
        } catch (Exception e) {
            Log.w(TAG, "deliverPendingIncoming failed", e);
            scheduleRetry();
        }
    }

    private void scheduleRetry() {
        if (deliverAttempts >= 20) {
            Log.w(TAG, "Gave up delivering incoming call event");
            pendingIncoming = null;
            return;
        }
        deliverAttempts++;
        mainHandler.postDelayed(this::deliverPendingIncoming, 250);
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
