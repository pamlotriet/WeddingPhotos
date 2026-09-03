import { Component, signal } from '@angular/core';

interface PhotoFile {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly guestName = signal('');
  protected readonly photos = signal<PhotoFile[]>([]);
  protected readonly isSending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');

  // Set this to the deployed Google Apps Script web app URL.
  private readonly uploadEndpoint =
    'https://script.google.com/macros/s/AKfycbzOAw-rcO7FhuULZ-gDlUme6ubar9DeSxIPMoASKee_iLftC0yB5bA960yWV7fK5YFX/exec';
  protected readonly maxPhotos = 20;
  protected readonly maxFileSize = 12 * 1024 * 1024;

  protected selectFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  protected removePhoto(index: number): void {
    const current = this.photos();
    URL.revokeObjectURL(current[index].preview);
    this.photos.set(current.filter((_, photoIndex) => photoIndex !== index));
    this.error.set('');
  }

  protected async sendPhotos(): Promise<void> {
    if (!this.guestName().trim() || !this.photos().length) {
      this.error.set('Add your name and at least one photo to continue.');
      return;
    }

    if (!this.uploadEndpoint) {
      this.error.set(
        'The gallery is not connected yet. Add your Apps Script URL in src/app/app.ts.',
      );
      return;
    }

    this.isSending.set(true);
    this.error.set('');
    try {
      const files = await Promise.all(
        this.photos().map(async ({ file }) => ({
          ...(await this.prepareUpload(file)),
        })),
      );
      await fetch(this.uploadEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ guestName: this.guestName().trim(), files }),
      });
      this.sent.set(true);
      this.photos().forEach(({ preview }) => URL.revokeObjectURL(preview));
      this.photos.set([]);
    } catch {
      this.error.set('Something went wrong while sending. Please try again.');
    } finally {
      this.isSending.set(false);
    }
  }

  protected formatSize(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private addFiles(files: File[]): void {
    const available = this.maxPhotos - this.photos().length;
    const validFiles = files
      .filter((file) => file.type.startsWith('image/') && file.size <= this.maxFileSize)
      .slice(0, available);

    if (!validFiles.length) {
      this.error.set('Choose image files up to 12 MB each.');
      return;
    }

    this.photos.update((current) => [
      ...current,
      ...validFiles.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    this.sent.set(false);
    this.error.set('');
  }

  private toBase64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async prepareUpload(file: File): Promise<{ name: string; type: string; data: string }> {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = objectUrl;
      });

      const maxDimension = 2400;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

      const compressedBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.82),
      );
      if (compressedBlob) {
        return {
          name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
          type: 'image/jpeg',
          data: await this.toBase64(compressedBlob),
        };
      }
    } catch {
      // Some browsers cannot decode HEIC; send the original in that case.
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    return { name: file.name, type: file.type, data: await this.toBase64(file) };
  }
}
