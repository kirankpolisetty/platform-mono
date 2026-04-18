import { Component, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

type CoreDescriptionMetadata = {
  descNumber: number;
  coreNumber: number;
  topDepth: number;
  bottomDepth: number;
  reservoir: string;
  coreDesc: string;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly selectedDescription = input<CoreDescriptionMetadata | null>(null);
  readonly viewerLoading = signal(true);
  readonly reactAppUrl = 'http://localhost:3000';
  readonly reactAppSource;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.reactAppSource = this.sanitizer.bypassSecurityTrustResourceUrl(this.reactAppUrl);
  }

  onViewerLoaded(): void {
    this.viewerLoading.set(false);
  }
}
