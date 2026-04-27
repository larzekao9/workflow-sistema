import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/auth/jwt_storage.dart';
import '../../core/constants.dart';
import 'api_exception.dart';

/// Base HTTP client. All paths are relative to [AppConstants.baseUrl].
/// Every method returns a parsed [Map<String, dynamic>] on success,
/// or throws [ApiException] on any non-2xx response or network failure.
class ApiClient {
  ApiClient({required JwtStorage jwtStorage, http.Client? httpClient})
      : _jwt = jwtStorage,
        _http = httpClient ?? http.Client();

  final JwtStorage _jwt;
  final http.Client _http;

  // ── Headers ─────────────────────────────────────────────────────────────

  Future<Map<String, String>> _headers({bool requiresAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (requiresAuth) {
      final token = await _jwt.getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  // ── Request helpers ──────────────────────────────────────────────────────

  Uri _uri(String path) => Uri.parse('${AppConstants.baseUrl}$path');

  Map<String, dynamic> _parse(http.Response response) {
    final body = response.body;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body.isEmpty) return {};
      try {
        return jsonDecode(body) as Map<String, dynamic>;
      } catch (e) {
        throw ApiException(
          'Respuesta inválida del servidor',
          statusCode: response.statusCode,
        );
      }
    }
    // Non-2xx: try to extract backend message field.
    String errorMessage = 'Error ${response.statusCode}';
    if (body.isNotEmpty) {
      try {
        final json = jsonDecode(body) as Map<String, dynamic>;
        if (json['message'] != null) {
          errorMessage = json['message'].toString();
        } else if (json['error'] != null) {
          errorMessage = json['error'].toString();
        }
      } catch (_) {
        errorMessage = body.length > 200 ? body.substring(0, 200) : body;
      }
    }
    throw ApiException(errorMessage, statusCode: response.statusCode);
  }

  // ── Public methods ───────────────────────────────────────────────────────

  Future<Map<String, dynamic>> get(String path,
      {bool requiresAuth = true}) async {
    try {
      final response = await _http
          .get(
            _uri(path),
            headers: await _headers(requiresAuth: requiresAuth),
          )
          .timeout(AppConstants.requestTimeout);
      return _parse(response);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(_networkErrorMessage(e));
    }
  }

  /// Like [get] but expects the response body to be a JSON array.
  Future<List<dynamic>> getList(String path,
      {bool requiresAuth = true}) async {
    try {
      final response = await _http
          .get(
            _uri(path),
            headers: await _headers(requiresAuth: requiresAuth),
          )
          .timeout(AppConstants.requestTimeout);
      final body = response.body;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (body.isEmpty) return const [];
        try {
          return jsonDecode(body) as List<dynamic>;
        } catch (e) {
          throw ApiException(
            'Respuesta inválida del servidor',
            statusCode: response.statusCode,
          );
        }
      }
      // Reuse non-2xx handling from _parse via a dummy map parse.
      _parse(response);
      return const [];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(_networkErrorMessage(e));
    }
  }

  /// Like [patch] but with an empty body — used for side-effect endpoints.
  Future<void> patchEmpty(String path, {bool requiresAuth = true}) async {
    try {
      final response = await _http
          .patch(
            _uri(path),
            headers: await _headers(requiresAuth: requiresAuth),
            body: '{}',
          )
          .timeout(AppConstants.requestTimeout);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        _parse(response); // will throw ApiException
      }
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(_networkErrorMessage(e));
    }
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool requiresAuth = true,
  }) async {
    try {
      final response = await _http
          .post(
            _uri(path),
            headers: await _headers(requiresAuth: requiresAuth),
            body: jsonEncode(body),
          )
          .timeout(AppConstants.requestTimeout);
      return _parse(response);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(_networkErrorMessage(e));
    }
  }

  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body, {
    bool requiresAuth = true,
  }) async {
    try {
      final response = await _http
          .patch(
            _uri(path),
            headers: await _headers(requiresAuth: requiresAuth),
            body: jsonEncode(body),
          )
          .timeout(AppConstants.requestTimeout);
      return _parse(response);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(_networkErrorMessage(e));
    }
  }

  String _networkErrorMessage(Object e) {
    final msg = e.toString();
    if (msg.contains('SocketException') || msg.contains('Connection refused')) {
      return 'No se pudo conectar al servidor. Verificá tu conexión.';
    }
    if (msg.contains('TimeoutException')) {
      return 'El servidor tardó demasiado en responder.';
    }
    return 'Error de red inesperado.';
  }
}
