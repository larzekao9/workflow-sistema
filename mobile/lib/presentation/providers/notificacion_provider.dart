import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/notificacion.dart';
import 'providers.dart';

/// Manages the notifications list, supporting refresh and mark-as-read.
class NotificacionesNotifier
    extends AsyncNotifier<List<NotificacionModel>> {
  @override
  Future<List<NotificacionModel>> build() =>
      ref.read(notificacionServiceProvider).getMisNotificaciones();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(notificacionServiceProvider).getMisNotificaciones(),
    );
  }

  /// Marks a single notification as read (optimistic update + backend call).
  Future<void> marcarLeida(String id) async {
    final service = ref.read(notificacionServiceProvider);
    // Optimistic: update local state immediately.
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncData(
        current
            .map((n) => n.id == id ? n.copyWith(leida: true) : n)
            .toList(),
      );
    }
    try {
      await service.marcarLeida(id);
    } catch (_) {
      // On failure, rollback by reloading from server.
      await refresh();
      rethrow;
    }
  }

  /// Marks all unread notifications as read.
  Future<void> marcarTodasLeidas() async {
    final service = ref.read(notificacionServiceProvider);
    final current = state.valueOrNull;
    if (current == null) return;

    final noLeidas = current.where((n) => !n.leida).toList();
    if (noLeidas.isEmpty) return;

    // Optimistic update.
    state = AsyncData(current.map((n) => n.copyWith(leida: true)).toList());

    try {
      await Future.wait(noLeidas.map((n) => service.marcarLeida(n.id)));
    } catch (_) {
      await refresh();
      rethrow;
    }
  }
}

final notificacionesProvider =
    AsyncNotifierProvider<NotificacionesNotifier, List<NotificacionModel>>(
  NotificacionesNotifier.new,
);

/// Derived provider: count of unread notifications. Auto-updates when
/// [notificacionesProvider] changes. Used for the AppBar badge.
final unreadCountProvider = Provider.autoDispose<int>((ref) {
  final notifAsync = ref.watch(notificacionesProvider);
  return notifAsync.valueOrNull?.where((n) => !n.leida).length ?? 0;
});
