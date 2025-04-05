import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileComponent } from './user-profile.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', component: UserProfileComponent }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class UserProfileModule { } 