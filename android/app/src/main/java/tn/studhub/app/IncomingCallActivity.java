package tn.studhub.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

/**
 * Activité plein écran affichée par-dessus l'écran de verrouillage pour un appel entrant.
 */
public class IncomingCallActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                    | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }

        setContentView(R.layout.activity_incoming_call);

        String callerName = getIntent().getStringExtra("callerName");
        int conversationId = getIntent().getIntExtra("conversationId", 0);
        TextView nameView = findViewById(R.id.callerName);
        if (nameView != null) {
            nameView.setText(callerName == null || callerName.isEmpty() ? "Contact" : callerName);
        }

        Button accept = findViewById(R.id.btnAccept);
        Button decline = findViewById(R.id.btnDecline);

        if (accept != null) {
            accept.setOnClickListener(v -> openMain(true, false, conversationId, callerName));
        }
        if (decline != null) {
            decline.setOnClickListener(v -> openMain(false, true, conversationId, callerName));
        }
    }

    private void openMain(boolean accept, boolean decline, int conversationId, String callerName) {
        IncomingCallWakePlugin.dismissIncoming(this);
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("incomingCall", true);
        intent.putExtra("acceptCall", accept);
        intent.putExtra("declineCall", decline);
        intent.putExtra("conversationId", conversationId);
        intent.putExtra("callerName", callerName == null ? "" : callerName);
        startActivity(intent);
        finish();
    }
}
