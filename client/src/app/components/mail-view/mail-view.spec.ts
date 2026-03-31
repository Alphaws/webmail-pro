import { ComponentFixture, TestBed } from "@angular/core/testing";

import { MailView } from "./mail-view";

describe("MailView", () => {
  let component: MailView;
  let fixture: ComponentFixture<MailView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MailView],
    }).compileComponents();

    fixture = TestBed.createComponent(MailView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
