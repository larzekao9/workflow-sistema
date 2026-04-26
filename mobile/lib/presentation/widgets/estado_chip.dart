import 'package:flutter/material.dart';

class EstadoChip extends StatelessWidget {
  const EstadoChip({super.key, required this.estado});

  final String estado;

  @override
  Widget build(BuildContext context) {
    final (color, label) = _config(estado);
    return Chip(
      label: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      backgroundColor: color,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  static (Color, String) _config(String estado) {
    switch (estado) {
      case 'INICIADO':
        return (Colors.blue, 'Iniciado');
      case 'EN_PROCESO':
        return (Colors.orange, 'En Proceso');
      case 'COMPLETADO':
        return (Colors.green, 'Completado');
      case 'RECHAZADO':
        return (Colors.red, 'Rechazado');
      case 'CANCELADO':
        return (Colors.red.shade700, 'Cancelado');
      case 'DEVUELTO':
        return (Colors.purple, 'Devuelto');
      case 'ESCALADO':
        return (Colors.indigo, 'Escalado');
      case 'SIN_ASIGNAR':
        return (Colors.grey, 'Sin Asignar');
      case 'EN_APELACION':
        return (Colors.deepOrange, 'En Apelacion');
      default:
        return (Colors.grey, estado);
    }
  }
}
