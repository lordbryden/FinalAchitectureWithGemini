import { CommonModule } from '@angular/common';
import { DrawingPage } from './drawing.page';
import { DrawingPageRoutingModule } from './drawing-routing.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DrawingPageRoutingModule,
    FontAwesomeModule,
  ],
  declarations: [DrawingPage],
})
export class DrawingPageModule {}
