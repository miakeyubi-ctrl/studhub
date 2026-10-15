package tn.studhub.app;

/**
 * Stub — le vrai service FCM est réactivé quand google-services.json + firebase-messaging
 * sont présents. Voir AndroidManifest (service commenté) et IncomingCallWakePlugin.
 *
 * Sans Firebase, les appels en veille profonde ne réveillent pas le téléphone ;
 * IncomingCallWakePlugin reste utilisable si l'app est encore en mémoire.
 */
public final class CallFirebaseMessagingService {
    private CallFirebaseMessagingService() {}
}
