import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../data/models/tramite.dart';
import '../../providers/auth_provider.dart';
import '../../providers/providers.dart';
import '../../providers/tramite_providers.dart';
import '../../widgets/dynamic_form_widget.dart';
import '../../widgets/estado_chip.dart';
import '../../widgets/historial_list.dart';

class TramiteDetalleScreen extends ConsumerWidget {
  const TramiteDetalleScreen({super.key, required this.tramiteId});

  final String tramiteId;

  static final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tramiteAsync = ref.watch(tramiteDetailProvider(tramiteId));
    final user = ref.watch(authProvider).valueOrNull;
    final rol = user?.rolNombre ?? '';
    final userId = user?.id ?? '';

    return Scaffold(
      appBar: AppBar(
        title: tramiteAsync.whenOrNull(
              data: (t) => Text(t.politicaNombre ?? 'Detalle'),
            ) ??
            const Text('Detalle'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesion',
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: tramiteAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(e.toString()),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () =>
                    ref.invalidate(tramiteDetailProvider(tramiteId)),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
        data: (tramite) => _TramiteDetalleBody(
          tramite: tramite,
          rol: rol,
          userId: userId,
          dateFormat: _dateFormat,
        ),
      ),
    );
  }
}

class _TramiteDetalleBody extends ConsumerStatefulWidget {
  const _TramiteDetalleBody({
    required this.tramite,
    required this.rol,
    required this.userId,
    required this.dateFormat,
  });

  final TramiteResponse tramite;
  final String rol;
  final String userId;
  final DateFormat dateFormat;

  @override
  ConsumerState<_TramiteDetalleBody> createState() =>
      _TramiteDetalleBodyState();
}

