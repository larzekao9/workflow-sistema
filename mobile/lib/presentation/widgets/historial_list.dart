import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/models/tramite.dart';

class HistorialList extends StatelessWidget {
  const HistorialList({super.key, required this.historial});

  final List<HistorialEntryDTO> historial;

  static final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  // Bolivia Standard Time = UTC-4, no DST
  static DateTime _toBolivia(DateTime dt) =>
      dt.toUtc().subtract(const Duration(hours: 4));

  @override
  Widget build(BuildContext context) {
    if (historial.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Text('Sin historial'),
      );
    }

    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: historial.length,
      separatorBuilder: (_, __) => const SizedBox(height: 4),
      itemBuilder: (context, index) {
        final entry = historial[index];
        return Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (entry.accion != null)
                  Text(
                    entry.accion!,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                if (entry.actividadNombre != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      entry.actividadNombre!,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                if (entry.responsableNombre != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      entry.responsableNombre!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ),
                if (entry.timestamp != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      _dateFormat.format(_toBolivia(entry.timestamp!)),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Colors.grey[500],
                          ),
                    ),
                  ),
                if (entry.observaciones != null &&
                    entry.observaciones!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        entry.observaciones!,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
