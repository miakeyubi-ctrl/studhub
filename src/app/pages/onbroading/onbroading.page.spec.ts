import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnbroadingPage } from './onbroading.page';

describe('OnbroadingPage', () => {
  let component: OnbroadingPage;
  let fixture: ComponentFixture<OnbroadingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OnbroadingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
