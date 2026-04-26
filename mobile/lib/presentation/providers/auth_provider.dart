import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/user_session.dart';
import '../../data/repositories/auth_repository.dart';
import 'providers.dart';

/// Holds the currently authenticated [UserSession] (or null when logged out).
///
/// [build] tries to restore a previously stored session from secure storage
/// so the user is not asked to log in again after a cold start.
class AuthNotifier extends AsyncNotifier<UserSession?> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<UserSession?> build() async {
    return _repo.getStoredUser();
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repo.login(email, password));
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(null);
  }
}

final authProvider =
    AsyncNotifierProvider<AuthNotifier, UserSession?>(() => AuthNotifier());
