import { Injectable } from '@angular/core';
import Konva from 'konva';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private layer!: Konva.Layer;
  private selectionRect: Konva.Rect | null = null;
  private startPoint: Konva.Vector2d | null = null;
  private selectedShapes: Set<Konva.Shape | Konva.Group> = new Set();

  constructor() {}

  setLayer(layer: Konva.Layer) {
    this.layer = layer;
  }

  startSelection(pos: Konva.Vector2d) {
    this.startPoint = pos;
    this.selectionRect = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      fill: 'rgba(0, 0, 255, 0.1)',
      stroke: 'blue',
      strokeWidth: 1,
    });
    this.layer.add(this.selectionRect);
  }

  updateSelection(pos: Konva.Vector2d) {
    if (!this.startPoint || !this.selectionRect) return;

    const x = Math.min(this.startPoint.x, pos.x);
    const y = Math.min(this.startPoint.y, pos.y);
    const width = Math.abs(pos.x - this.startPoint.x);
    const height = Math.abs(pos.y - this.startPoint.y);

    this.selectionRect.setAttrs({ x, y, width, height });
    this.layer.batchDraw();
  }

  endSelection() {
    if (!this.selectionRect) return;

    const shapes = this.layer.getChildren((node) => {
      return node instanceof Konva.Shape || node instanceof Konva.Group;
    });

    this.selectedShapes.clear();

    shapes.forEach((shape) => {
      if (this.isShapeIntersecting(shape)) {
        this.selectedShapes.add(shape);
        this.highlightShape(shape);
      } else {
        this.unhighlightShape(shape);
      }
    });

    this.selectionRect.destroy();
    this.selectionRect = null;
    this.startPoint = null;
    this.layer.batchDraw();
  }

  private isShapeIntersecting(shape: Konva.Shape | Konva.Group): boolean {
    if (!this.selectionRect) return false;

    const shapeRect = shape.getClientRect();
    const selectionRect = this.selectionRect.getClientRect();

    return !(
      shapeRect.x > selectionRect.x + selectionRect.width ||
      shapeRect.x + shapeRect.width < selectionRect.x ||
      shapeRect.y > selectionRect.y + selectionRect.height ||
      shapeRect.y + shapeRect.height < selectionRect.y
    );
  }

  private highlightShape(shape: Konva.Shape | Konva.Group) {
    if (shape instanceof Konva.Line) {
      shape.stroke('blue');
    } else if (shape instanceof Konva.Group) {
      shape.getChildren().forEach((child) => {
        if (child instanceof Konva.Shape) {
          child.stroke('blue');
        }
      });
    }
  }

  private unhighlightShape(shape: Konva.Shape | Konva.Group) {
    if (shape instanceof Konva.Line) {
      shape.stroke('black');
    } else if (shape instanceof Konva.Group) {
      shape.getChildren().forEach((child) => {
        if (child instanceof Konva.Shape) {
          child.stroke(child.getAttr('originalStroke') || 'black');
        }
      });
    }
  }

  getSelectedShapes(): Set<Konva.Shape | Konva.Group> {
    return this.selectedShapes;
  }

  clearSelection() {
    this.selectedShapes.forEach((shape) => this.unhighlightShape(shape));
    this.selectedShapes.clear();
    this.layer.batchDraw();
  }
}
