class PoliticaResponse {
  final String id;
  final String nombre;
  final String? descripcion;
  final String estado;
  final int version;

  const PoliticaResponse({
    required this.id,
    required this.nombre,
    this.descripcion,
    required this.estado,
    required this.version,
  });

  factory PoliticaResponse.fromJson(Map<String, dynamic> j) => PoliticaResponse(
        id: (j['id'] as String?) ?? '',
        nombre: (j['nombre'] as String?) ?? '',
        descripcion: j['descripcion'] as String?,
        estado: (j['estado'] as String?) ?? 'ACTIVA',
        version: (j['version'] as int?) ?? 1,
      );
}
