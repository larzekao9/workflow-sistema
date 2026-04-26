import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/campo.dart';
import '../../data/models/politica.dart';
import '../../data/models/tramite.dart';
import 'providers.dart';

// ── Mis Trámites (Cliente) ────────────────────────────────────────────────────

class MisTramitesNotifier extends AsyncNotifier<List<TramiteResponse>> {
  String? _filtroEstado;

  @override
  Future<List<TramiteResponse>> build() {
    return ref
        .read(tramiteRepositoryProvider)
        .getMisTramites(estado: _filtroEstado);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(tramiteRepositoryProvider)
          .getMisTramites(estado: _filtroEstado),
    );
  }

  Future<void> filtrar(String? estado) async {
    _filtroEstado = estado;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(tramiteRepositoryProvider)
          .getMisTramites(estado: _filtroEstado),
    );
  }
}

final misTramitesProvider =
    AsyncNotifierProvider<MisTramitesNotifier, List<TramiteResponse>>(
        MisTramitesNotifier.new);

// ── Bandeja (Funcionario) ─────────────────────────────────────────────────────

class BandejaNotifier extends AsyncNotifier<List<TramiteResponse>> {
  String? _filtroEstado;

  @override
  Future<List<TramiteResponse>> build() {
    return ref
        .read(tramiteRepositoryProvider)
        .getBandeja(estado: _filtroEstado);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(tramiteRepositoryProvider)
          .getBandeja(estado: _filtroEstado),
    );
  }

  Future<void> filtrar(String? estado) async {
    _filtroEstado = estado;
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(tramiteRepositoryProvider)
          .getBandeja(estado: _filtroEstado),
    );
  }
}

final bandejaProvider =
    AsyncNotifierProvider<BandejaNotifier, List<TramiteResponse>>(
        BandejaNotifier.new);

// ── Detalle (auto-dispose para no cachear indefinidamente) ────────────────────

final tramiteDetailProvider =
    FutureProvider.autoDispose.family<TramiteResponse, String>(
  (ref, id) => ref.read(tramiteRepositoryProvider).getById(id),
);

// ── Formulario actual (auto-dispose, keyed por tramiteId) ─────────────────────

final formularioProvider =
    FutureProvider.autoDispose.family<FormularioActualResponse, String>(
  (ref, id) => ref.read(tramiteRepositoryProvider).getFormulario(id),
);

// ── Políticas públicas ────────────────────────────────────────────────────────

final politicasPublicasProvider =
    FutureProvider.autoDispose<List<PoliticaResponse>>(
  (ref) => ref.read(politicaRepositoryProvider).getPublicas(),
);
