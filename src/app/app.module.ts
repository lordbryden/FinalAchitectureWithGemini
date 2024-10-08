import {
  FaIconLibrary,
  FontAwesomeModule,
} from '@fortawesome/angular-fontawesome';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserModule } from '@angular/platform-browser';
import { HomePage } from './home/home.page';
import { NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { ThreeDService } from './services/three-d.service';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import {  HttpClientModule } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { OAuthModule } from 'angular-oauth2-oidc'; // Import the OAuthModule
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FontAwesomeModule,
    HttpClientModule,
    OAuthModule.forRoot(), // Include the OAuthModule here

  ],
  providers: [
    ThreeDService,
    AuthService,
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy  }  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private library: FaIconLibrary) {
    library.addIconPacks(fas, fab, far);
  }
}
