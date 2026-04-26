import '../models/user_session.dart';
import 'api_client.dart';
import 'api_exception.dart';

/// Handles raw HTTP calls for authentication.
/// Business orchestration (storage) lives in AuthRepository.
class AuthService {
  AuthService({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  /// Sends credentials to POST /auth/login.
  /// Returns a [UserSession] on 200.
  /// Throws [ApiException] on 401, 400, or network failure.
  Future<UserSession> login(String email, String password) async {
    final response = await _api.post(
      '/auth/login',
      {'email': email, 'password': password},
      requiresAuth: false,
    );
    try {
      return UserSession.fromJson(response);
    } catch (e) {
      throw const ApiException('Respuesta de login inesperada del servidor.');
    }
  }
}
