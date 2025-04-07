import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AleyAskComponent } from './aley-ask.component';

describe('AleyAskComponent', () => {
  let component: AleyAskComponent;
  let fixture: ComponentFixture<AleyAskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AleyAskComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AleyAskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
