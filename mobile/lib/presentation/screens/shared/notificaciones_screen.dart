import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../data/models/notificacion.dart';
import '../../providers/notificacion_provider.dart';

class NotificacionesScreen extends ConsumerWidget {
  const NotificacionesScreen({super.key});

  static final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');

  // Bolivia is UTC-4 (no DST).
  static DateTime _toBolivia(DateTime dt) =>
      dt.toUtc().subtract(const Duration(hours: 4));

  static IconData _iconForTipo(String tipo) {
    switch (tipo) {
      case 'TRAMITE_AVANZADO':
        return Icons.check_circle_outline;
      case 'TRAMITE_RECHAZADO':
        return Icons.cancel_outlined;
      case 'TAREA_ASIGNADA':
        return Icons.inbox;
      case 'CLIENTE_RESPONDIO':
        return Icons.reply;
      case 'APELACION_RESUELTA':
        return Icons.gavel;
      case 'TRAMITE_OBSERVADO':
        return Icons.visibility_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  static Color _colorForTipo(String tipo) {
    switch (tipo) {
      case 'TRAMITE_AVANZADO':
        return Colors.green;
      case 'TRAMITE_RECHAZADO':
        return Colors.red;
      case 'TAREA_ASIGNADA':
        return Colors.indigo;
      case 'CLIENTE_RESPONDIO':
        return Colors.teal;
      case 'APELACION_RESUELTA':
        return Colors.purple;
      case 'TRAMITE_OBSERVADO':
        return Colors.orange;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifAsync = ref.watch(notificacionesProvider);
    final notifier = ref.read(notificacionesProvider.notifier);

    final hasUnread = notifAsync.valueOrNull?.any((n) => !n.leida) ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          if (hasUnread)
            TextButton.icon(
              icon: const Icon(Icons.done_all),
              label: const Text('Marcar todas leidas'),
              onPressed: () async {
                try {
                  await notifier.marcarTodasLeidas();
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString())),
                    );
                  }
                }
              },
            ),
        ],
      ),
      body: notifAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(e.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
                onPressed: () => notifier.refresh(),
              ),
            ],
          ),
        ),
        data: (notificaciones) {
          if (notificaciones.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined,
                      size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No tenes notificaciones aun.',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: notifier.refresh,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: notificaciones.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, indent: 72),
              itemBuilder: (context, index) {
                final n = notificaciones[index];
                return _NotificacionTile(
                  notificacion: n,
                  dateFormat: _dateFormat,
                  toBolivia: _toBolivia,
                  iconForTipo: _iconForTipo,
                  colorForTipo: _colorForTipo,
                  onTap: () async {
                    if (!n.leida) {
                      try {
                        await notifier.marcarLeida(n.id);
                      } catch (_) {
                        // Error already triggers refresh; UI stays consistent.
                      }
                    }
                    if (n.tramiteId != null && context.mounted) {
                      context.push('/tramites/${n.tramiteId}');
                    }
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _NotificacionTile extends StatelessWidget {
  const _NotificacionTile({
    required this.notificacion,
    required this.dateFormat,
    required this.toBolivia,
    required this.iconForTipo,
    required this.colorForTipo,
    required this.onTap,
  });

  final NotificacionModel notificacion;
  final DateFormat dateFormat;
  final DateTime Function(DateTime) toBolivia;
  final IconData Function(String) iconForTipo;
  final Color Function(String) colorForTipo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final n = notificacion;
    final unread = !n.leida;
    final color = colorForTipo(n.tipo);

    return Material(
      color: unread
          ? Theme.of(context)
              .colorScheme
              .primaryContainer
              .withValues(alpha: 0.25)
          : null,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Leading icon
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(iconForTipo(n.tipo), color: color, size: 22),
              ),
              const SizedBox(width: 14),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      n.titulo,
                      style: TextStyle(
                        fontWeight:
                            unread ? FontWeight.bold : FontWeight.normal,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      n.cuerpo,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                    if (n.creadoEn != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        dateFormat.format(toBolivia(n.creadoEn!)),
                        style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              // Unread dot
              if (unread)
                Padding(
                  padding: const EdgeInsets.only(left: 8, top: 4),
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
