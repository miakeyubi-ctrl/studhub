package tn.studhub.app;

import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Réveille l'écran et affiche une notification full-screen pour un appel entrant.
 */
@CapacitorPlugin(name = "IncomingCallWake")
public class IncomingCallWakePlugin extends Plugin {
    public static final String CHANNEL_ID = "studhub_calls";
    public static final int NOTIF_ID = 42421;
    private static final String TAG = "IncomingCallWake";

    @Override
    public void load() {
        ensureChannel(getContext());
    }

    @PluginMethod
    public void show(PluginCall call) {
        String callerName = call.getString("callerName", "StudHub");
        Integer conversationId = call.getInt("conversationId", 0);
        showIncoming(getContext(), callerName, conversationId == null ? 0 : conversationId);
        call.resolve();
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        dismissIncoming(getContext());
        call.resolve();
    }

    @PluginMethod
    public void requestFullScreenPermission(PluginCall call) {
        boolean opened = false;
        if (Build.VERSION.SDK_INT >= 34) {
            try {
                NotificationManager nm = getContext().getSystemService(NotificationManager.class);
                boolean allowed = nm == null || nm.canUseFullScreenIntent();
                if (!allowed) {
                    Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                    intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    opened = true;
                }
            } catch (Exception e) {
                Log.w(TAG, "full-screen settings unavailable", e);
            }
        }
        JSObject ret = new JSObject();
        ret.put("ok", true);
        ret.put("openedSettings", opened);
        call.resolve(ret);
    }

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
        if (existing != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Appels StudHub",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Appels entrants — réveille l'écran");
        channel.enableVibration(true);
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        channel.setBypassDnd(true);
        nm.createNotificationChannel(channel);
    }

    public static void showIncoming(Context context, String callerName, int conversationId) {
        ensureChannel(context);
        wakeScreen(context);

        Intent fullIntent = new Intent(context, IncomingCallActivity.class);
        fullIntent.putExtra("callerName", callerName);
        fullIntent.putExtra("conversationId", conversationId);
        fullIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_CLEAR_TOP
            | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent fullScreen = PendingIntent.getActivity(context, conversationId + 100, fullIntent, flags);

        Intent openApp = new Intent(context, MainActivity.class);
        openApp.putExtra("incomingCall", true);
        openApp.putExtra("conversationId", conversationId);
        openApp.putExtra("callerName", callerName);
        openApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(context, conversationId + 200, openApp, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Appel StudHub")
            .setContentText((callerName == null || callerName.isEmpty() ? "Contact" : callerName) + " vous appelle…")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(contentIntent)
            .setFullScreenIntent(fullScreen, true)
            .setTimeoutAfter(45_000);

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIF_ID, builder.build());
        }

        // Tente aussi d'ouvrir l'activité full-screen directement
        try {
            context.startActivity(fullIntent);
        } catch (Exception e) {
            Log.w(TAG, "start IncomingCallActivity failed", e);
        }
    }

    public static void dismissIncoming(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIF_ID);
        }
    }

    private static void wakeScreen(Context context) {
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK
                        | PowerManager.ACQUIRE_CAUSES_WAKEUP
                        | PowerManager.ON_AFTER_RELEASE,
                    "studhub:incoming-call"
                );
                wl.acquire(10_000L);
                wl.release();
            }
            KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // L'activité IncomingCallActivity demande aussi le déverrouillage d'affichage
            }
        } catch (Exception e) {
            Log.w(TAG, "wakeScreen failed", e);
        }
    }
}
