import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.loadUserFromLocalStorage();
  }
  
  private loadUserFromLocalStorage() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const userData = JSON.parse(userJson);
        this.currentUserSubject.next(userData);
      } catch (e) {
        console.error('Error parsing user data from localStorage', e);
        localStorage.removeItem('currentUser');
      }
    }
  }
  
  public get currentUserValue() {
    return this.currentUserSubject.value;
  }
  
  public getCurrentUserId(): string {
    const user = this.currentUserValue;
    return user ? user._id : '';
  }
  
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response: any) => {
          if (response.success && response.data) {
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            localStorage.setItem('token', response.data.token);
            this.currentUserSubject.next(response.data.user);
          }
        })
      );
  }
  
  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }
  
  isLoggedIn(): boolean {
    return !!this.currentUserValue && !!localStorage.getItem('token');
  }
  
  refreshCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/current-user`)
      .pipe(
        tap((response: any) => {
          if (response.success && response.data) {
            console.log('User data fetched:', response.data);
            localStorage.setItem('currentUser', JSON.stringify(response.data));
            this.currentUserSubject.next(response.data);
          }
        }),
        catchError(error => {
          console.error('Error refreshing user data', error);
          return of(null);
        })
      );
  }
} 