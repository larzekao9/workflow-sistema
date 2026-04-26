import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../data/models/user_session.dart';
import '../constants.dart';

/// Wrapper over flutter_secure_storage.
/// JWT is NEVER stored in SharedPreferences.
class JwtStorage {
  JwtStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock_this_device,
              ),
            );

  final FlutterSecureStorage _storage;

  Future<void> saveToken(String token) async {
    await _storage.write(key: AppConstants.tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return _storage.read(key: AppConstants.tokenKey);
  }

  Future<void> saveUser(UserSession user) async {
    final encoded = jsonEncode(user.toJson());
    await _storage.write(key: AppConstants.userKey, value: encoded);
  }

  Future<UserSession?> getUser() async {
    final raw = await _storage.read(key: AppConstants.userKey);
    if (raw == null) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return UserSession.fromJson(json);
    } catch (_) {
      // Corrupted storage entry — clear and treat as unauthenticated.
      await _storage.delete(key: AppConstants.userKey);
      return null;
    }
  }

  Future<void> clear() async {
    await _storage.deleteAll();
  }
}
