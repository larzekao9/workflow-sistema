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

// Bolivia Standard Time = UTC-4, no DST.
DateTime _toBolivia(DateTime dt) =>
    dt.toUtc().subtract(const Duration(hours: 4));

final _fmt = DateFormat('dd/MM/yyyy HH:mm');

String _fmtDt(DateTime? dt) =>
    dt == null ? '—' : _fmt.format(_toBolivia(dt));

// ─────────────────────────────────────────────────────────────────────────────

class TramiteDetalleScreen extends ConsumerWidget {
  const TramiteDetalleScreen({super.key, required this.tramiteId});

  final String tramiteId;

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
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _TramiteDetalleBody extends ConsumerStatefulWidget {
  const _TramiteDetalleBody({
    required this.tramite,
    required this.rol,
    required this.userId,
  });

  final TramiteResponse tramite;
  final String rol;
  final String userId;

  @override
  ConsumerState<_TramiteDetalleBody> createState() =>
      _TramiteDetalleBodyState();
}

class _TramiteDetalleBodyState extends ConsumerState<_TramiteDetalleBody> {
  bool _accionLoading = false;

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  Future<void> _tomar() async {
    setState(() => _accionLoading = true);
    try {
      await ref.read(tramiteRepositoryProvider).tomar(widget.tramite.id);
      _invalidate();
    } catch (e) {
      _snack(e.toString());
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
      _invalidate();
    } catch (e) {
      _snack(e.toString());
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
      _invalidate();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<void> _denegar(String motivo) async {
    setState(() => _accionLoading = true);
    try {
      await ref
          .read(tramiteRepositoryProvider)
          .denegar(widget.tramite.id, motivo: motivo);
      _invalidate();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<void> _responder(Map<String, dynamic> datos) async {
    setState(() => _accionLoading = true);
    try {
      await ref
          .read(tramiteRepositoryProvider)
          .responder(widget.tramite.id, datos: datos);
      _invalidate();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<void> _apelar(String justificacion) async {
    setState(() => _accionLoading = true);
    try {
      await ref
          .read(tramiteRepositoryProvider)
          .apelar(widget.tramite.id, justificacion: justificacion);
      _invalidate();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  Future<void> _resolverApelacion(bool aprobada, String? obs) async {
    setState(() => _accionLoading = true);
    try {
      await ref.read(tramiteRepositoryProvider).resolverApelacion(
            widget.tramite.id,
            aprobada: aprobada,
            observaciones: obs,
          );
      _invalidate();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _accionLoading = false);
    }
  }

  void _invalidate() {
    ref.invalidate(tramiteDetailProvider(widget.tramite.id));
    ref.invalidate(bandejaProvider);
    ref.invalidate(misTramitesProvider);
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────

  Future<String?> _showObsDialog(String title,
      {bool required = false}) async {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          decoration: InputDecoration(
            hintText: required
                ? 'Obligatorio — ingresá el motivo'
                : 'Observaciones (opcional)',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              final text = ctrl.text.trim();
              if (required && text.isEmpty) return;
              Navigator.pop(ctx, text);
            },
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
  }

  // ── Historial helpers ─────────────────────────────────────────────────────

  String? _lastObsForAccion(String accion) {
    final matches = widget.tramite.historial
        .where((h) => h.accion?.toUpperCase() == accion.toUpperCase())
        .toList();
    return matches.isNotEmpty ? matches.last.observaciones : null;
  }

  List<HistorialEntryDTO> get _historialConDatos => widget.tramite.historial
      .where((h) => h.datos.isNotEmpty)
      .toList();

  // ─────────────────────────────────────────────────────────────────────────

  // Replica la lógica puedeAccionar() del frontend Angular:
  // INICIADO | EN_PROCESO | ESCALADO, y para CLIENTE solo si asignadoAId == userId.
  bool _puedeAccionar(TramiteResponse tramite) {
    const activos = {'INICIADO', 'EN_PROCESO', 'ESCALADO'};
    if (!activos.contains(tramite.estado)) return false;
    if (widget.rol == 'CLIENTE') {
      return tramite.asignadoAId == widget.userId;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final tramite = widget.tramite;
    final esCliente = widget.rol == 'CLIENTE';
    final esFuncionario = widget.rol == 'FUNCIONARIO' || widget.rol == 'ADMINISTRADOR';
    final esFuncionarioAsignado = esFuncionario &&
        tramite.asignadoAId != null &&
        tramite.asignadoAId == widget.userId;
    final esFuncionarioSinAsignar =
        esFuncionario && tramite.asignadoAId == null;
    final estadoFinal = {
      'COMPLETADO', 'RECHAZADO', 'CANCELADO'
    }.contains(tramite.estado);
    final clientePuedeAccionar = esCliente && _puedeAccionar(tramite);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Estado + fecha creación ──────────────────────────────────────
          Row(
            children: [
              EstadoChip(estado: tramite.estado),
              const SizedBox(width: 8),
              Text(
                _fmtDt(tramite.creadoEn),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Info card ────────────────────────────────────────────────────
          _InfoCard(
            title: 'Trámite',
            rows: [
              if (tramite.politicaNombre != null)
                _IR('Política', tramite.politicaNombre!),
              if (tramite.politicaVersion != null)
                _IR('Versión', 'v${tramite.politicaVersion}'),
              if (tramite.clienteNombre != null)
                _IR('Cliente', tramite.clienteNombre!),
              if (tramite.asignadoANombre != null)
                _IR('Asignado a', tramite.asignadoANombre!),
              if (tramite.etapaActual?.nombre != null)
                _IR('Etapa actual', tramite.etapaActual!.nombre!),
              if (tramite.etapaActual?.area != null)
                _IR('Área', tramite.etapaActual!.area!),
              if (tramite.fechaVencimientoEtapa != null)
                _IR('Vence etapa', _fmtDt(tramite.fechaVencimientoEtapa),
                    warn: true),
            ],
          ),
          const SizedBox(height: 12),

          // ── Banners CLIENTE ──────────────────────────────────────────────
          if (esCliente) ...[
            // DEVUELTO
            if (tramite.estado == 'DEVUELTO')
              _StatusBanner(
                color: Colors.orange,
                icon: Icons.reply,
                title: 'Tu trámite fue devuelto para correcciones',
                body: _lastObsForAccion('DEVOLVER'),
              ),

            // COMPLETADO
            if (tramite.estado == 'COMPLETADO')
              const _StatusBanner(
                color: Colors.green,
                icon: Icons.check_circle,
                title: 'Tu trámite fue completado correctamente',
              ),

            // RECHAZADO
            if (tramite.estado == 'RECHAZADO')
              _StatusBanner(
                color: Colors.red,
                icon: Icons.cancel,
                title: 'Tu trámite fue rechazado',
                body: _lastObsForAccion('RECHAZAR'),
              ),

            // EN_APELACION — PENDIENTE (puede apelar)
            if (tramite.estado == 'EN_APELACION' &&
                tramite.apelacion?.estado == 'PENDIENTE')
              _StatusBanner(
                color: Colors.amber,
                icon: Icons.gavel,
                title: 'Tu trámite fue observado — podés apelar',
                body: tramite.apelacion?.motivoOriginal,
                trailing: ElevatedButton(
                  onPressed: _accionLoading
                      ? null
                      : () async {
                          final just =
                              await _showObsDialog('Justificación de apelación',
                                  required: true);
                          if (just != null && just.isNotEmpty) {
                            await _apelar(just);
                          }
                        },
                  child: const Text('Apelar'),
                ),
              ),

            // EN_APELACION — EN_REVISION (ya apelado, esperando)
            if (tramite.estado == 'EN_APELACION' &&
                tramite.apelacion?.estado == 'EN_REVISION')
              _StatusBanner(
                color: Colors.indigo,
                icon: Icons.hourglass_top,
                title: 'Tu apelación está siendo revisada',
                body: tramite.apelacion?.justificacionCliente != null
                    ? 'Justificación enviada: ${tramite.apelacion!.justificacionCliente}'
                    : null,
              ),
          ],

          // ── Panel resolver apelación (FUNCIONARIO/ADMIN) ─────────────────
          if (esFuncionario &&
              tramite.apelacion?.estado == 'EN_REVISION') ...[
            _ResolverApelacionPanel(
              apelacion: tramite.apelacion!,
              loading: _accionLoading,
              onResolver: _resolverApelacion,
            ),
            const SizedBox(height: 12),
          ],

          // ── Tomar tarea (FUNCIONARIO sin asignar) ─────────────────────────
          if (esFuncionarioSinAsignar && !estadoFinal)
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

          // ── Acciones FUNCIONARIO asignado ─────────────────────────────────
          if (esFuncionarioAsignado && !estadoFinal) ...[
            const Text(
              'Acciones',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _FuncionarioAcciones(
              tramiteId: tramite.id,
              accionLoading: _accionLoading,
              onAvanzar: (accion, datos) async {
                final requireObs =
                    accion == 'DEVOLVER' || accion == 'RECHAZAR';
                final obs = await _showObsDialog(
                  'Acción: $accion',
                  required: requireObs,
                );
                if (obs != null) {
                  await _avanzar(
                      accion, obs.isEmpty ? null : obs, datos);
                }
              },
              onObservar: () async {
                final motivo = await _showObsDialog(
                    'Motivo de observación',
                    required: true);
                if (motivo != null && motivo.isNotEmpty) {
                  await _observar(motivo);
                }
              },
              onDenegar: () async {
                final motivo = await _showObsDialog(
                    'Motivo de denegación',
                    required: true);
                if (motivo != null && motivo.isNotEmpty) {
                  await _denegar(motivo);
                }
              },
            ),
            const SizedBox(height: 12),
          ],

          // ── CLIENTE puede actuar en etapa actual (puedeAccionar) ─────────
          // Mismo criterio que el frontend: estado activo + asignadoAId == userId
          if (clientePuedeAccionar) ...[
            const Text(
              'Completar formulario',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _ClienteEtapaSection(
              tramiteId: tramite.id,
              accionLoading: _accionLoading,
              onEnviar: (datos) => _avanzar('APROBAR', null, datos),
            ),
            const SizedBox(height: 12),
          ],

          // ── CLIENTE corregir DEVUELTO ──────────────────────────────────────
          if (esCliente && tramite.estado == 'DEVUELTO') ...[
            const Text(
              'Corregir y reenviar',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _ClienteResponderSection(
              tramiteId: tramite.id,
              onResponder: _responder,
            ),
            const SizedBox(height: 12),
          ],

          // ── Datos de etapas anteriores ────────────────────────────────────
          if (_historialConDatos.isNotEmpty) ...[
            _DatosEtapasCard(historial: _historialConDatos),
            const SizedBox(height: 12),
          ],

          // ── Historial ────────────────────────────────────────────────────
          ExpansionTile(
            title: Text('Historial (${tramite.historial.length})'),
            initiallyExpanded: true,
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

class _IR {
  final String label;
  final String value;
  final bool warn;
  const _IR(this.label, this.value, {this.warn = false});
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.rows});
  final String title;
  final List<_IR> rows;

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
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 14)),
            const Divider(),
            ...rows.map(
              (r) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    SizedBox(
                      width: 120,
                      child: Text(r.label,
                          style: TextStyle(color: Colors.grey[600],
                              fontSize: 12)),
                    ),
                    Expanded(
                      child: Text(
                        r.value,
                        style: TextStyle(
                          fontWeight: r.warn ? FontWeight.bold : null,
                          color: r.warn ? Colors.orange[800] : null,
                        ),
                      ),
                    ),
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

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({
    required this.color,
    required this.icon,
    required this.title,
    this.body,
    this.trailing,
  });

  final Color color;
  final IconData icon;
  final String title;
  final String? body;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        border: Border.all(color: color.withAlpha(102)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontWeight: FontWeight.bold, color: color)),
                if (body != null && body!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(body!,
                      style:
                          const TextStyle(fontSize: 13, color: Colors.black87)),
                ],
                if (trailing != null) ...[
                  const SizedBox(height: 8),
                  trailing!,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ResolverApelacionPanel extends StatefulWidget {
  const _ResolverApelacionPanel({
    required this.apelacion,
    required this.loading,
    required this.onResolver,
  });

  final ApelacionDTO apelacion;
  final bool loading;
  final Future<void> Function(bool aprobada, String? obs) onResolver;

  @override
  State<_ResolverApelacionPanel> createState() =>
      _ResolverApelacionPanelState();
}

class _ResolverApelacionPanelState extends State<_ResolverApelacionPanel> {
  final _obsCtrl = TextEditingController();

  @override
  void dispose() {
    _obsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ap = widget.apelacion;
    return Card(
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Colors.blue[700]!, width: 1.5),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.gavel, color: Colors.blue),
                SizedBox(width: 8),
                Text('Apelación pendiente de resolución',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15)),
              ],
            ),
            const SizedBox(height: 8),
            if (ap.motivoOriginal != null)
              Text('Motivo original: ${ap.motivoOriginal}',
                  style: const TextStyle(fontSize: 13)),
            if (ap.justificacionCliente != null) ...[
              const SizedBox(height: 4),
              Text('Justificación del cliente: ${ap.justificacionCliente}',
                  style: const TextStyle(fontSize: 13)),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _obsCtrl,
              decoration: const InputDecoration(
                labelText: 'Observaciones (opcional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.thumb_up, size: 18),
                    label: const Text('Aprobar apelación'),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[700],
                        foregroundColor: Colors.white),
                    onPressed: widget.loading
                        ? null
                        : () => widget.onResolver(
                            true, _obsCtrl.text.trim().isEmpty
                                ? null
                                : _obsCtrl.text.trim()),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.thumb_down, size: 18),
                    label: const Text('Denegar apelación'),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[700],
                        foregroundColor: Colors.white),
                    onPressed: widget.loading
                        ? null
                        : () => widget.onResolver(
                            false, _obsCtrl.text.trim().isEmpty
                                ? null
                                : _obsCtrl.text.trim()),
                  ),
                ),
              ],
            ),
          ],
        ),
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
    required this.onDenegar,
  });

  final String tramiteId;
  final bool accionLoading;
  final Future<void> Function(String accion, Map<String, dynamic> datos)
      onAvanzar;
  final Future<void> Function() onObservar;
  final Future<void> Function() onDenegar;

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
          ] else ...[
            const Text('Sin campos en esta etapa.',
                style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: accionLoading ? null : () => onAvanzar('APROBAR', {}),
              child: const Text('Aprobar'),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: accionLoading
                      ? null
                      : () => onAvanzar('DEVOLVER', {}),
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.purple),
                  child: const Text('Devolver'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: accionLoading
                      ? null
                      : () => onAvanzar('RECHAZAR', {}),
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red),
                  child: const Text('Rechazar'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: accionLoading
                      ? null
                      : () => onAvanzar('ESCALAR', {}),
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.deepPurple),
                  child: const Text('Escalar'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: accionLoading ? null : onObservar,
                  style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange),
                  child: const Text('Observar'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: accionLoading ? null : onDenegar,
            style: OutlinedButton.styleFrom(foregroundColor: Colors.red[900]),
            child: const Text('Denegar (con apelación)'),
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
        submitLabel: 'Enviar corrección',
        onSubmit: onResponder,
      ),
    );
  }
}

class _ClienteEtapaSection extends ConsumerWidget {
  const _ClienteEtapaSection({
    required this.tramiteId,
    required this.accionLoading,
    required this.onEnviar,
  });

  final String tramiteId;
  final bool accionLoading;
  final Future<void> Function(Map<String, dynamic> datos) onEnviar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formularioAsync = ref.watch(formularioProvider(tramiteId));

    return formularioAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Text('Error cargando formulario: $e'),
      data: (formulario) => formulario.campos.isEmpty
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('No hay campos requeridos en esta etapa.',
                    style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: accionLoading ? null : () => onEnviar({}),
                  child: const Text('Enviar'),
                ),
              ],
            )
          : DynamicFormWidget(
              campos: formulario.campos,
              submitLabel: 'Enviar',
              isExternalLoading: accionLoading,
              onSubmit: onEnviar,
            ),
    );
  }
}

