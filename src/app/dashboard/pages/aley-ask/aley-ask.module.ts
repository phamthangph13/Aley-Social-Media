import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AleyAskRoutingModule } from './aley-ask-routing.module';
import { AleyAskComponent } from './aley-ask.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    AleyAskRoutingModule
  ]
})
export class AleyAskModule { }
