import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) { }

  // Report a post
  reportPost(postId: string, violationType: string, additionalDetails?: string): Observable<any> {
    return this.http.post(this.apiUrl, {
      postId,
      violationType,
      additionalDetails
    });
  }

  // Get reports made by the current user
  getUserReports(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/user?page=${page}&limit=${limit}`);
  }

  // Get all reports (admin only)
  getAllReports(page: number = 1, limit: number = 10, status?: string): Observable<any> {
    let url = `${this.apiUrl}?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.http.get(url);
  }

  // Update report status (admin only)
  updateReportStatus(reportId: string, status: string, adminNotes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${reportId}`, {
      status,
      adminNotes
    });
  }
} 