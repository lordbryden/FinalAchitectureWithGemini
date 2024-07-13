import { TestBed } from '@angular/core/testing';

import { ThreeDService } from './three-d.service';

describe('ThreeDService', () => {
  let service: ThreeDService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeDService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
