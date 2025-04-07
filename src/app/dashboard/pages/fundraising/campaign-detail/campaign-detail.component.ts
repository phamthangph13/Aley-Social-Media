import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FundraisingService } from '../../../../services/fundraising.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="campaign-detail-container">
      <!-- Loading state -->
      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Đang tải...</p>
      </div>

      <!-- Error message -->
      <div class="error-message" *ngIf="error">
        {{ error }}
        <button (click)="navigateBack()" class="back-button-error">Quay lại</button>
      </div>

      <!-- Campaign detail -->
      <div class="campaign-content" *ngIf="campaign && !loading">
        <div class="campaign-header">
          <a (click)="navigateBack()" class="back-button">← Quay lại</a>
          <h1>{{ campaign.title }}</h1>
          <p class="campaign-meta">
            <span>Tạo bởi: {{ campaign.createdBy?.username || 'Ẩn danh' }}</span>
            <span>Ngày bắt đầu: {{ campaign.startDate | date:'dd/MM/yyyy' }}</span>
            <span>Ngày kết thúc: {{ campaign.endDate | date:'dd/MM/yyyy' }}</span>
          </p>
        </div>

        <div class="campaign-body">
          <div class="campaign-image">
            <img [src]="getCampaignImageUrl(campaign._id)" [alt]="campaign.title"
                 (error)="handleImageError($event)" onerror="this.src='assets/images/default-campaign.png'">
          </div>

          <div class="campaign-details">
            <div class="progress-container">
              <div class="progress-stats">
                <span class="amount">{{ campaign.raised | number }} / {{ campaign.goal | number }}đ</span>
                <span class="percentage">{{ campaign.percentageRaised }}% đạt được</span>
              </div>
              <div class="progress-bar">
                <div class="progress" [style.width.%]="campaign.percentageRaised"></div>
              </div>
            </div>

            <div class="campaign-description">
              <h2>Về chiến dịch này</h2>
              <p>{{ campaign.description }}</p>
            </div>

            <!-- Donation form -->
            <div class="donation-form" *ngIf="campaign.isActive">
              <h2>Quyên góp cho chiến dịch này</h2>
              <form [formGroup]="donationForm" (ngSubmit)="makeDonation()">
                <div class="form-group">
                  <label for="amount">Số tiền (VNĐ)</label>
                  <input 
                    type="number" 
                    id="amount" 
                    formControlName="amount" 
                    placeholder="Nhập số tiền quyên góp"
                  >
                  <div class="error" *ngIf="donationForm.get('amount')?.invalid && donationForm.get('amount')?.touched">
                    Vui lòng nhập số tiền hợp lệ (tối thiểu 10.000đ)
                  </div>
                </div>

                <div class="form-group">
                  <label for="message">Lời nhắn (tùy chọn)</label>
                  <textarea 
                    id="message" 
                    formControlName="message" 
                    placeholder="Nhập lời nhắn của bạn"
                    rows="3"
                  ></textarea>
                </div>

                <div class="form-group checkbox">
                  <input type="checkbox" id="isAnonymous" formControlName="isAnonymous">
                  <label for="isAnonymous">Quyên góp ẩn danh</label>
                </div>

                <button 
                  type="submit" 
                  class="donate-button" 
                  [disabled]="donationForm.invalid || donationLoading"
                >
                  {{ donationLoading ? 'Đang xử lý...' : 'Quyên góp ngay' }}
                </button>
              </form>
            </div>

            <div class="campaign-closed" *ngIf="!campaign.isActive">
              <p>Chiến dịch này đã kết thúc. Cảm ơn sự ủng hộ của bạn!</p>
            </div>
          </div>
        </div>

        <!-- Donors list -->
        <div class="donors-section" *ngIf="campaign.donors && campaign.donors.length > 0">
          <h2>Danh sách người quyên góp ({{ campaign.donors.length }})</h2>
          <div class="donors-list">
            <div class="donor-card" *ngFor="let donor of campaign.donors">
              <div class="donor-info">
                <img 
                  [src]="donor.isAnonymous ? 'assets/images/anonymous-user.png' : getAvatarUrl(donor.userId?._id)"
                  alt="User profile"
                  class="donor-avatar"
                >
                <div class="donor-details">
                  <p class="donor-name">
                    {{ donor.isAnonymous ? 'Ẩn danh' : donor.userId?.username || 'Ẩn danh' }}
                  </p>
                  <p class="donation-amount">{{ donor.amount | number }}đ</p>
                  <p class="donation-date">{{ donor.date | date:'dd/MM/yyyy HH:mm' }}</p>
                </div>
              </div>
              <p class="donor-message" *ngIf="donor.message">{{ donor.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .campaign-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Roboto', Arial, sans-serif;
    }

    /* Loading and Error States */
    .loading, .error-message {
      text-align: center;
      padding: 40px;
      margin: 40px 0;
      background-color: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .spinner {
      border: 4px solid rgba(63, 81, 181, 0.2);
      border-radius: 50%;
      border-top: 4px solid #3f51b5;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      color: #e53935;
      margin: 20px 0;
      border-left: 4px solid #e53935;
      padding-left: 16px;
      text-align: left;
    }

    .back-button-error {
      display: inline-block;
      margin-top: 15px;
      padding: 8px 16px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      color: #555;
      cursor: pointer;
      transition: all 0.3s;
    }

    .back-button-error:hover {
      background-color: #e0e0e0;
    }

    /* Campaign Header */
    .campaign-header {
      margin-bottom: 40px;
      background-color: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .back-button {
      display: inline-block;
      margin-bottom: 20px;
      cursor: pointer;
      color: #3f51b5;
      font-weight: 500;
      transition: color 0.3s;
      font-size: 16px;
    }

    .back-button:hover {
      color: #303f9f;
      text-decoration: underline;
    }

    .campaign-header h1 {
      font-size: 28px;
      color: #333;
      margin-bottom: 16px;
      line-height: 1.4;
      font-weight: 700;
    }

    .campaign-meta {
      display: flex;
      gap: 20px;
      color: #666;
      font-size: 14px;
      flex-wrap: wrap;
    }

    .campaign-meta span {
      background-color: #eef2ff;
      padding: 6px 12px;
      border-radius: 20px;
      display: inline-block;
    }

    /* Campaign Body */
    .campaign-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }

    .campaign-content {
      background-color: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
      padding-bottom: 30px;
    }

    .campaign-image {
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-height: 300px;
      background-color: #f0f0f0;
    }

    .campaign-image img {
      width: 100%;
      height: 100%;
      display: block;
      transform-origin: center;
      transition: transform 0.5s;
      object-fit: cover;
      min-height: 300px;
    }

    .campaign-image:hover img {
      transform: scale(1.03);
    }

    /* Progress Stats */
    .progress-container {
      margin: 0 0 30px 0;
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }

    .progress-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 15px;
    }

    .amount {
      font-weight: 600;
      color: #333;
    }
    
    .percentage {
      color: #4caf50;
      font-weight: 600;
    }

    .progress-bar {
      height: 12px;
      background-color: #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
    }

    .progress {
      height: 100%;
      background-color: #4caf50;
      border-radius: 6px;
      transition: width 0.8s ease-in-out;
    }

    /* Campaign Description */
    .campaign-description {
      margin: 30px 0;
      padding: 0 20px;
    }

    .campaign-description h2 {
      font-size: 22px;
      color: #3f51b5;
      margin-bottom: 15px;
      font-weight: 600;
    }

    .campaign-description p {
      line-height: 1.7;
      color: #555;
      white-space: pre-line;
      font-size: 15px;
    }

    /* Donation Form */
    .donation-form {
      background-color: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      margin: 30px 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border-left: 4px solid #4caf50;
    }

    .donation-form h2 {
      font-size: 20px;
      color: #4caf50;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 10px;
      font-weight: 500;
      color: #555;
    }

    .form-group input[type="number"],
    .form-group textarea {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 15px;
      transition: border 0.3s, box-shadow 0.3s;
    }

    .form-group input[type="number"]:focus,
    .form-group textarea:focus {
      border-color: #4caf50;
      outline: none;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }

    .checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .checkbox input {
      margin: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .checkbox label {
      margin: 0;
      cursor: pointer;
    }

    .error {
      color: #e53935;
      font-size: 13px;
      margin-top: 6px;
    }

    .donate-button {
      display: inline-block;
      background-color: #4caf50;
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s;
      box-shadow: 0 4px 8px rgba(76, 175, 80, 0.2);
    }

    .donate-button:hover {
      background-color: #388e3c;
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(76, 175, 80, 0.3);
    }

    .donate-button:active {
      transform: translateY(0);
    }

    .donate-button:disabled {
      background-color: #bdbdbd;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    .campaign-closed {
      background-color: #ffebee;
      padding: 20px;
      border-radius: 12px;
      margin: 30px 20px;
      text-align: center;
      border-left: 4px solid #e53935;
    }

    .campaign-closed p {
      color: #e53935;
      font-weight: 500;
      margin: 0;
      font-size: 15px;
    }

    /* Donors Section */
    .donors-section {
      margin-top: 50px;
      padding: 30px 20px;
      background-color: #f8f9fa;
      border-radius: 12px;
    }

    .donors-section h2 {
      font-size: 22px;
      color: #3f51b5;
      margin-bottom: 25px;
      font-weight: 600;
      padding-bottom: 15px;
      border-bottom: 2px solid #e0e0e0;
    }

    .donors-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .donor-card {
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      background-color: #fff;
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .donor-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .donor-info {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }

    .donor-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      background-color: #f0f0f0;
    }

    .donor-name {
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #333;
    }

    .donation-amount {
      color: #4caf50;
      font-weight: 600;
      margin: 0 0 5px 0;
    }

    .donation-date {
      color: #9e9e9e;
      font-size: 12px;
      margin: 0;
    }

    .donor-message {
      margin: 15px 0 0 0;
      padding-top: 15px;
      border-top: 1px solid #eeeeee;
      font-style: italic;
      color: #757575;
      line-height: 1.5;
      font-size: 14px;
    }

    /* Responsive Styles */
    @media (max-width: 900px) {
      .campaign-body {
        grid-template-columns: 1fr;
        gap: 30px;
      }
      
      .campaign-header h1 {
        font-size: 24px;
      }
      
      .donors-list {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .campaign-meta {
        flex-direction: column;
        gap: 10px;
      }
      
      .campaign-meta span {
        display: block;
      }
      
      .donation-form {
        padding: 20px 15px;
        margin: 20px 10px;
      }
      
      .back-button {
        display: block;
        margin-bottom: 15px;
      }
    }
  `]
})
export class CampaignDetailComponent implements OnInit {
  campaignId: string = '';
  campaign: any = null;
  loading: boolean = false;
  error: string | null = null;
  donationForm: FormGroup;
  donationLoading: boolean = false;
  donationSuccess: boolean = false;
  
  // Timestamp for cache-busting
  private timestampCache: number = new Date().getTime();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fundraisingService: FundraisingService,
    private fb: FormBuilder
  ) {
    this.donationForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(10000)]],
      message: [''],
      isAnonymous: [false]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.campaignId = params['id'];
      this.loadCampaignDetails();
    });
  }

  loadCampaignDetails() {
    this.loading = true;
    this.error = null;

    this.fundraisingService.getCampaignById(this.campaignId).subscribe({
      next: (response) => {
        this.campaign = response.data;
        // Make sure image URL is properly set
        if (!this.campaign.image) {
          this.campaign.image = this.getCampaignImageUrl(this.campaign._id);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading campaign details:', error);
        this.error = 'Không thể tải thông tin chiến dịch. Vui lòng thử lại sau.';
        this.loading = false;
      }
    });
  }

  makeDonation() {
    if (this.donationForm.invalid) {
      return;
    }

    const donationData = {
      amount: this.donationForm.get('amount')?.value,
      message: this.donationForm.get('message')?.value,
      isAnonymous: this.donationForm.get('isAnonymous')?.value
    };

    this.donationLoading = true;
    this.fundraisingService.makeDonation(this.campaignId, donationData).subscribe({
      next: (response) => {
        this.donationLoading = false;
        this.donationSuccess = true;
        this.donationForm.reset({
          amount: '',
          message: '',
          isAnonymous: false
        });
        
        // Reload campaign details to show updated donation stats
        this.loadCampaignDetails();
      },
      error: (error) => {
        console.error('Error making donation:', error);
        this.error = 'Có lỗi xảy ra khi quyên góp. Vui lòng thử lại sau.';
        this.donationLoading = false;
      }
    });
  }

  navigateBack() {
    this.router.navigate(['/dashboard/fundraising']);
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
  
  handleImageError($event: Event) {
    const imgElement = $event.target as HTMLImageElement;
    imgElement.src = 'assets/images/default-campaign.png';
    console.log('Image error, replaced with default image');
  }
} 