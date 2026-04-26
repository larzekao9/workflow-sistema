import '../models/politica.dart';
import '../services/politica_service.dart';

/// Thin wrapper over [PoliticaService].
class PoliticaRepository {
  PoliticaRepository({required PoliticaService politicaService})
      : _service = politicaService;

  final PoliticaService _service;

  Future<List<PoliticaResponse>> getPublicas({int page = 0}) =>
      _service.getPublicas(page: page);
}
