import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../services/profile.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule]
})
export class ProfileComponent implements OnInit {
  profile: any = null;
  isLoading = true;
  error: string | null = null;
  isEditing = false;
  profileForm: FormGroup;
  avatarFile: File | null = null;
  coverImageFile: File | null = null;
  
  constructor(
    private profileService: ProfileService,
    private fb: FormBuilder
  ) { 
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      bio: [''],
      location: [''],
      website: [''],
      phoneNumber: [''],
      interests: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.isLoading = false;
        
        // Update form with profile data
        this.profileForm.patchValue({
          firstName: this.profile.firstName,
          lastName: this.profile.lastName,
          bio: this.profile.bio,
          location: this.profile.location,
          website: this.profile.website,
          phoneNumber: this.profile.phoneNumber,
          interests: this.profile.interests ? this.profile.interests.join(', ') : ''
        });
      },
      error: (err) => {
        this.error = 'Could not load profile data';
        this.isLoading = false;
        console.error('Error loading profile:', err);
      }
    });
  }
  
  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    
    if (!this.isEditing) {
      // Reset form when canceling edit
      this.profileForm.patchValue({
        firstName: this.profile.firstName,
        lastName: this.profile.lastName,
        bio: this.profile.bio,
        location: this.profile.location,
        website: this.profile.website,
        phoneNumber: this.profile.phoneNumber,
        interests: this.profile.interests ? this.profile.interests.join(', ') : ''
      });
    }
  }
  
  saveProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }
    
    const formValues = this.profileForm.value;
    
    // Convert interests from comma-separated string to array
    const profileData = {
      ...formValues,
      interests: formValues.interests ? 
        formValues.interests.split(',').map((interest: string) => interest.trim()) : 
        []
    };
    
    this.profileService.updateProfile(profileData).subscribe({
      next: (data) => {
        this.profile = data;
        this.isEditing = false;
      },
      error: (err) => {
        this.error = 'Could not update profile';
        console.error('Error updating profile:', err);
      }
    });
  }
  
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.avatarFile = input.files[0];
      this.uploadAvatar();
    }
  }
  
  uploadAvatar(): void {
    if (!this.avatarFile) return;
    
    this.profileService.updateAvatar(this.avatarFile).subscribe({
      next: (data) => {
        this.profile.avatarUrl = data.avatarUrl;
        this.avatarFile = null;
      },
      error: (err) => {
        this.error = 'Could not upload avatar';
        console.error('Error uploading avatar:', err);
      }
    });
  }
  
  removeAvatar(): void {
    this.profileService.deleteAvatar().subscribe({
      next: (data) => {
        this.profile.avatarUrl = data.avatarUrl;
      },
      error: (err) => {
        this.error = 'Could not remove avatar';
        console.error('Error removing avatar:', err);
      }
    });
  }
  
  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.coverImageFile = input.files[0];
      this.uploadCoverImage();
    }
  }
  
  uploadCoverImage(): void {
    if (!this.coverImageFile) return;
    
    this.profileService.updateCoverImage(this.coverImageFile).subscribe({
      next: (data) => {
        this.profile.coverImageUrl = data.coverImageUrl;
        this.coverImageFile = null;
      },
      error: (err) => {
        this.error = 'Could not upload cover image';
        console.error('Error uploading cover image:', err);
      }
    });
  }
  
  removeCoverImage(): void {
    this.profileService.deleteCoverImage().subscribe({
      next: (data) => {
        this.profile.coverImageUrl = data.coverImageUrl;
      },
      error: (err) => {
        this.error = 'Could not remove cover image';
        console.error('Error removing cover image:', err);
      }
    });
  }
} 