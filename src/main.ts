import pkistudioIconUrl from '@pkistudio/dereditor/pkistudio.ico';
import { initDerBuilder } from './app.js';
import './styles.css';

setDocumentIcon(pkistudioIconUrl);
initDerBuilder({ mount: '#app' });

function setDocumentIcon(url: string): void {
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.setAttribute('sizes', 'any');
  icon.href = url;
  document.head.append(icon);
}
