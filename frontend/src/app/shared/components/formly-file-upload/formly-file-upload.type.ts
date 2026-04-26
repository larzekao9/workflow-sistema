import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyModule } from '@ngx-formly/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-formly-file-upload',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, FormlyModule, MatIconModule, MatFormFieldModule],
  template: `
    <div class="ffu-wrapper">
      <label class="ffu-label" [for]="'ffu_' + field.key">
        {{ props.label }}
        <span *ngIf="props.required" class="ffu-required" aria-hidden="true"> *</span>
      </label>

      <label
        class="ffu-dropzone"
        [class.ffu-dropzone--has-file]="hasFile"
        [for]="'ffu_' + field.key"
        role="button"
        [attr.tabindex]="0"
        [attr.aria-label]="'Subir archivo para ' + props.label"
        (keydown.enter)="triggerInput($event)"
        (keydown.space)="triggerInput($event)">

        <mat-icon class="ffu-icon" aria-hidden="true">
          {{ hasFile ? 'check_circle' : 'cloud_upload' }}
        </mat-icon>

        <span class="ffu-text" *ngIf="!hasFile">
          Hacé clic para seleccionar un archivo
        </span>
        <span class="ffu-text ffu-text--selected" *ngIf="hasFile">
          {{ fileName }}
        </span>

        <span class="ffu-hint" *ngIf="!hasFile">PDF, JPG, PNG — máx. 10 MB</span>

        <input
          type="file"
          [id]="'ffu_' + field.key"
          class="ffu-input"
          (change)="onFileChange($event)"
          [attr.aria-label]="props.label + (props.required ? ' (obligatorio)' : '')" />
      </label>

      <mat-error *ngIf="formControl.invalid && formControl.touched" class="ffu-error">
        Este campo es obligatorio.
      </mat-error>
    </div>
  `,
  styles: [`
    .ffu-wrapper {
      display: block;
      margin-bottom: 4px;
    }

    .ffu-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }

    .ffu-required {
      color: #dc2626;
    }

    .ffu-dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 28px 20px;
      border: 2px dashed #d1d5db;
      border-radius: 10px;
      background: #f9fafb;
      cursor: pointer;
      transition: border-color .2s, background .2s;
      text-align: center;
      position: relative;
    }

    .ffu-dropzone:hover,
    .ffu-dropzone:focus {
      border-color: #6366f1;
      background: #f5f3ff;
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }

    .ffu-dropzone--has-file {
      border-color: #6366f1;
      border-style: solid;
      background: #f5f3ff;
    }

    .ffu-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #6366f1;
      transition: transform .2s;
    }

    .ffu-dropzone:hover .ffu-icon {
      transform: translateY(-2px);
    }

    .ffu-dropzone--has-file .ffu-icon {
      color: #16a34a;
    }

    .ffu-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .ffu-text--selected {
      color: #4338ca;
      font-weight: 600;
    }

    .ffu-hint {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .ffu-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }

    .ffu-error {
      display: block;
      font-size: 0.75rem;
      color: #dc2626;
      margin-top: 4px;
      padding-left: 2px;
    }
  `]
})
export class FileUploadTypeComponent extends FieldType<FieldTypeConfig> {
  fileName = '';

  get hasFile(): boolean {
    return !!this.fileName;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileName = file.name;
      this.formControl.setValue(file.name);
      this.formControl.markAsTouched();
    }
  }

  triggerInput(event: Event): void {
    event.preventDefault();
    const label = (event.target as HTMLElement);
    const input = label.querySelector<HTMLInputElement>('.ffu-input');
    input?.click();
  }
}
