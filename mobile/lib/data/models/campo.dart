class CampoFormulario {
  final String nombre;
  final String? label;
  final String tipo;
  final bool esRequerido;
  final List<String> opciones;

  const CampoFormulario({
    required this.nombre,
    this.label,
    required this.tipo,
    this.esRequerido = false,
    this.opciones = const [],
  });

  /// Falls back to [nombre] when [label] is absent.
  String get displayLabel => (label != null && label!.isNotEmpty) ? label! : nombre;

  factory CampoFormulario.fromJson(Map<String, dynamic> j) {
    final rawOpciones = j['opciones'] as List<dynamic>? ?? const [];
    return CampoFormulario(
      nombre: (j['nombre'] as String?) ?? '',
      label: j['label'] as String?,
      tipo: (j['tipo'] as String?) ?? 'TEXT',
      esRequerido: (j['required'] as bool?) ?? false,
      opciones: rawOpciones.map((e) => e.toString()).toList(),
    );
  }
}

class FormularioActualResponse {
  final String? actividadId;
  final String? actividadNombre;
  final List<CampoFormulario> campos;

  const FormularioActualResponse({
    this.actividadId,
    this.actividadNombre,
    this.campos = const [],
  });

  factory FormularioActualResponse.fromJson(Map<String, dynamic> j) {
    final rawCampos = j['campos'] as List<dynamic>? ?? const [];
    return FormularioActualResponse(
      actividadId: j['actividadId'] as String?,
      actividadNombre: j['actividadNombre'] as String?,
      campos: rawCampos
          .map((e) => CampoFormulario.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
