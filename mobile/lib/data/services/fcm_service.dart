import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';

/// Handles FCM token registration and exposes message streams.
///
/// Registration failures are caught and logged — never propagated to the caller
/// so that the login flow is never blocked by FCM errors.
class FcmService {
  FcmService({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Requests push-notification permission, obtains the FCM device token,
  /// and registers it with the backend via `PATCH /users/me/fcm-token`.
  ///
  /// Must be called after a successful login (JWT already stored).
  Future<void> registerToken() async {
    try {
      final messaging = FirebaseMessaging.instance;

      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        debugPrint('[FCM] Permisos denegados por el usuario');
        return;
      }

      final token = await messaging.getToken();
      if (token == null) {
        debugPrint('[FCM] Token FCM es null — verifica google-services.json y APNs');
        return;
      }

      debugPrint('[FCM] Token obtenido: ${token.substring(0, 20)}...');
      await _apiClient.patch('/users/me/fcm-token', {'fcmToken': token});
      debugPrint('[FCM] Token registrado en backend OK');
    } catch (e, st) {
      debugPrint('[FCM] Error registrando token: $e');
      debugPrint('[FCM] StackTrace: $st');
    }
  }

  /// Stream of messages received while the app is in the foreground.
  static Stream<RemoteMessage> get onForegroundMessage =>
      FirebaseMessaging.onMessage;

  /// Stream fired when the user taps a notification with the app in background.
  static Stream<RemoteMessage> get onNotificationTap =>
      FirebaseMessaging.onMessageOpenedApp;

  /// Returns the [RemoteMessage] that launched the app from a terminated state,
  /// or `null` if the app was opened normally.
  static Future<RemoteMessage?> getInitialMessage() =>
      FirebaseMessaging.instance.getInitialMessage();
}