class _DatosEtapasCard extends StatelessWidget {
  const _DatosEtapasCard({required this.historial});

  final List<HistorialEntryDTO> historial;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Row(
              children: [
                const Icon(Icons.history_edu, color: Colors.green),
                const SizedBox(width: 8),
                Text(
                  'Datos de etapas anteriores (${historial.length})',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
          ),
          ...historial.asMap().entries.map((entry) {
            final i = entry.key;
            final h = entry.value;
            return ExpansionTile(
              leading: CircleAvatar(
                radius: 12,
                backgroundColor: Colors.indigo,
                child: Text('${i + 1}',
                    style: const TextStyle(
                        color: Colors.white, fontSize: 11)),
              ),
              title: Text(h.actividadNombre ?? 'Etapa',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13)),
              subtitle: h.responsableNombre != null
                  ? Text(
                      '${h.responsableNombre!}  ·  ${_fmtDt(h.timestamp)}',
                      style: const TextStyle(fontSize: 11),
                    )
                  : null,
              children: [
                Padding(
                  padding:
                      const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: h.datos.isEmpty
                      ? const Text(
                          'Sin datos de formulario.',
                          style:
                              TextStyle(color: Colors.grey, fontSize: 12),
                        )
                      : Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: h.datos.entries.map((e) {
                            if (e.key.endsWith('_nombre')) {
                              return const SizedBox.shrink();
                            }
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                    color: Colors.grey[300]!),
                              ),
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    e.key.toUpperCase(),
                                    style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.grey),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    e.value?.toString() ?? '—',
                                    style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }
}
