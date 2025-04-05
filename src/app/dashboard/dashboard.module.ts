import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

const routes: Routes = [
  { 
    path: '', 
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { 
        path: 'home',
        loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule)
      },
      { 
        path: 'search',
        loadChildren: () => import('./pages/search/search.module').then(m => m.SearchModule)
      },
      { 
        path: 'friends',
        loadChildren: () => import('./pages/friends/friends.module').then(m => m.FriendsModule)
      },
      { 
        path: 'messages',
        loadChildren: () => import('./pages/messages/messages.module').then(m => m.MessagesModule)
      },
      { 
        path: 'profile',
        loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfileModule)
      }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DashboardModule { } 