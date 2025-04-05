import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SearchComponent {
  searchQuery: string = '';
  
  constructor() { }
  
  onSearch() {
    console.log('Searching for:', this.searchQuery);
    // Search implementation would go here
  }
} 