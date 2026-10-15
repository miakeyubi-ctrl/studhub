export const environment = {
  production: true,
  // Pas encore de domaine : API VPS en HTTP (à remplacer par https://api.studhub.tn plus tard)
  apiUrl: 'http://45.93.136.64:3000/api/v1',
  wsUrl: 'http://45.93.136.64:3000',
  uploadsUrl: 'http://45.93.136.64:3000/uploads',
  /** true uniquement quand google-services.json + compte de service FCM sont en place */
  firebasePushEnabled: false,
};
