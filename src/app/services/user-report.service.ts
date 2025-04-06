import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserReportService {
  private apiUrl = `${environment.apiUrl}/user-reports`;

  constructor(private http: HttpClient) { }

  // Report a user
  reportUser(userId: string, violationType: string, additionalDetails?: string): Observable<any> {
    return this.http.post(this.apiUrl, {
      userId,
      violationType,
      additionalDetails
    });
  }

  // Get reports made by the current user
  getUserSubmittedReports(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/submitted?page=${page}&limit=${limit}`);
  }

  // Get all reports (admin only)
  getAllUserReports(page: number = 1, limit: number = 10, status?: string): Observable<any> {
    let url = `${this.apiUrl}?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.http.get(url);
  }

  // Update report status (admin only)
  updateUserReportStatus(reportId: string, status: string, adminNotes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${reportId}`, {
      status,
      adminNotes
    });
  }
} 