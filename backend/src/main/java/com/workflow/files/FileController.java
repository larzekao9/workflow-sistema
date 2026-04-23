package com.workflow.files;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    /**
     * POST /files/upload
     * Cualquier usuario autenticado puede subir archivos.
     * Content-Type: multipart/form-data, field name: "file"
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileReference> upload(@RequestParam("file") MultipartFile file) {
        FileReference ref = fileStorageService.store(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(ref);
    }

    /**
     * GET /files/{fileId}
     * Público: permite que el cliente vea sus documentos sin token (por ejemplo en <img src>).
     */
    @GetMapping("/{fileId}")
    public ResponseEntity<Resource> download(@PathVariable String fileId) {
        Resource resource = fileStorageService.load(fileId);
        String contentType = fileStorageService.detectContentType(fileId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    /**
     * DELETE /files/{fileId}
     * Solo ADMINISTRADOR o SUPERADMIN pueden eliminar archivos.
     */
    @DeleteMapping("/{fileId}")
    @PreAuthorize("hasAnyAuthority('GESTIONAR_EMPRESAS', 'GESTIONAR_USUARIOS')")
    public ResponseEntity<Void> delete(@PathVariable String fileId) {
        fileStorageService.delete(fileId);
        return ResponseEntity.noContent().build();
    }
}
