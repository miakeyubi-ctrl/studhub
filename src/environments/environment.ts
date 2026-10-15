// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  // Origine HTTP du serveur : socket.io gère l'upgrade WS + path `/ws/chat`
  wsUrl: 'http://localhost:3000',
  uploadsUrl: 'http://localhost:3000/uploads',
  /**
   * Passe à true après avoir :
   * 1) Copié google-services.json dans android/app/
   * 2) Retiré le tools:node="remove" de FirebaseInitProvider dans AndroidManifest.xml
   * 3) Mis firebase_messaging_auto_init_enabled à true
   * 4) Configuré FIREBASE_SERVICE_ACCOUNT_* côté backend
   */
  firebasePushEnabled: false,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
