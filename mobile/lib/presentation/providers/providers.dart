import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/jwt_storage.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/politica_repository.dart';
import '../../data/repositories/tramite_repository.dart';
import '../../data/services/api_client.dart';
import '../../data/services/auth_service.dart';
import '../../data/services/fcm_service.dart';
import '../../data/services/file_service.dart';
import '../../data/services/notificacion_service.dart';
import '../../data/services/politica_service.dart';
import '../../data/services/tramite_service.dart';

// ── Infrastructure ───────────────────────────────────────────────────────────

final jwtStorageProvider = Provider<JwtStorage>((ref) => JwtStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(jwtStorage: ref.watch(jwtStorageProvider));
});

// ── Auth ─────────────────────────────────────────────────────────────────────

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(apiClient: ref.watch(apiClientProvider));
});

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(apiClient: ref.watch(apiClientProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    authService: ref.watch(authServiceProvider),
    jwtStorage: ref.watch(jwtStorageProvider),
    fcmService: ref.watch(fcmServiceProvider),
  );
});

// ── Files ─────────────────────────────────────────────────────────────────────

final fileServiceProvider = Provider<FileService>((ref) {
  return FileService(jwtStorage: ref.watch(jwtStorageProvider));
});

// ── Trámites ─────────────────────────────────────────────────────────────────

final tramiteServiceProvider = Provider<TramiteService>((ref) {
  return TramiteService(apiClient: ref.watch(apiClientProvider));
});

final tramiteRepositoryProvider = Provider<TramiteRepository>((ref) {
  return TramiteRepository(tramiteService: ref.watch(tramiteServiceProvider));
});

// ── Políticas ─────────────────────────────────────────────────────────────────

final politicaServiceProvider = Provider<PoliticaService>((ref) {
  return PoliticaService(apiClient: ref.watch(apiClientProvider));
});

final politicaRepositoryProvider = Provider<PoliticaRepository>((ref) {
  return PoliticaRepository(
      politicaService: ref.watch(politicaServiceProvider));
});

// ── Notificaciones ────────────────────────────────────────────────────────────

final notificacionServiceProvider = Provider<NotificacionService>((ref) {
  return NotificacionService(apiClient: ref.watch(apiClientProvider));
});
