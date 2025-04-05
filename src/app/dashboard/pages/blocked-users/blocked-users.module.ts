import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockedUsersComponent } from './blocked-users.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: BlockedUsersComponent
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class BlockedUsersModule { } 