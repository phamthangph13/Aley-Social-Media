import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FundraisingComponent } from './fundraising.component';

const routes: Routes = [
  {
    path: '',
    component: FundraisingComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FundraisingRoutingModule { }
