import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/politica.dart';
import '../../providers/providers.dart';
import '../../providers/tramite_providers.dart';

class PoliticasListScreen extends ConsumerWidget {
  const PoliticasListScreen({super.key});

  Future<void> _iniciarTramite(
    BuildContext context,
    WidgetRef ref,
    PoliticaResponse politica,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar inicio'),
        content: Text('Iniciar tramite: "${politica.nombre}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    if (!context.mounted) return;

    try {
      final tramite = await ref
          .read(tramiteRepositoryProvider)
          .crear(politica.id);
      ref.invalidate(misTramitesProvider);
      if (context.mounted) {
        context.go('/cliente/tramites/${tramite.id}');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final politicasAsync = ref.watch(politicasPublicasProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo Tramite')),
      body: politicasAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(e.toString()),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.invalidate(politicasPublicasProvider),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
        data: (politicas) {
          if (politicas.isEmpty) {
            return const Center(
              child: Text('No hay politicas disponibles.'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: politicas.length,
            itemBuilder: (context, index) {
              final p = politicas[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.nombre,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      if (p.descripcion != null && p.descripcion!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            p.descripcion!,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: ElevatedButton(
                          onPressed: () =>
                              _iniciarTramite(context, ref, p),
                          child: const Text('Iniciar'),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
