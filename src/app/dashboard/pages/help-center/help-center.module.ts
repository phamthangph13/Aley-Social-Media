import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HelpCenterComponent } from './help-center.component';

const routes: Routes = [
  {
    path: '',
    component: HelpCenterComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    HelpCenterComponent
  ]
})
export class HelpCenterModule { } 