import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../core/auth/jwt_storage.dart';
import '../../core/constants.dart';
import 'api_exception.dart';

class UploadedFile {
  final String fileId;
  final String nombre;
  final String url;

  const UploadedFile({
    required this.fileId,
    required this.nombre,
    required this.url,
  });

  factory UploadedFile.fromJson(Map<String, dynamic> j) => UploadedFile(
        fileId: (j['fileId'] as String?) ?? '',
        nombre: (j['nombre'] as String?) ?? '',
        url: (j['url'] as String?) ?? '',
      );
}

class FileService {
  FileService({required JwtStorage jwtStorage, http.Client? httpClient})
      : _jwt = jwtStorage,
        _http = httpClient ?? http.Client();

  final JwtStorage _jwt;
  final http.Client _http;

  Future<UploadedFile> upload(File file, String filename) async {
    final token = await _jwt.getToken();
    final uri = Uri.parse('${AppConstants.baseUrl}/files/upload');
    final request = http.MultipartRequest('POST', uri)
      ..files.add(
          await http.MultipartFile.fromPath('file', file.path, filename: filename));
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    try {
      final streamed =
          await _http.send(request).timeout(AppConstants.requestTimeout);
      final response = await http.Response.fromStream(streamed);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        return UploadedFile.fromJson(decoded);
      }
      throw ApiException(
        'Error subiendo archivo (${response.statusCode})',
        statusCode: response.statusCode,
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Error de red al subir archivo: ${e.toString()}');
    }
  }
}
