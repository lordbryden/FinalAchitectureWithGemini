import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  public readonly DEFAULT_WALL_COLOR = '#FFFFFF';  // white
  public readonly DEFAULT_DOOR_COLOR = '#8B4513';  // brown
  public readonly DEFAULT_WINDOW_COLOR = '#0000FF';  // blue
  public readonly DEFAULT_ROOF_COLOR = '#800020';  // oxblood

 private wallColorSubject = new BehaviorSubject<string>(this.DEFAULT_WALL_COLOR);
  private doorColorSubject = new BehaviorSubject<string>(this.DEFAULT_DOOR_COLOR);
  private windowColorSubject = new BehaviorSubject<string>(this.DEFAULT_WINDOW_COLOR);
  private roofColorSubject = new BehaviorSubject<string>(this.DEFAULT_ROOF_COLOR);


  wallColor$ = this.wallColorSubject.asObservable();
  doorColor$ = this.doorColorSubject.asObservable();
  windowColor$ = this.windowColorSubject.asObservable();
  roofColor$ = this.roofColorSubject.asObservable();

  setWallColor(color: string) {
    this.wallColorSubject.next(color);
  }

  setDoorColor(color: string) {
    this.doorColorSubject.next(color);
  }

  setWindowColor(color: string) {
    this.windowColorSubject.next(color);
  }

  setRoofColor(color: string) {
    this.roofColorSubject.next(color);
  }

  getCurrentWallColor(): string {
    return this.wallColorSubject.getValue();
  }

  getCurrentDoorColor(): string {
    return this.doorColorSubject.getValue();
  }

  getCurrentWindowColor(): string {
    return this.windowColorSubject.getValue();
  }

  getCurrentRoofColor(): string {
    return this.roofColorSubject.getValue();
  }

  resetAllColors() {
    this.setWallColor(this.DEFAULT_WALL_COLOR);
    this.setDoorColor(this.DEFAULT_DOOR_COLOR);
    this.setWindowColor(this.DEFAULT_WINDOW_COLOR);
    this.setRoofColor(this.DEFAULT_ROOF_COLOR);
  }
}