class _TramiteDetalleBodyState extends ConsumerState<_TramiteDetalleBody> {
  bool _accionLoading = false;

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _tomar() async {
    setState(() => _accionLoading = true);
    try {
      await ref
          .read(tramiteRepositoryProvider)
          .tomar(widget.tramite.id);
      ref.invalidate(tramiteDetailProvider(widget.tramite.id));
      ref.invalidate(bandejaProvider);
    } catch (e) {
      _showSnackBar(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<void> _avanzar(
      String accion, String? observaciones, Map<String, dynamic> datos) async {
    setState(() => _accionLoading = true);
    try {
      await ref.read(tramiteRepositoryProvider).avanzar(
            widget.tramite.id,
            accion: accion,
            observaciones: observaciones,
            datos: datos,
          );
      ref.invalidate(tramiteDetailProvider(widget.tramite.id));
      ref.invalidate(bandejaProvider);
    } catch (e) {
      _showSnackBar(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<void> _observar(String motivo) async {
    setState(() => _accionLoading = true);
    try {
      await ref
          .read(tramiteRepositoryProvider)
          .observar(widget.tramite.id, motivo: motivo);
      ref.invalidate(tramiteDetailProvider(widget.tramite.id));
      ref.invalidate(bandejaProvider);
    } catch (e) {
      _showSnackBar(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<void> _responder(Map<String, dynamic> datos) async {
    await ref.read(tramiteRepositoryProvider).responder(
          widget.tramite.id,
          datos: datos,
        );
    ref.invalidate(tramiteDetailProvider(widget.tramite.id));
    ref.invalidate(misTramitesProvider);
  }

  Future<void> _apelar(String justificacion) async {
    setState(() => _accionLoading = true);
    try {
      await ref
          .read(tramiteRepositoryProvider)
          .apelar(widget.tramite.id, justificacion: justificacion);
      ref.invalidate(tramiteDetailProvider(widget.tramite.id));
      ref.invalidate(misTramitesProvider);
    } catch (e) {
      _showSnackBar(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<String?> _showObservacionDialog(String title) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Observaciones (opcional)'),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () =>
                Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
  }

  Future<String?> _showMotivoDialog(String title) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Motivo (requerido)'),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final text = controller.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx, text);
            },
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tramite = widget.tramite;
    final esFuncionarioAsignado = widget.rol == 'FUNCIONARIO' &&
        tramite.asignadoAId != null &&
        tramite.asignadoAId == widget.userId;
    final esFuncionarioSinAsignar =
        widget.rol == 'FUNCIONARIO' && tramite.asignadoAId == null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Estado chip
          Row(
            children: [
              EstadoChip(estado: tramite.estado),
              const SizedBox(width: 8),
              if (tramite.creadoEn != null)
                Text(
                  widget.dateFormat.format(tramite.creadoEn!),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Info política
          if (tramite.politicaNombre != null)
            _InfoCard(
              title: 'Tramite',
              rows: [
                if (tramite.politicaNombre != null)
                  _InfoRow('Politica', tramite.politicaNombre!),
                if (tramite.clienteNombre != null)
                  _InfoRow('Cliente', tramite.clienteNombre!),
                if (tramite.asignadoANombre != null)
                  _InfoRow('Asignado a', tramite.asignadoANombre!),
              ],
            ),
          const SizedBox(height: 12),

          // Etapa actual
          if (tramite.etapaActual != null)
            _InfoCard(
              title: 'Etapa Actual',
              rows: [
                if (tramite.etapaActual!.nombre != null)
                  _InfoRow('Nombre', tramite.etapaActual!.nombre!),
                if (tramite.etapaActual!.area != null)
                  _InfoRow('Area', tramite.etapaActual!.area!),
                if (tramite.etapaActual!.responsableRolNombre != null)
                  _InfoRow(
                      'Responsable', tramite.etapaActual!.responsableRolNombre!),
              ],
            ),
          const SizedBox(height: 12),

          // Apelacion banner (CLIENTE)
          if (widget.rol == 'CLIENTE' &&
              tramite.apelacion != null &&
              tramite.apelacion!.pendiente)
            _ApelarBanner(
              loading: _accionLoading,
              onApelar: () async {
                final justificacion =
                    await _showMotivoDialog('Justificacion de apelacion');
                if (justificacion != null && justificacion.isNotEmpty) {
                  await _apelar(justificacion);
                }
              },
            ),

          // Acciones FUNCIONARIO — sin asignar
          if (esFuncionarioSinAsignar)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: ElevatedButton.icon(
                icon: _accionLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.assignment_ind),
                label: const Text('Tomar tarea'),
                onPressed: _accionLoading ? null : _tomar,
              ),
            ),

          // Acciones FUNCIONARIO asignado — formulario + botones
          if (esFuncionarioAsignado) ...[
            const Text(
              'Acciones',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _FuncionarioAcciones(
              tramiteId: tramite.id,
              accionLoading: _accionLoading,
              onAvanzar: (accion, datos) async {
                final obs = await _showObservacionDialog('Accion: $accion');
                if (obs != null) {
                  await _avanzar(
                      accion, obs.isEmpty ? null : obs, datos);
                }
              },
              onObservar: () async {
                final motivo = await _showMotivoDialog('Motivo de observacion');
                if (motivo != null && motivo.isNotEmpty) {
                  await _observar(motivo);
                }
              },
            ),
          ],

          // CLIENTE corregir DEVUELTO
          if (widget.rol == 'CLIENTE' && tramite.estado == 'DEVUELTO') ...[
            const Text(
              'Corregir y reenviar',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _ClienteResponderSection(
              tramiteId: tramite.id,
              onResponder: _responder,
            ),
          ],

          const SizedBox(height: 16),

          // Historial
          ExpansionTile(
            title: Text('Historial (${tramite.historial.length})'),
            children: [
              HistorialList(historial: tramite.historial),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _InfoRow {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.rows});
  final String title;
  final List<_InfoRow> rows;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const Divider(),
            ...rows.map(
              (r) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    SizedBox(
                      width: 110,
                      child: Text(r.label,
                          style: TextStyle(color: Colors.grey[600])),
                    ),
                    Expanded(child: Text(r.value)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ApelarBanner extends StatelessWidget {
  const _ApelarBanner({required this.onApelar, required this.loading});
  final VoidCallback onApelar;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber[50],
        border: Border.all(color: Colors.amber),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.gavel, color: Colors.amber),
          const SizedBox(width: 8),
          const Expanded(child: Text('Podes apelar esta decision.')),
          ElevatedButton(
            onPressed: loading ? null : onApelar,
            child: const Text('Apelar'),
          ),
        ],
      ),
    );
  }
}

class _FuncionarioAcciones extends ConsumerWidget {
  const _FuncionarioAcciones({
    required this.tramiteId,
    required this.accionLoading,
    required this.onAvanzar,
    required this.onObservar,
  });

  final String tramiteId;
  final bool accionLoading;
  final Future<void> Function(String accion, Map<String, dynamic> datos) onAvanzar;
  final Future<void> Function() onObservar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formularioAsync = ref.watch(formularioProvider(tramiteId));

    return formularioAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Text('Error cargando formulario: $e'),
      data: (formulario) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (formulario.campos.isNotEmpty) ...[
            DynamicFormWidget(
              campos: formulario.campos,
              submitLabel: 'Aprobar',
              isExternalLoading: accionLoading,
              onSubmit: (datos) => onAvanzar('APROBAR', datos),
            ),
            const SizedBox(height: 8),
          ] else ...[
            const Text('Sin campos en esta etapa.'),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: accionLoading
                  ? null
                  : () => onAvanzar('APROBAR', {}),
              child: const Text('Aprobar'),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed:
                      accionLoading ? null : () => onAvanzar('DEVOLVER', {}),
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.purple),
                  child: const Text('Devolver'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed:
                      accionLoading ? null : () => onAvanzar('RECHAZAR', {}),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  child: const Text('Rechazar'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: accionLoading ? null : onObservar,
            style: OutlinedButton.styleFrom(foregroundColor: Colors.orange),
            child: const Text('Observar'),
          ),
        ],
      ),
    );
  }
}

class _ClienteResponderSection extends ConsumerWidget {
  const _ClienteResponderSection({
    required this.tramiteId,
    required this.onResponder,
  });

  final String tramiteId;
  final Future<void> Function(Map<String, dynamic> datos) onResponder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formularioAsync = ref.watch(formularioProvider(tramiteId));

    return formularioAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Text('Error cargando formulario: $e'),
      data: (formulario) => DynamicFormWidget(
        campos: formulario.campos,
        submitLabel: 'Enviar correccion',
        onSubmit: onResponder,
      ),
    );
  }
}
