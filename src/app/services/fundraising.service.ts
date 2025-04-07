import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FundraisingService {
  private apiUrl = `${environment.apiUrl}/fundraising`;

  constructor(private http: HttpClient) { }

  // Get all fundraising campaigns with optional pagination, search and category filters
  getAllCampaigns(page: number = 1, limit: number = 10, search?: string, category?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search) {
      params = params.set('search', search);
    }
    
    if (category) {
      params = params.set('category', category);
    }
    
    return this.http.get(`${this.apiUrl}/campaigns`, { params });
  }

  // Get a specific campaign by ID
  getCampaignById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/campaigns/${id}`);
  }

  // Create a new fundraising campaign
  createCampaign(campaignData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/campaigns`, campaignData);
  }

  // Update an existing campaign
  updateCampaign(id: string, campaignData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/campaigns/${id}`, campaignData);
  }

  // Delete a campaign
  deleteCampaign(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/campaigns/${id}`);
  }

  // Make a donation to a campaign
  makeDonation(campaignId: string, donationData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/campaigns/${campaignId}/donate`, donationData);
  }

  // Get user's created campaigns
  getUserCampaigns(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/campaigns`);
  }

  // Get user's donations
  getUserDonations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/donations`);
  }
} 