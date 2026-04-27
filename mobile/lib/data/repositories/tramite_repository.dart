import '../models/campo.dart';
import '../models/tramite.dart';
import '../services/tramite_service.dart';

/// Thin wrapper over [TramiteService] that acts as the single source of truth
/// for tramite data. Add caching or offline logic here if needed.
class TramiteRepository {
  TramiteRepository({required TramiteService tramiteService})
      : _service = tramiteService;

  final TramiteService _service;

  Future<List<TramiteResponse>> getMisTramites({
    String? estado,
    int page = 0,
  }) =>
      _service.getMisTramites(estado: estado, page: page);

  Future<List<TramiteResponse>> getBandeja({
    String? estado,
    int page = 0,
  }) =>
      _service.getBandeja(estado: estado, page: page);

  Future<TramiteResponse> getById(String id) => _service.getById(id);

  Future<FormularioActualResponse> getFormulario(String tramiteId) =>
      _service.getFormularioActual(tramiteId);

  Future<TramiteResponse> crear(String politicaId) =>
      _service.crear(politicaId);

  Future<TramiteResponse> avanzar(
    String id, {
    required String accion,
    String? observaciones,
    Map<String, dynamic>? datos,
  }) =>
      _service.avanzar(id, accion: accion, observaciones: observaciones, datos: datos);

  Future<TramiteResponse> responder(
    String id, {
    Map<String, dynamic>? datos,
    String? observaciones,
  }) =>
      _service.responder(id, datos: datos, observaciones: observaciones);

  Future<TramiteResponse> tomar(String id) => _service.tomar(id);

  Future<TramiteResponse> observar(String id, {required String motivo}) =>
      _service.observar(id, motivo: motivo);

  Future<TramiteResponse> apelar(String id, {required String justificacion}) =>
      _service.apelar(id, justificacion: justificacion);

  Future<TramiteResponse> denegar(String id, {required String motivo}) =>
      _service.denegar(id, motivo: motivo);

  Future<TramiteResponse> resolverApelacion(
    String id, {
    required bool aprobada,
    String? observaciones,
  }) =>
      _service.resolverApelacion(id, aprobada: aprobada, observaciones: observaciones);
}
