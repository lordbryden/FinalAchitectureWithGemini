import { Injectable, EventEmitter } from '@angular/core';
import Konva from 'konva';

@Injectable({
  providedIn: 'root'
})
export class ZoomService {
  private stage: Konva.Stage | null = null;
  private lastCenter: { x: number; y: number } | null = null;
  private lastDist = 0;

  zoomChanged = new EventEmitter<number>();

  setStage(stage: Konva.Stage) {
    this.stage = stage;
    this.setupPinchZoom();
  }

  private setupPinchZoom() {
    if (!this.stage) return;

    this.stage.on('touchmove', (e) => {
      e.evt.preventDefault();
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      if (touch1 && touch2) {
        if (this.lastCenter) {
          const newCenter = this.getCenter(touch1, touch2);
          const newDist = this.getDistance(touch1, touch2);

          if (!this.lastDist) {
            this.lastDist = newDist;
          }

          const pointTo = {
            x: (newCenter.x - this.stage!.x()) / this.stage!.scaleX(),
            y: (newCenter.y - this.stage!.y()) / this.stage!.scaleY(),
          };

          const scale = newDist / this.lastDist;

          this.stage!.scaleX(this.stage!.scaleX() * scale);
          this.stage!.scaleY(this.stage!.scaleY() * scale);

          const newPos = {
            x: newCenter.x - pointTo.x * this.stage!.scaleX(),
            y: newCenter.y - pointTo.y * this.stage!.scaleY(),
          };

          this.stage!.position(newPos);

          this.lastDist = newDist;
          this.lastCenter = newCenter;

          // Emit the scale change event
          this.zoomChanged.emit(scale);
        }
        this.lastCenter = this.getCenter(touch1, touch2);
      }
    });

    this.stage.on('touchend', () => {
      this.lastDist = 0;
      this.lastCenter = null;
    });
  }

  private getCenter(touch1: Touch, touch2: Touch) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  private getDistance(touch1: Touch, touch2: Touch) {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }
}
