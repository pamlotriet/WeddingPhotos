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
  protected readonly uploadProgress = signal(0);
  protected readonly uploadTotal = signal(0);
  protected readonly uploadPhotoProgress = signal(0);
  protected readonly uploadPhotoTotal = signal(0);
  protected readonly sent = signal(false);
  protected readonly error = signal('');

  // Set this to the deployed Google Apps Script web app URL.
  private readonly uploadEndpoint =
    'https://script.google.com/macros/s/AKfycbzOAw-rcO7FhuULZ-gDlUme6ubar9DeSxIPMoASKee_iLftC0yB5bA960yWV7fK5YFX/exec';
  protected readonly maxPhotos = 30;
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
    if (!this.photos().length) {
      this.error.set('Kies asseblief ten minste een foto om voort te gaan.');
      return;
    }

    if (!this.uploadEndpoint) {
      this.error.set(
        'Die galery is nog nie gekoppel nie. Voeg die Apps Script-URL in src/app/app.ts by.',
      );
      return;
    }

    this.isSending.set(true);
    this.error.set('');
    this.uploadProgress.set(0);
    this.uploadPhotoProgress.set(0);
    this.uploadPhotoTotal.set(this.photos().length);
    try {
      const files: Array<{ name: string; type: string; data: string; bytes: number }> = [];
      for (const { file } of this.photos()) {
        const prepared = await this.prepareUpload(file);
        files.push(prepared);
        this.uploadProgress.update((current) => current + prepared.bytes);
        this.uploadPhotoProgress.update((current) => current + 1);
      }
      this.uploadTotal.set(files.reduce((total, file) => total + file.bytes, 0));
      await fetch(this.uploadEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ files: files.map(({ bytes, ...file }) => file) }),
      });
      this.sent.set(true);
      this.photos().forEach(({ preview }) => URL.revokeObjectURL(preview));
      this.photos.set([]);
    } catch {
      this.error.set('Iets het verkeerd geloop. Probeer asseblief weer.');
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
      this.error.set('Kies beeldlêers van hoogstens 12 MB elk.');
        this.error.set('Kies beeldlêers van hoogstens 12 MB elk.');
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

  private async prepareUpload(file: File): Promise<{ name: string; type: string; data: string; bytes: number }> {
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
          bytes: compressedBlob.size,
        };
      }
    } catch {
      // Some browsers cannot decode HEIC; send the original in that case.
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    return { name: file.name, type: file.type, data: await this.toBase64(file), bytes: file.size };
  }
}
