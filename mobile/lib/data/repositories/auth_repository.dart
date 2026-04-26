import '../../core/auth/jwt_storage.dart';
import '../models/user_session.dart';
import '../services/auth_service.dart';
import '../services/fcm_service.dart';

/// Orchestrates login persistence: calls the service then stores JWT + user.
/// After a successful login, fires FCM token registration in the background.
class AuthRepository {
  AuthRepository({
    required AuthService authService,
    required JwtStorage jwtStorage,
    required FcmService fcmService,
  })  : _authService = authService,
        _jwtStorage = jwtStorage,
        _fcmService = fcmService;

  final AuthService _authService;
  final JwtStorage _jwtStorage;
  final FcmService _fcmService;

  Future<UserSession> login(String email, String password) async {
    final user = await _authService.login(email, password);
    await _jwtStorage.saveToken(user.token);
    await _jwtStorage.saveUser(user);
    // Fire-and-forget: register FCM token without blocking login.
    _fcmService.registerToken();
    return user;
  }

  Future<void> logout() async => _jwtStorage.clear();

  Future<UserSession?> getStoredUser() async => _jwtStorage.getUser();
}
