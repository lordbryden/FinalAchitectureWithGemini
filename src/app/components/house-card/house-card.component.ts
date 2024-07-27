import { Component, EventEmitter, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-house-card',
  templateUrl: './house-card.component.html',
  styleUrls: ['./house-card.component.scss'],
})
export class HouseCardComponent implements OnInit {
  @Input()
  design!: { id: string; title: string; description: string , thumbnail: string;};
  constructor() {}

  ngOnInit() {}
}
