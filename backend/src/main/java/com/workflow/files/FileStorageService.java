package com.workflow.files;

import com.workflow.shared.exception.BadRequestException;
import com.workflow.shared.exception.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB

    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
        "image/jpeg",
        "image/png",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    @Value("${app.uploads.dir:/uploads}")
    private String uploadsDirPath;

    private Path uploadsDir;

    @PostConstruct
    public void init() {
        uploadsDir = Paths.get(uploadsDirPath);
        try {
            Files.createDirectories(uploadsDir);
            log.info("Directorio de uploads inicializado: {}", uploadsDir.toAbsolutePath());
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo crear el directorio de uploads: " + uploadsDirPath, e);
        }
    }

    /**
     * Almacena el archivo recibido y retorna una referencia con metadatos.
     */
    public FileReference store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("El archivo no puede estar vacío");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new BadRequestException(
                "Tipo de archivo no permitido: " + contentType +
                ". Solo se aceptan: JPEG, PNG, PDF, DOC, DOCX"
            );
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("El archivo supera el tamaño máximo permitido de 10 MB");
        }

        String fileId = UUID.randomUUID().toString();
        String nombreOriginal = sanitizeFilename(file.getOriginalFilename());
        String nombreAlmacenado = fileId + "_" + nombreOriginal;
        Path destino = uploadsDir.resolve(nombreAlmacenado);

        try {
            Files.copy(file.getInputStream(), destino);
        } catch (IOException e) {
            log.error("Error al almacenar archivo {}: {}", nombreAlmacenado, e.getMessage());
            throw new BadRequestException("Error al guardar el archivo. Intente nuevamente.");
        }

        log.info("Archivo almacenado: {} ({} bytes)", nombreAlmacenado, file.getSize());

        return FileReference.builder()
                .fileId(fileId)
                .nombre(nombreOriginal)
                .tipo(contentType)
                .url("/files/" + fileId)
                .tamanio(file.getSize())
                .subidoEn(LocalDateTime.now())
                .build();
    }

    /**
     * Retorna un FileReference con los metadatos del archivo almacenado.
     * Construye los metadatos desde el nombre del archivo en disco (fileId_nombreOriginal).
     * Retorna Optional.empty() si el archivo no existe — nunca lanza excepción.
     */
    public Optional<FileReference> getFileReference(String fileId) {
        if (fileId == null || fileId.isBlank()) return Optional.empty();
        File[] matches = uploadsDir.toFile().listFiles(
            (dir, name) -> name.startsWith(fileId + "_")
        );
        if (matches == null || matches.length == 0) {
            log.warn("[FileStorageService] getFileReference: archivo no encontrado para fileId={}", fileId);
            return Optional.empty();
        }
        File archivo = matches[0];
        // Nombre original: todo lo que viene después de "{fileId}_"
        String nombreOriginal = archivo.getName().substring(fileId.length() + 1);
        String contentType;
        try {
            contentType = Files.probeContentType(archivo.toPath());
        } catch (IOException e) {
            contentType = "application/octet-stream";
        }
        return Optional.of(FileReference.builder()
                .fileId(fileId)
                .nombre(nombreOriginal)
                .tipo(contentType != null ? contentType : "application/octet-stream")
                .url("/files/" + fileId)
                .tamanio(archivo.length())
                .build());
    }

    /**
     * Busca y retorna el archivo físico por su fileId.
     * El nombre en disco tiene el formato: {fileId}_{nombreOriginal}
     */
    public Resource load(String fileId) {
        File[] matches = uploadsDir.toFile().listFiles(
            (dir, name) -> name.startsWith(fileId + "_")
        );

        if (matches == null || matches.length == 0) {
            throw new ResourceNotFoundException("Archivo no encontrado: " + fileId);
        }

        FileSystemResource resource = new FileSystemResource(matches[0]);
        if (!resource.exists()) {
            throw new ResourceNotFoundException("Archivo no encontrado: " + fileId);
        }
        return resource;
    }

    /**
     * Determina el MIME type del archivo almacenado por su fileId.
     */
    public String detectContentType(String fileId) {
        File[] matches = uploadsDir.toFile().listFiles(
            (dir, name) -> name.startsWith(fileId + "_")
        );

        if (matches == null || matches.length == 0) {
            return "application/octet-stream";
        }

        try {
            String detected = Files.probeContentType(matches[0].toPath());
            return detected != null ? detected : "application/octet-stream";
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    /**
     * Elimina físicamente el archivo del sistema de archivos.
     */
    public void delete(String fileId) {
        File[] matches = uploadsDir.toFile().listFiles(
            (dir, name) -> name.startsWith(fileId + "_")
        );

        if (matches == null || matches.length == 0) {
            throw new ResourceNotFoundException("Archivo no encontrado para eliminar: " + fileId);
        }

        for (File file : matches) {
            boolean eliminado = file.delete();
            if (!eliminado) {
                log.warn("No se pudo eliminar el archivo físico: {}", file.getAbsolutePath());
            } else {
                log.info("Archivo eliminado: {}", file.getName());
            }
        }
    }

    private String sanitizeFilename(String original) {
        if (original == null || original.isBlank()) {
            return "archivo";
        }
        // Elimina caracteres peligrosos, mantiene letras, números, puntos, guiones y guiones bajos
        return original.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }
}
