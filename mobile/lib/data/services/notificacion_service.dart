import '../models/notificacion.dart';
import 'api_client.dart';

class NotificacionService {
  NotificacionService({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<List<NotificacionModel>> getMisNotificaciones() async {
    final list = await _api.getList('/notificaciones');
    return list
        .map((e) => NotificacionModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> marcarLeida(String id) async {
    await _api.patchEmpty('/notificaciones/$id/leer');
  }
}
