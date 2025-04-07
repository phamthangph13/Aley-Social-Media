import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FundraisingComponent } from './fundraising.component';
import { CampaignDetailComponent } from './campaign-detail/campaign-detail.component';

const routes: Routes = [
  {
    path: '',
    component: FundraisingComponent
  },
  {
    path: ':id',
    component: CampaignDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FundraisingRoutingModule { }
