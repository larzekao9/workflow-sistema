import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../providers/auth_provider.dart';
import '../../providers/tramite_providers.dart';
import '../../widgets/estado_chip.dart';

class ClienteTramitesScreen extends ConsumerWidget {
  const ClienteTramitesScreen({super.key});

  static final _dateFormat = DateFormat('dd/MM/yyyy');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tramitesAsync = ref.watch(misTramitesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Tramites'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesion',
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/cliente/tramites/nuevo'),
        tooltip: 'Nuevo Tramite',
        child: const Icon(Icons.add),
      ),
      body: tramitesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(e.toString()),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () =>
                    ref.read(misTramitesProvider.notifier).refresh(),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
        data: (tramites) {
          if (tramites.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.inbox, size: 64, color: Colors.grey),
                  const SizedBox(height: 12),
                  const Text('No tenes tramites aun.'),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.add),
                    label: const Text('Iniciar nuevo tramite'),
                    onPressed: () => context.go('/cliente/tramites/nuevo'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(misTramitesProvider.notifier).refresh(),
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
                    subtitle: t.creadoEn != null
                        ? Text(_dateFormat.format(t.creadoEn!))
                        : null,
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () =>
                        context.go('/cliente/tramites/${t.id}'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
