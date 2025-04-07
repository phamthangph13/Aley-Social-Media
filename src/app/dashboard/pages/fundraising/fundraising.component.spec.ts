import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundraisingComponent } from './fundraising.component';

describe('FundraisingComponent', () => {
  let component: FundraisingComponent;
  let fixture: ComponentFixture<FundraisingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundraisingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FundraisingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
