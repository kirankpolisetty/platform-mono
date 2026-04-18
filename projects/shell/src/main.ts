import { initFederation } from '@angular-architects/native-federation';

void startShell();

async function startShell(): Promise<void> {
  try {
    await initFederation('federation.manifest.json');
    await import('./bootstrap');
  } catch (error) {
    console.error(error);
  }
}
