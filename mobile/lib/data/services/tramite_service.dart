import '../models/campo.dart';
import '../models/tramite.dart';
import 'api_client.dart';

class TramiteService {
  TramiteService({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<TramiteResponse>> getMisTramites({
    String? estado,
    int page = 0,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'size': '20',
      if (estado != null) 'estado': estado,
    };
    final query = Uri(queryParameters: params).query;
    final path = '/tramites/mis-tramites?$query';
    final resp = await _api.get(path);
    return _pageContent(resp);
  }

  Future<List<TramiteResponse>> getBandeja({
    String? estado,
    int page = 0,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'size': '20',
      if (estado != null) 'estado': estado,
    };
    final query = Uri(queryParameters: params).query;
    final path = '/tramites?$query';
    final resp = await _api.get(path);
    return _pageContent(resp);
  }

  Future<TramiteResponse> getById(String id) async {
    final resp = await _api.get('/tramites/$id');
    return TramiteResponse.fromJson(resp);
  }

  Future<FormularioActualResponse> getFormularioActual(String tramiteId) async {
    final resp = await _api.get('/tramites/$tramiteId/formulario-actual');
    return FormularioActualResponse.fromJson(resp);
  }

  Future<TramiteResponse> crear(String politicaId) async {
    final resp = await _api.post('/tramites', {'politicaId': politicaId});
    return TramiteResponse.fromJson(resp);
  }

  Future<TramiteResponse> avanzar(
    String id, {
    required String accion,
    String? observaciones,
    Map<String, dynamic>? datos,
  }) async {
    final body = <String, dynamic>{
      'accion': accion,
      if (observaciones != null) 'observaciones': observaciones,
      'datos': datos ?? {},
    };
    final resp = await _api.post('/tramites/$id/avanzar', body);
    return TramiteResponse.fromJson(resp);
  }

  Future<TramiteResponse> responder(
    String id, {
    Map<String, dynamic>? datos,
    String? observaciones,
  }) async {
    final body = <String, dynamic>{
      'accion': 'RESPONDER',
      if (observaciones != null) 'observaciones': observaciones,
      'datos': datos ?? {},
    };
    final resp = await _api.post('/tramites/$id/responder', body);
    return TramiteResponse.fromJson(resp);
  }

  Future<TramiteResponse> tomar(String id) async {
    final resp = await _api.post('/tramites/$id/tomar', {});
    return TramiteResponse.fromJson(resp);
  }

  Future<TramiteResponse> observar(
    String id, {
    required String motivo,
  }) async {
    final resp = await _api.post('/tramites/$id/observar', {'motivo': motivo});
    return TramiteResponse.fromJson(resp);
  }

  Future<TramiteResponse> apelar(
    String id, {
    required String justificacion,
  }) async {
    final resp =
        await _api.post('/tramites/$id/apelar', {'justificacion': justificacion});
    return TramiteResponse.fromJson(resp);
  }

  Future<TramiteResponse> denegar(
    String id, {
    required String motivo,
  }) async {
    final resp = await _api.post('/tramites/$id/denegar', {'motivo': motivo});
    return TramiteResponse.fromJson(resp);
  }

  Future<TramiteResponse> resolverApelacion(
    String id, {
    required bool aprobada,
    String? observaciones,
  }) async {
    final body = <String, dynamic>{
      'aprobada': aprobada,
      if (observaciones != null && observaciones.isNotEmpty)
        'observaciones': observaciones,
    };
    final resp = await _api.post('/tramites/$id/resolver-apelacion', body);
    return TramiteResponse.fromJson(resp);
  }

  List<TramiteResponse> _pageContent(Map<String, dynamic> resp) {
    final content = resp['content'] as List<dynamic>? ?? const [];
    return content
        .map((e) => TramiteResponse.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
