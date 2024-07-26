import { Component, EventEmitter, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-house-card',
  templateUrl: './house-card.component.html',
  styleUrls: ['./house-card.component.scss'],
})
export class HouseCardComponent implements OnInit {
  @Input()
  design!: { image: string; title: string; description: string };
  constructor() {}

  ngOnInit() {}
}
