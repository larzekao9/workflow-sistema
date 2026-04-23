package com.workflow.files;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Clase embebible (NO es @Document) para referenciar archivos almacenados.
 * Se usa como campo dentro de otros Documents (por ejemplo en Tramite, historial, etc.)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileReference {

    private String fileId;

    /** Nombre original del archivo tal como fue subido */
    private String nombre;

    /** MIME type del archivo (image/jpeg, application/pdf, etc.) */
    private String tipo;

    /** URL de acceso público: /files/{fileId} */
    private String url;

    /** Tamaño en bytes */
    private Long tamanio;

    private LocalDateTime subidoEn;
}
