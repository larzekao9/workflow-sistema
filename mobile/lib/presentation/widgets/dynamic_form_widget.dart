import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/models/campo.dart';
import '../providers/providers.dart';

class DynamicFormWidget extends ConsumerStatefulWidget {
  const DynamicFormWidget({
    super.key,
    required this.campos,
    required this.onSubmit,
    required this.submitLabel,
    this.isExternalLoading = false,
  });

  final List<CampoFormulario> campos;
  final Future<void> Function(Map<String, dynamic> datos) onSubmit;
  final String submitLabel;
  final bool isExternalLoading;

  @override
  ConsumerState<DynamicFormWidget> createState() => _DynamicFormWidgetState();
}

class _DynamicFormWidgetState extends ConsumerState<DynamicFormWidget> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, dynamic> _datos = {};
  final Set<String> _uploadingFields = {};
  final Map<String, TextEditingController> _dateControllers = {};
  bool _isSubmitting = false;

  static final _displayDateFormat = DateFormat('dd/MM/yyyy');

  @override
  void initState() {
    super.initState();
    for (final campo in widget.campos) {
      if (campo.tipo == 'BOOLEAN') {
        _datos[campo.nombre] = false;
      } else if (campo.tipo == 'DATE') {
        _dateControllers[campo.nombre] = TextEditingController();
      }
    }
  }

  @override
  void dispose() {
    for (final ctrl in _dateControllers.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();
    setState(() => _isSubmitting = true);
    try {
      await widget.onSubmit(Map<String, dynamic>.from(_datos));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _pickAndUploadFile(CampoFormulario campo) async {
    FilePickerResult? result;
    try {
      result = await FilePicker.platform.pickFiles();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al abrir selector: ${e.toString()}')),
        );
      }
      return;
    }

    if (result == null || result.files.isEmpty) return;

    final picked = result.files.single;
    if (picked.path == null) return;

    setState(() => _uploadingFields.add(campo.nombre));
    try {
      final file = File(picked.path!);
      final uploaded = await ref
          .read(fileServiceProvider)
          .upload(file, picked.name);
      if (mounted) {
        setState(() {
          _datos[campo.nombre] = uploaded.fileId;
          _datos['${campo.nombre}_nombre'] = picked.name;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error subiendo archivo: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingFields.remove(campo.nombre));
    }
  }

  Widget _buildField(CampoFormulario campo) {
    switch (campo.tipo) {
      case 'TEXT':
        return TextFormField(
          decoration: InputDecoration(labelText: campo.displayLabel),
          validator: (v) {
            if (campo.esRequerido && (v == null || v.trim().isEmpty)) {
              return 'Campo requerido';
            }
            return null;
          },
          onSaved: (v) => _datos[campo.nombre] = v?.trim() ?? '',
        );

      case 'NUMBER':
        return TextFormField(
          decoration: InputDecoration(labelText: campo.displayLabel),
          keyboardType: TextInputType.number,
          validator: (v) {
            if (campo.esRequerido && (v == null || v.trim().isEmpty)) {
              return 'Campo requerido';
            }
            return null;
          },
          onSaved: (v) => _datos[campo.nombre] = v?.trim() ?? '',
        );

      case 'TEXTAREA':
        return TextFormField(
          decoration: InputDecoration(labelText: campo.displayLabel),
          maxLines: 4,
          validator: (v) {
            if (campo.esRequerido && (v == null || v.trim().isEmpty)) {
              return 'Campo requerido';
            }
            return null;
          },
          onSaved: (v) => _datos[campo.nombre] = v?.trim() ?? '',
        );

      case 'DATE':
        final controller = _dateControllers[campo.nombre]!;
        return TextFormField(
          controller: controller,
          decoration: InputDecoration(
            labelText: campo.displayLabel,
            suffixIcon: const Icon(Icons.calendar_today),
          ),
          readOnly: true,
          validator: (v) {
            if (campo.esRequerido && (v == null || v.trim().isEmpty)) {
              return 'Campo requerido';
            }
            return null;
          },
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (picked != null) {
              final formatted = DateFormat('yyyy-MM-dd').format(picked);
              setState(() {
                _datos[campo.nombre] = formatted;
                controller.text = _displayDateFormat.format(picked);
              });
            }
          },
        );

      case 'SELECT':
        return DropdownButtonFormField<String>(
          decoration: InputDecoration(labelText: campo.displayLabel),
          initialValue: _datos[campo.nombre] as String?,
          items: campo.opciones
              .map((o) => DropdownMenuItem(value: o, child: Text(o)))
              .toList(),
          validator: (v) {
            if (campo.esRequerido && (v == null || v.isEmpty)) {
              return 'Seleccione una opción';
            }
            return null;
          },
          onChanged: (v) => setState(() => _datos[campo.nombre] = v),
          onSaved: (v) => _datos[campo.nombre] = v,
        );

      case 'BOOLEAN':
        return SwitchListTile(
          title: Text(campo.displayLabel),
          value: (_datos[campo.nombre] as bool?) ?? false,
          onChanged: (v) => setState(() => _datos[campo.nombre] = v),
          contentPadding: EdgeInsets.zero,
        );

      case 'FILE':
        final isUploading = _uploadingFields.contains(campo.nombre);
        final hasFile = _datos['${campo.nombre}_nombre'] != null;
        return FormField<String>(
          validator: (_) {
            if (campo.esRequerido && _datos[campo.nombre] == null) {
              return 'Seleccione un archivo';
            }
            return null;
          },
          builder: (state) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(campo.displayLabel,
                  style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 4),
              Row(
                children: [
                  ElevatedButton.icon(
                    icon: isUploading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.attach_file, size: 18),
                    label: Text(isUploading ? 'Subiendo...' : 'Seleccionar'),
                    onPressed:
                        isUploading ? null : () => _pickAndUploadFile(campo),
                  ),
                  if (hasFile) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _datos['${campo.nombre}_nombre'] as String,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ],
              ),
              if (state.hasError)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    state.errorText!,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontSize: 12),
                  ),
                ),
            ],
          ),
        );

      default:
        return TextFormField(
          decoration: InputDecoration(labelText: campo.displayLabel),
          onSaved: (v) => _datos[campo.nombre] = v?.trim() ?? '',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading =
        _isSubmitting || widget.isExternalLoading || _uploadingFields.isNotEmpty;

    if (widget.campos.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text('Esta etapa no requiere datos adicionales.'),
          ),
          ElevatedButton(
            onPressed: isLoading ? null : _submit,
            child: isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.submitLabel),
          ),
        ],
      );
    }

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ...widget.campos.map(
            (campo) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _buildField(campo),
            ),
          ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: isLoading ? null : _submit,
            child: isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.submitLabel),
          ),
        ],
      ),
    );
  }
}
