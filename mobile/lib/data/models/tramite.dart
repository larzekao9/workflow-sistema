class FileRef {
  final String? fileId;
  final String? nombre;
  final String? url;

  const FileRef({this.fileId, this.nombre, this.url});

  factory FileRef.fromJson(Map<String, dynamic> j) => FileRef(
        fileId: j['fileId'] as String?,
        nombre: j['nombre'] as String?,
        url: j['url'] as String?,
      );
}

class EtapaActualDTO {
  final String? actividadBpmnId;
  final String? nombre;
  final String? responsableRolNombre;
  final String? formularioId;
  final String? area;

  const EtapaActualDTO({
    this.actividadBpmnId,
    this.nombre,
    this.responsableRolNombre,
    this.formularioId,
    this.area,
  });

  factory EtapaActualDTO.fromJson(Map<String, dynamic> j) => EtapaActualDTO(
        actividadBpmnId: j['actividadBpmnId'] as String?,
        nombre: j['nombre'] as String?,
        responsableRolNombre: j['responsableRolNombre'] as String?,
        formularioId: j['formularioId'] as String?,
        area: j['area'] as String?,
      );
}

class HistorialEntryDTO {
  final String? actividadBpmnId;
  final String? actividadNombre;
  final String? responsableId;
  final String? responsableNombre;
  final String? accion;
  final DateTime? timestamp;
  final String? observaciones;
  final String? responsableCargo;
  final List<FileRef> documentosAdjuntos;
  final Map<String, dynamic> datos;

  const HistorialEntryDTO({
    this.actividadBpmnId,
    this.actividadNombre,
    this.responsableId,
    this.responsableNombre,
    this.accion,
    this.timestamp,
    this.observaciones,
    this.responsableCargo,
    this.documentosAdjuntos = const [],
    this.datos = const {},
  });

  factory HistorialEntryDTO.fromJson(Map<String, dynamic> j) {
    final rawDocs = j['documentosAdjuntos'] as List<dynamic>? ?? [];
    final rawDatos = j['datos'];

    return HistorialEntryDTO(
      actividadBpmnId: j['actividadBpmnId'] as String?,
      actividadNombre: j['actividadNombre'] as String?,
      responsableId: j['responsableId'] as String?,
      responsableNombre: j['responsableNombre'] as String?,
      accion: j['accion'] as String?,
      timestamp: j['timestamp'] != null
          ? DateTime.tryParse(j['timestamp'] as String)
          : null,
      observaciones: j['observaciones'] as String?,
      responsableCargo: j['responsableCargo'] as String?,
      documentosAdjuntos: rawDocs
          .map((e) => FileRef.fromJson(e as Map<String, dynamic>))
          .toList(),
      datos: rawDatos is Map<String, dynamic> ? rawDatos : const {},
    );
  }
}

class ApelacionDTO {
  final bool activa;
  final DateTime? fechaInicio;
  final DateTime? fechaLimite;
  final String? motivoOriginal;
  final List<FileRef> documentosOriginales;
  final List<FileRef> documentosApelatoria;
  final String? justificacionCliente;
  final String? estado;

  const ApelacionDTO({
    this.activa = false,
    this.fechaInicio,
    this.fechaLimite,
    this.motivoOriginal,
    this.documentosOriginales = const [],
    this.documentosApelatoria = const [],
    this.justificacionCliente,
    this.estado,
  });

  /// True when an appeal is active and hasn't been resolved yet.
  bool get pendiente => activa && (estado == null || estado == 'PENDIENTE');

  factory ApelacionDTO.fromJson(Map<String, dynamic> j) {
    final rawOrig = j['documentosOriginales'] as List<dynamic>? ?? [];
    final rawApel = j['documentosApelatoria'] as List<dynamic>? ?? [];

    return ApelacionDTO(
      activa: (j['activa'] as bool?) ?? false,
      fechaInicio: j['fechaInicio'] != null
          ? DateTime.tryParse(j['fechaInicio'] as String)
          : null,
      fechaLimite: j['fechaLimite'] != null
          ? DateTime.tryParse(j['fechaLimite'] as String)
          : null,
      motivoOriginal: j['motivoOriginal'] as String?,
      documentosOriginales: rawOrig
          .map((e) => FileRef.fromJson(e as Map<String, dynamic>))
          .toList(),
      documentosApelatoria: rawApel
          .map((e) => FileRef.fromJson(e as Map<String, dynamic>))
          .toList(),
      justificacionCliente: j['justificacionCliente'] as String?,
      estado: j['estado'] as String?,
    );
  }
}

class TramiteResponse {
  final String id;
  final String? politicaId;
  final String? politicaNombre;
  final int? politicaVersion;
  final String? clienteId;
  final String? clienteNombre;
  final String? asignadoAId;
  final String? asignadoANombre;
  final String estado;
  final EtapaActualDTO? etapaActual;
  final List<HistorialEntryDTO> historial;
  final DateTime? creadoEn;
  final DateTime? actualizadoEn;
  final DateTime? fechaVencimientoEtapa;
  final ApelacionDTO? apelacion;

  const TramiteResponse({
    required this.id,
    this.politicaId,
    this.politicaNombre,
    this.politicaVersion,
    this.clienteId,
    this.clienteNombre,
    this.asignadoAId,
    this.asignadoANombre,
    required this.estado,
    this.etapaActual,
    this.historial = const [],
    this.creadoEn,
    this.actualizadoEn,
    this.fechaVencimientoEtapa,
    this.apelacion,
  });

  factory TramiteResponse.fromJson(Map<String, dynamic> j) {
    final rawHistorial = j['historial'] as List<dynamic>? ?? [];

    EtapaActualDTO? etapa;
    final rawEtapa = j['etapaActual'];
    if (rawEtapa is Map<String, dynamic>) {
      etapa = EtapaActualDTO.fromJson(rawEtapa);
    }

    ApelacionDTO? apelacion;
    final rawApelacion = j['apelacion'];
    if (rawApelacion is Map<String, dynamic>) {
      apelacion = ApelacionDTO.fromJson(rawApelacion);
    }

    return TramiteResponse(
      id: (j['id'] as String?) ?? '',
      politicaId: j['politicaId'] as String?,
      politicaNombre: j['politicaNombre'] as String?,
      politicaVersion: j['politicaVersion'] as int?,
      clienteId: j['clienteId'] as String?,
      clienteNombre: j['clienteNombre'] as String?,
      asignadoAId: j['asignadoAId'] as String?,
      asignadoANombre: j['asignadoANombre'] as String?,
      estado: (j['estado'] as String?) ?? 'INICIADO',
      etapaActual: etapa,
      historial: rawHistorial
          .map((e) => HistorialEntryDTO.fromJson(e as Map<String, dynamic>))
          .toList(),
      creadoEn: j['creadoEn'] != null
          ? DateTime.tryParse(j['creadoEn'] as String)
          : null,
      actualizadoEn: j['actualizadoEn'] != null
          ? DateTime.tryParse(j['actualizadoEn'] as String)
          : null,
      fechaVencimientoEtapa: j['fechaVencimientoEtapa'] != null
          ? DateTime.tryParse(j['fechaVencimientoEtapa'] as String)
          : null,
      apelacion: apelacion,
    );
  }
}
