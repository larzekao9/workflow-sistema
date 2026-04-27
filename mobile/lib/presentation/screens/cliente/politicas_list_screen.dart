import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/politica.dart';
import '../../providers/providers.dart';
import '../../providers/tramite_providers.dart';

class PoliticasListScreen extends ConsumerStatefulWidget {
  const PoliticasListScreen({super.key});

  @override
  ConsumerState<PoliticasListScreen> createState() =>
      _PoliticasListScreenState();
}

class _PoliticasListScreenState extends ConsumerState<PoliticasListScreen> {
  String? _loadingId;

  Future<void> _iniciarTramite(PoliticaResponse politica) async {
    setState(() => _loadingId = politica.id);
    try {
      final tramite = await ref
          .read(tramiteRepositoryProvider)
          .crear(politica.id);
      ref.invalidate(misTramitesProvider);
      if (mounted) {
        context.go('/cliente/tramites/${tramite.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
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
              final isLoading = _loadingId == p.id;

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
                          onPressed: (_loadingId != null)
                              ? null
                              : () => _iniciarTramite(p),
                          child: isLoading
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                )
                              : const Text('Iniciar'),
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
