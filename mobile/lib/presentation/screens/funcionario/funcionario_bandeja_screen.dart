import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';
import '../../providers/tramite_providers.dart';
import '../../widgets/estado_chip.dart';
import '../../widgets/notification_bell.dart';

class FuncionarioBandejaScreen extends ConsumerWidget {
  const FuncionarioBandejaScreen({super.key});

  static const _filtros = [
    (label: 'Todos', value: null),
    (label: 'Sin Asignar', value: 'SIN_ASIGNAR'),
    (label: 'En Proceso', value: 'EN_PROCESO'),
    (label: 'Devuelto', value: 'DEVUELTO'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tramitesAsync = ref.watch(bandejaProvider);
    final notifier = ref.read(bandejaProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bandeja'),
        actions: [
          const NotificationBell(),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesion',
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros horizontales
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              children: _filtros.map((f) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    label: Text(f.label),
                    onPressed: () => notifier.filtrar(f.value),
                  ),
                );
              }).toList(),
            ),
          ),

          // Lista
          Expanded(
            child: tramitesAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(e.toString()),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => notifier.refresh(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
              data: (tramites) {
                if (tramites.isEmpty) {
                  return const Center(
                      child: Text('No hay tramites en la bandeja.'));
                }

                return RefreshIndicator(
                  onRefresh: () => notifier.refresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: tramites.length,
                    itemBuilder: (context, index) {
                      final t = tramites[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: EstadoChip(estado: t.estado),
                          title: Text(t.politicaNombre ?? 'Tramite'),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (t.clienteNombre != null)
                                Text(t.clienteNombre!),
                              if (t.etapaActual?.nombre != null)
                                Text(
                                  t.etapaActual!.nombre!,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall,
                                ),
                            ],
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          isThreeLine: t.clienteNombre != null &&
                              t.etapaActual?.nombre != null,
                          onTap: () => context.go(
                              '/funcionario/bandeja/tramites/${t.id}'),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
