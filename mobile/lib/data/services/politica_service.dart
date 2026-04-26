import '../models/politica.dart';
import 'api_client.dart';

class PoliticaService {
  PoliticaService({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<PoliticaResponse>> getPublicas({int page = 0}) async {
    final params = <String, String>{
      'page': '$page',
      'size': '20',
    };
    final query = Uri(queryParameters: params).query;
    final resp = await _api.get('/policies/publicas?$query');
    final content = resp['content'] as List<dynamic>? ?? const [];
    return content
        .map((e) => PoliticaResponse.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
