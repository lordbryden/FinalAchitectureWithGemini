import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawingPage } from './drawing.page';

describe('DrawingPage', () => {
  let component: DrawingPage;
  let fixture: ComponentFixture<DrawingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DrawingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
