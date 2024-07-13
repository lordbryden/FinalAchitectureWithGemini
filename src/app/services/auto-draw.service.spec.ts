import { TestBed } from '@angular/core/testing';

import { AutoDrawService } from './auto-draw.service';

describe('AutoDrawService', () => {
  let service: AutoDrawService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutoDrawService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
