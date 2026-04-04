import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly stats = [
    { label: 'Active users', value: '12.4K' },
    { label: 'Conversion rate', value: '6.8%' },
    { label: 'Avg. response', value: '182ms' }
  ];
}
