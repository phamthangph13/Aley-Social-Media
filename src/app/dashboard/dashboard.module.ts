import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { HomeComponent } from './pages/home/home.component';

const routes: Routes = [
  { 
    path: '', 
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { 
        path: 'home',
        component: HomeComponent
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
      },
      { 
        path: 'settings',
        loadChildren: () => import('./pages/settings/settings.module').then(m => m.SettingsModule)
      },
      { 
        path: 'help-center',
        loadChildren: () => import('./pages/help-center/help-center.module').then(m => m.HelpCenterModule)
      },
      { 
        path: 'fundraising',
        loadChildren: () => import('./pages/fundraising/fundraising.module').then(m => m.FundraisingModule)
      },
      { 
        path: 'aley-ask',
        loadChildren: () => import('./pages/aley-ask/aley-ask.module').then(m => m.AleyAskModule)
      },
      { 
        path: 'user/:id',
        loadChildren: () => import('./pages/user-profile/user-profile.module').then(m => m.UserProfileModule)
      },
      { 
        path: 'blocked-users',
        redirectTo: 'settings?tab=blocked',
        pathMatch: 'full'
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