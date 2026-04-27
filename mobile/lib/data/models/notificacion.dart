class NotificacionModel {
  final String id;
  final String titulo;
  final String cuerpo;
  final String? tramiteId;
  final String tipo;
  final bool leida;
  final DateTime? creadoEn;

  const NotificacionModel({
    required this.id,
    required this.titulo,
    required this.cuerpo,
    this.tramiteId,
    required this.tipo,
    required this.leida,
    this.creadoEn,
  });

  factory NotificacionModel.fromJson(Map<String, dynamic> j) =>
      NotificacionModel(
        id: j['id'] as String,
        titulo: j['titulo'] as String? ?? '',
        cuerpo: j['cuerpo'] as String? ?? '',
        tramiteId: j['tramiteId'] as String?,
        tipo: j['tipo'] as String? ?? '',
        leida: j['leida'] as bool? ?? false,
        creadoEn: j['creadoEn'] != null
            ? DateTime.tryParse(j['creadoEn'] as String)
            : null,
      );

  NotificacionModel copyWith({bool? leida}) => NotificacionModel(
        id: id,
        titulo: titulo,
        cuerpo: cuerpo,
        tramiteId: tramiteId,
        tipo: tipo,
        leida: leida ?? this.leida,
        creadoEn: creadoEn,
      );
}
