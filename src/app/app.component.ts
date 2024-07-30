import { Component } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private platform: Platform) {
    this.initializeApp();
  }
  initializeApp() {
    this.platform.ready().then(() => {
      this.setStatusBarColor();
    });
  }
  async setStatusBarColor() {
    // Set the status bar color to match your header
    await StatusBar.setBackgroundColor({ color: '#fefefe' }); // Use your header color here

    // Optionally set the style to default, dark, or light
    await StatusBar.setStyle({ style: Style.Default });
  }
}
