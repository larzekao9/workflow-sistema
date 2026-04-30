class AppConstants {
  AppConstants._();

  // Android emulator → 10.0.2.2 (host machine localhost)
  // Dispositivo físico → IP local de la máquina, ej: http://192.168.1.x:8080
  // iOS simulator / web → localhost
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://44.192.45.40:8080',
  );

  static const String tokenKey = 'access_token';
  static const String userKey = 'current_user';
  static const Duration requestTimeout = Duration(seconds: 30);
}
