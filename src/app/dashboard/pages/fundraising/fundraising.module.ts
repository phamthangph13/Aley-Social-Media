import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FundraisingRoutingModule } from './fundraising-routing.module';
import { FundraisingComponent } from './fundraising.component';
import { CampaignDetailComponent } from './campaign-detail/campaign-detail.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FundraisingRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    FundraisingComponent,
    CampaignDetailComponent
  ]
})
export class FundraisingModule { }
