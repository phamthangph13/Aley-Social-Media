import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AleyAskComponent } from './aley-ask.component';

const routes: Routes = [
  {
    path: '',
    component: AleyAskComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AleyAskRoutingModule { }
