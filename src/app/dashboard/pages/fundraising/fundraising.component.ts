import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FundraisingService } from '../../../services/fundraising.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-fundraising',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './fundraising.component.html',
  styleUrl: './fundraising.component.css'
})
export class FundraisingComponent implements OnInit {
  campaigns: any[] = [];
  loading: boolean = false;
  error: string | null = null;
  showCreateForm: boolean = false;
  createForm: FormGroup;
  campaignCategories = [
    { value: 'education', label: 'Giáo dục' },
    { value: 'health', label: 'Y tế' },
    { value: 'environment', label: 'Môi trường' },
    { value: 'disaster', label: 'Thiên tai' },
    { value: 'community', label: 'Cộng đồng' },
    { value: 'other', label: 'Khác' }
  ];
  
  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  totalItems: number = 0;
  itemsPerPage: number = 9;
  
  // Filters
  searchTerm: string = '';
  selectedCategory: string = 'all';
  
  // Timestamp for cache-busting
  private timestampCache: number = new Date().getTime();

  constructor(
    private fundraisingService: FundraisingService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      goal: ['', [Validators.required, Validators.min(1000000)]],
      endDate: ['', Validators.required],
      category: ['', Validators.required],
      image: [null]
    });
  }

  ngOnInit(): void {
    this.loadCampaigns();
    
    // Listen for query params to handle search and filtering
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchTerm = params['search'];
      }
      
      if (params['category']) {
        this.selectedCategory = params['category'];
      }
      
      if (params['page']) {
        this.currentPage = +params['page'];
      }
      
      this.loadCampaigns();
    });
  }

  loadCampaigns() {
    this.loading = true;
    this.fundraisingService.getAllCampaigns(
      this.currentPage, 
      this.itemsPerPage, 
      this.searchTerm,
      this.selectedCategory
    ).subscribe({
      next: (response) => {
        this.campaigns = response.data;
        // For campaigns with image data in MongoDB, image property will be available as imageUrl virtual
        this.campaigns.forEach(campaign => {
          if (!campaign.image) {
            campaign.image = this.getCampaignImageUrl(campaign._id);
          }
        });
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.pages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading campaigns:', error);
        this.error = 'Có lỗi xảy ra khi tải danh sách chiến dịch gây quỹ.';
        this.loading = false;
      }
    });
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createForm.reset();
    }
  }

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.createForm.patchValue({ image: file });
  }

  createCampaign() {
    if (this.createForm.invalid) {
      return;
    }
    
    const formData = new FormData();
    formData.append('title', this.createForm.get('title')?.value);
    formData.append('description', this.createForm.get('description')?.value);
    formData.append('goal', this.createForm.get('goal')?.value);
    formData.append('endDate', this.createForm.get('endDate')?.value);
    formData.append('category', this.createForm.get('category')?.value);
    
    if (this.createForm.get('image')?.value) {
      formData.append('image', this.createForm.get('image')?.value);
    }
    
    this.loading = true;
    this.fundraisingService.createCampaign(formData).subscribe({
      next: (response) => {
        this.toggleCreateForm();
        this.loadCampaigns();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating campaign:', error);
        this.error = 'Có lỗi xảy ra khi tạo chiến dịch gây quỹ.';
        this.loading = false;
      }
    });
  }

  changePage(page: number) {
    this.currentPage = page;
    this.loadCampaigns();
  }
  
  applyFilters() {
    this.currentPage = 1; // Reset to first page when applying filters
    this.loadCampaigns();
  }
  
  getAvatarUrl(userId: string | undefined): string {
    if (!userId) return 'assets/images/default-avatar.png';
    // Use the timestamp cache for consistency
    return `${environment.apiUrl}/profile/${userId}/avatar?t=${this.timestampCache}`;
  }
  
  getCampaignImageUrl(campaignId: string | undefined): string {
    if (!campaignId) return 'assets/images/default-campaign.png';
    // Use the correct endpoint for campaign images
    return `${environment.apiUrl}/fundraising/campaigns/${campaignId}/image?t=${this.timestampCache}`;
  }
  
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/default-campaign.png';
    console.log('Image failed to load, replaced with default image');
  }
}
