import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/auth/jwt_storage.dart';
import '../../core/constants.dart';
import '../models/chat_message.dart';
import 'api_exception.dart';

class ChatService {
  ChatService({required JwtStorage jwtStorage, http.Client? httpClient})
      : _jwt = jwtStorage,
        _http = httpClient ?? http.Client();

  final JwtStorage _jwt;
  final http.Client _http;

  static const String _aiBaseUrl = String.fromEnvironment(
    'AI_BASE_URL',
    defaultValue: 'http://10.0.2.2:8001',
  );

  Future<ChatMessage> sendMessage(List<ChatMessage> history) async {
    final token = await _jwt.getToken();

    final body = jsonEncode({
      'messages': history
          .map((m) => {'role': m.role, 'content': m.content})
          .toList(),
      if (token != null) 'token': token,
    });

    try {
      final response = await _http
          .post(
            Uri.parse('$_aiBaseUrl/ai/chat'),
            headers: const {'Content-Type': 'application/json'},
            body: body,
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final reply = json['reply'] as String? ?? '';
        final rawFields = json['fields'] as List<dynamic>?;
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: 'assistant',
          content: reply,
          timestamp: DateTime.now(),
          action: json['action'] as String?,
          tramiteId: json['tramiteId'] as String?,
          fields: rawFields
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList(),
        );
      }

      String errorMessage = 'Error ${response.statusCode}';
      if (response.body.isNotEmpty) {
        try {
          final json = jsonDecode(response.body) as Map<String, dynamic>;
          if (json['message'] != null) {
            errorMessage = json['message'].toString();
          } else if (json['detail'] != null) {
            errorMessage = json['detail'].toString();
          }
        } catch (_) {
          errorMessage = response.body.length > 200
              ? response.body.substring(0, 200)
              : response.body;
        }
      }
      throw ApiException(errorMessage, statusCode: response.statusCode);
    } on ApiException {
      rethrow;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('SocketException') ||
          msg.contains('Connection refused')) {
        throw ApiException(
            'No se pudo conectar al asistente. Verificá tu conexion.');
      }
      if (msg.contains('TimeoutException')) {
        throw ApiException('El asistente tardo demasiado en responder.');
      }
      throw ApiException('Error de red inesperado.');
    }
  }

  Future<ChatMessage> submitForm({
    required String tramiteId,
    required Map<String, dynamic> campos,
    required String accion,
  }) async {
    final token = await _jwt.getToken();

    final body = jsonEncode({
      'tramiteId': tramiteId,
      'camposFormulario': campos,
      'accion': accion,
      if (token != null) 'token': token,
    });

    try {
      final response = await _http
          .post(
            Uri.parse('$_aiBaseUrl/ai/chat/submit-form'),
            headers: const {'Content-Type': 'application/json'},
            body: body,
          )
          .timeout(AppConstants.requestTimeout);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final reply = json['reply'] as String? ?? '';
        return ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: 'assistant',
          content: reply,
          timestamp: DateTime.now(),
        );
      }

      String errorMessage = 'Error ${response.statusCode}';
      if (response.body.isNotEmpty) {
        try {
          final json = jsonDecode(response.body) as Map<String, dynamic>;
          if (json['message'] != null) {
            errorMessage = json['message'].toString();
          } else if (json['detail'] != null) {
            errorMessage = json['detail'].toString();
          }
        } catch (_) {
          errorMessage = response.body.length > 200
              ? response.body.substring(0, 200)
              : response.body;
        }
      }
      throw ApiException(errorMessage, statusCode: response.statusCode);
    } on ApiException {
      rethrow;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('SocketException') ||
          msg.contains('Connection refused')) {
        throw ApiException(
            'No se pudo conectar al asistente. Verificá tu conexion.');
      }
      if (msg.contains('TimeoutException')) {
        throw ApiException('El asistente tardo demasiado en responder.');
      }
      throw ApiException('Error de red inesperado.');
    }
  }
}
