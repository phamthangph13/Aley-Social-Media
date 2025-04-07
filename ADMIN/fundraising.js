// DOM Elements
const campaignsTable = document.getElementById('campaigns-body');
const pagination = document.getElementById('pagination');
const donationPagination = document.getElementById('donation-pagination');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const categoryFilter = document.getElementById('category-filter');
const addCampaignBtn = document.getElementById('add-campaign-btn');

// Modals
const campaignModal = document.getElementById('campaign-modal');
const donationModal = document.getElementById('donation-modal');
const addDonationModal = document.getElementById('add-donation-modal');
const confirmModal = document.getElementById('confirm-modal');

// Forms
const campaignForm = document.getElementById('campaign-form');
const donationForm = document.getElementById('donation-form');

// Stats Elements
const totalCampaignsElement = document.getElementById('total-campaigns');
const totalRaisedElement = document.getElementById('total-raised');
const activeCampaignsElement = document.getElementById('active-campaigns');
const avgDonationElement = document.getElementById('avg-donation');

// State Management
let currentPage = 1;
let currentDonationPage = 1;
let itemsPerPage = 10;
let totalCampaigns = 0;
let totalPages = 0;
let currentCampaignId = null;
let currentCampaign = null;
let totalDonations = 0;
let totalDonationPages = 0;
let isEditing = false;
let deleteType = '';
let deleteId = '';

// API Base URL - Updated to point to the correct backend port
const API_URL = 'http://localhost:5000/api/admin';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the page
    loadFundraisingStatistics();
    loadCampaigns();

    // Search functionality
    searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        loadCampaigns();
    }, 500));

    // Filters
    statusFilter.addEventListener('change', () => {
        currentPage = 1;
        loadCampaigns();
    });

    categoryFilter.addEventListener('change', () => {
        currentPage = 1;
        loadCampaigns();
    });

    // Add campaign button
    addCampaignBtn.addEventListener('click', () => {
        openCampaignModal();
    });

    // Campaign form submission
    campaignForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCampaign();
    });

    // Donation form submission
    donationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveDonation();
    });

    // Close modals when clicking on the X or outside the modal
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === campaignModal) {
            closeCampaignModal();
        } else if (e.target === donationModal) {
            closeDonationModal();
        } else if (e.target === addDonationModal) {
            closeAddDonationModal();
        } else if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });

    // Add donation button in donation modal
    document.getElementById('add-donation-btn').addEventListener('click', () => {
        openAddDonationModal();
    });

    // Confirm delete
    document.getElementById('confirm-delete').addEventListener('click', () => {
        confirmDelete();
    });

    document.getElementById('confirm-cancel').addEventListener('click', () => {
        closeConfirmModal();
    });

    // Image preview
    document.getElementById('image').addEventListener('change', handleImagePreview);
});

// Load fundraising statistics
async function loadFundraisingStatistics() {
    try {
        const response = await fetch(`${API_URL}/fundraising-statistics`);
        if (!response.ok) {
            throw new Error('Failed to load statistics');
        }

        const data = await response.json();
        if (data.success) {
            // Update the stats in the UI
            totalCampaignsElement.textContent = data.data.totalCampaigns;
            totalRaisedElement.textContent = `$${formatMoney(data.data.totalRaised)}`;
            activeCampaignsElement.textContent = data.data.activeCampaigns;
            avgDonationElement.textContent = `$${formatMoney(data.data.avgDonation)}`;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        showNotification('Failed to load statistics', 'error');
    }
}

// Load campaigns
async function loadCampaigns() {
    try {
        const searchQuery = searchInput.value;
        const status = statusFilter.value;
        const category = categoryFilter.value;

        const response = await fetch(
            `${API_URL}/fundraising?page=${currentPage}&limit=${itemsPerPage}&search=${searchQuery}&status=${status}&category=${category}`
        );

        if (!response.ok) {
            throw new Error('Failed to load campaigns');
        }

        const data = await response.json();
        if (data.success) {
            renderCampaigns(data.data);
            totalCampaigns = data.pagination.total;
            totalPages = data.pagination.pages;
            renderPagination(pagination, totalPages, currentPage, changePage);
        }
    } catch (error) {
        console.error('Error loading campaigns:', error);
        showNotification('Failed to load campaigns', 'error');
        
        // Show empty state if data can't be loaded
        renderCampaigns([]);
        renderPagination(pagination, 0, 1, changePage);
    }
}

// Render campaigns
function renderCampaigns(campaigns) {
    campaignsTable.innerHTML = '';

    if (!campaigns || campaigns.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="9" class="text-center">No campaigns found</td>
        `;
        campaignsTable.appendChild(row);
        return;
    }

    campaigns.forEach(campaign => {
        const row = document.createElement('tr');
        const statusClass = getStatusClass(campaign);
        const endDate = new Date(campaign.endDate).toLocaleDateString();
        const isEnded = new Date(campaign.endDate) < new Date();
        const status = !campaign.isActive ? 'Inactive' : (isEnded ? 'Ended' : 'Active');

        // Calculate progress percentage
        const percentage = campaign.goal > 0 ? Math.min(100, (campaign.raised / campaign.goal) * 100) : 0;
        
        // Format creator name
        let creatorName = 'N/A';
        if (campaign.createdBy) {
            if (typeof campaign.createdBy === 'object') {
                creatorName = `${campaign.createdBy.firstName || ''} ${campaign.createdBy.lastName || ''}`.trim();
            } else {
                creatorName = `User ID: ${campaign.createdBy}`;
            }
        }

        row.innerHTML = `
            <td class="campaign-cell">
                <img src="${campaign.imageUrl || 'https://via.placeholder.com/50'}" alt="${campaign.title}" class="campaign-image">
                <div class="campaign-details">
                    <h4>${campaign.title}</h4>
                    <p>${truncateText(campaign.description, 50)}</p>
                </div>
            </td>
            <td>${creatorName}</td>
            <td>$${formatMoney(campaign.goal)}</td>
            <td>$${formatMoney(campaign.raised)}</td>
            <td class="progress-cell">
                <div class="progress-bar">
                    <div class="progress" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-percentage">${Math.round(percentage)}%</div>
            </td>
            <td><span class="category-badge">${formatCategory(campaign.category)}</span></td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td>${endDate}</td>
            <td class="actions-cell">
                <button class="btn-view" onclick="viewCampaign('${campaign._id}')"><i class="fas fa-eye"></i></button>
                <button class="btn-edit" onclick="editCampaign('${campaign._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="showDeleteConfirmation('campaign', '${campaign._id}')"><i class="fas fa-trash"></i></button>
                <button class="btn-donations" onclick="openDonationModal('${campaign._id}')"><i class="fas fa-donate"></i></button>
            </td>
        `;

        campaignsTable.appendChild(row);
    });
}

// Get campaign by ID
async function getCampaign(campaignId) {
    try {
        const response = await fetch(`${API_URL}/fundraising/${campaignId}`);
        if (!response.ok) {
            throw new Error('Failed to get campaign');
        }

        const data = await response.json();
        if (data.success) {
            return data.data;
        }
        return null;
    } catch (error) {
        console.error('Error getting campaign:', error);
        showNotification('Failed to get campaign details', 'error');
        return null;
    }
}

// View campaign details
async function viewCampaign(campaignId) {
    const campaign = await getCampaign(campaignId);
    if (campaign) {
        // Implement view logic here
        console.log('Viewing campaign:', campaign);
    } else {
        showNotification('Campaign not found', 'error');
    }
}

// Edit campaign
async function editCampaign(campaignId, viewOnly = false) {
    try {
        const campaign = await getCampaign(campaignId);
        if (!campaign) {
            showNotification('Campaign not found', 'error');
            return;
        }

        currentCampaignId = campaignId;
        isEditing = true;

        // Set form values
        document.getElementById('campaign-id').value = campaignId;
        document.getElementById('title').value = campaign.title;
        document.getElementById('description').value = campaign.description;
        document.getElementById('goal').value = campaign.goal;
        document.getElementById('category').value = campaign.category;
        
        if (campaign.startDate) {
            document.getElementById('start-date').value = formatDateForInput(campaign.startDate);
        }
        
        if (campaign.endDate) {
            document.getElementById('end-date').value = formatDateForInput(campaign.endDate);
        }
        
        if (campaign.createdBy && campaign.createdBy._id) {
            document.getElementById('user-id').value = campaign.createdBy._id;
        }
        
        document.getElementById('is-active').checked = campaign.isActive;

        // Set modal title
        document.getElementById('modal-title').textContent = viewOnly ? 'View Campaign' : 'Edit Campaign';
        
        // Disable form fields if view only
        if (viewOnly) {
            document.querySelectorAll('#campaign-form input, #campaign-form textarea, #campaign-form select').forEach(el => {
                el.disabled = true;
            });
            document.getElementById('save-campaign').style.display = 'none';
        } else {
            document.querySelectorAll('#campaign-form input, #campaign-form textarea, #campaign-form select').forEach(el => {
                el.disabled = false;
            });
            document.getElementById('save-campaign').style.display = 'block';
        }

        // Show the modal
        openCampaignModal();
    } catch (error) {
        console.error('Error editing campaign:', error);
        showNotification('Failed to load campaign details', 'error');
    }
}

// Save campaign
async function saveCampaign() {
    try {
        const campaignId = document.getElementById('campaign-id').value;
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const goal = document.getElementById('goal').value;
        const category = document.getElementById('category').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const userId = document.getElementById('user-id').value;
        const isActive = document.getElementById('is-active').checked;
        
        // Validate required fields
        if (!title || !description || !goal || !endDate) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Create campaign data object
        const campaignData = {
            title,
            description,
            goal: parseFloat(goal),
            category,
            startDate: startDate || new Date().toISOString(),
            endDate,
            isActive
        };
        
        if (userId) {
            campaignData.userId = userId;
        }
        
        // Handle image if selected
        const imageInput = document.getElementById('image');
        if (imageInput.files && imageInput.files[0]) {
            // In a real app, you would upload the image and get a URL
            campaignData.image = await getBase64(imageInput.files[0]);
            campaignData.imageType = imageInput.files[0].type;
        }
        
        // Submit the campaign data
        await submitCampaign(campaignData);
        
        // Close the modal and reload campaigns
        closeCampaignModal();
        loadCampaigns();
        loadFundraisingStatistics();
    } catch (error) {
        console.error('Error saving campaign:', error);
        showNotification('Failed to save campaign', 'error');
    }
}

// Helper function to convert File to base64 string
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

// Submit campaign to API
async function submitCampaign(campaignData) {
    const campaignId = document.getElementById('campaign-id').value;
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${API_URL}/fundraising/${campaignId}` : `${API_URL}/fundraising`;
    
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData)
    });
    
    if (!response.ok) {
        throw new Error('Failed to submit campaign');
    }
    
    const result = await response.json();
    if (result.success) {
        showNotification(isEditing ? 'Campaign updated successfully' : 'Campaign created successfully', 'success');
    } else {
        throw new Error(result.message || 'An error occurred');
    }
}

// Delete campaign
async function deleteCampaign(campaignId) {
    try {
        const response = await fetch(`${API_URL}/fundraising/${campaignId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete campaign');
        }
        
        const result = await response.json();
        if (result.success) {
            showNotification('Campaign deleted successfully', 'success');
            loadCampaigns();
            loadFundraisingStatistics();
        } else {
            throw new Error(result.message || 'An error occurred');
        }
    } catch (error) {
        console.error('Error deleting campaign:', error);
        showNotification('Failed to delete campaign', 'error');
    }
}

// Open donations modal
async function openDonationModal(campaignId) {
    try {
        const campaign = await getCampaign(campaignId);
        if (!campaign) {
            showNotification('Campaign not found', 'error');
            return;
        }
        
        currentCampaignId = campaignId;
        currentCampaign = campaign;
        
        // Set modal title and details
        document.getElementById('donation-modal-title').textContent = `Manage Donations: ${campaign.title}`;
        document.getElementById('donation-campaign-title').textContent = campaign.title;
        document.getElementById('donation-raised').textContent = `$${formatMoney(campaign.raised)}`;
        document.getElementById('donation-goal').textContent = `$${formatMoney(campaign.goal)}`;
        
        // Calculate percentage
        const percentage = campaign.goal > 0 ? Math.min(100, (campaign.raised / campaign.goal) * 100) : 0;
        document.getElementById('donation-progress-bar').style.width = `${percentage}%`;
        document.getElementById('donation-percentage').textContent = `${Math.round(percentage)}%`;
        
        // Load donations
        currentDonationPage = 1;
        await loadDonations(campaignId);
        
        // Show the modal
        donationModal.style.display = 'block';
    } catch (error) {
        console.error('Error opening donation modal:', error);
        showNotification('Failed to load donation details', 'error');
    }
}

// Load donations for a campaign
async function loadDonations(campaignId) {
    try {
        const response = await fetch(`${API_URL}/fundraising/${campaignId}/donations?page=${currentDonationPage}&limit=10`);
        
        if (!response.ok) {
            throw new Error('Failed to load donations');
        }
        
        const data = await response.json();
        if (data.success) {
            renderDonations(data.data);
            totalDonations = data.pagination.total;
            totalDonationPages = data.pagination.pages;
            renderPagination(donationPagination, totalDonationPages, currentDonationPage, changeDonationPage);
        }
    } catch (error) {
        console.error('Error loading donations:', error);
        showNotification('Failed to load donations', 'error');
        
        // Show empty state
        renderDonations([]);
        renderPagination(donationPagination, 0, 1, changeDonationPage);
    }
}

// Render donations
function renderDonations(donations) {
    const donationsTable = document.getElementById('donations-body');
    donationsTable.innerHTML = '';
    
    if (!donations || donations.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center">No donations found</td>
        `;
        donationsTable.appendChild(row);
        return;
    }
    
    donations.forEach(donation => {
        const row = document.createElement('tr');
        
        // Format donor name
        let donorName = 'Anonymous';
        if (!donation.isAnonymous && donation.userId) {
            if (typeof donation.userId === 'object') {
                donorName = `${donation.userId.firstName} ${donation.userId.lastName}`.trim();
            } else {
                donorName = `User ID: ${donation.userId}`;
            }
        }
        
        // Format date
        const donationDate = new Date(donation.date).toLocaleDateString();
        
        row.innerHTML = `
            <td>${donorName}</td>
            <td>$${formatMoney(donation.amount)}</td>
            <td>${donation.message || '-'}</td>
            <td>${donationDate}</td>
            <td>${donation.isAnonymous ? 'Yes' : 'No'}</td>
            <td class="actions-cell">
                <button class="btn-delete" onclick="deleteDonation('${donation._id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        donationsTable.appendChild(row);
    });
}

// Save donation
async function saveDonation() {
    try {
        const amount = document.getElementById('donation-amount').value;
        const message = document.getElementById('donation-message').value;
        const userId = document.getElementById('donation-user-id').value;
        const isAnonymous = document.getElementById('donation-anonymous').checked;
        
        if (!amount || parseFloat(amount) <= 0) {
            showNotification('Please enter a valid donation amount', 'error');
            return;
        }
        
        const donationData = {
            amount: parseFloat(amount),
            message: message || '',
            isAnonymous
        };
        
        if (userId) {
            donationData.userId = userId;
        }
        
        const response = await fetch(`${API_URL}/fundraising/${currentCampaignId}/donations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(donationData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add donation');
        }
        
        const data = await response.json();
        if (data.success) {
            showNotification('Donation added successfully', 'success');
            closeAddDonationModal();
            
            // Update campaign data
            if (data.data) {
                document.getElementById('donation-raised').textContent = `$${formatMoney(data.data.campaignRaised)}`;
                document.getElementById('donation-percentage').textContent = `${data.data.percentageRaised}%`;
                document.getElementById('donation-progress-bar').style.width = `${data.data.percentageRaised}%`;
            }
            
            // Reload donations
            loadDonations(currentCampaignId);
            
            // Reset form
            document.getElementById('donation-form').reset();
        } else {
            throw new Error(data.message || 'Failed to add donation');
        }
    } catch (error) {
        console.error('Error adding donation:', error);
        showNotification('Failed to add donation', 'error');
    }
}

// Delete donation
async function deleteDonation(donationId) {
    try {
        if (!confirm('Are you sure you want to delete this donation?')) {
            return;
        }
        
        const response = await fetch(`${API_URL}/fundraising/${currentCampaignId}/donations/${donationId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete donation');
        }
        
        const data = await response.json();
        if (data.success) {
            showNotification('Donation deleted successfully', 'success');
            
            // Update campaign data
            if (data.data) {
                document.getElementById('donation-raised').textContent = `$${formatMoney(data.data.campaignRaised)}`;
                document.getElementById('donation-percentage').textContent = `${data.data.percentageRaised}%`;
                document.getElementById('donation-progress-bar').style.width = `${data.data.percentageRaised}%`;
            }
            
            // Reload donations
            loadDonations(currentCampaignId);
        } else {
            throw new Error(data.message || 'Failed to delete donation');
        }
    } catch (error) {
        console.error('Error deleting donation:', error);
        showNotification('Failed to delete donation', 'error');
    }
}

// Show delete confirmation
function showDeleteConfirmation(type, id) {
    deleteType = type;
    deleteId = id;
    
    let message = '';
    if (type === 'campaign') {
        message = 'Are you sure you want to delete this campaign? This will also delete all associated donations.';
    } else if (type === 'donation') {
        message = 'Are you sure you want to delete this donation?';
    }
    
    document.getElementById('confirm-message').textContent = message;
    confirmModal.style.display = 'block';
}

// Confirm delete action
function confirmDelete() {
    if (deleteType === 'campaign') {
        deleteCampaign(deleteId);
    } else if (deleteType === 'donation') {
        deleteDonation(deleteId);
    }
    
    closeConfirmModal();
}

// Page navigation functions
function changePage(page) {
    currentPage = page;
    loadCampaigns();
}

function changeDonationPage(page) {
    currentDonationPage = page;
    loadDonations(currentCampaignId);
}

// Render pagination controls
function renderPagination(container, totalPages, currentPage, changePageFn) {
    container.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            changePageFn(currentPage - 1);
        }
    });
    container.appendChild(prevButton);
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4 && totalPages > 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.toggle('active', i === currentPage);
        pageButton.addEventListener('click', () => changePageFn(i));
        container.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            changePageFn(currentPage + 1);
        }
    });
    container.appendChild(nextButton);
}

// Handle image preview
function handleImagePreview(e) {
    const imagePreview = document.getElementById('image-preview');
    imagePreview.innerHTML = '';
    
    if (e.target.files && e.target.files[0]) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(e.target.files[0]);
        img.alt = 'Campaign Image Preview';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '200px';
        imagePreview.appendChild(img);
    }
}

// Modal functions
function openCampaignModal() {
    if (!isEditing) {
        // Reset form for new campaign
        campaignForm.reset();
        document.getElementById('campaign-id').value = '';
        document.getElementById('modal-title').textContent = 'Add New Campaign';
        document.getElementById('image-preview').innerHTML = '';
        
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start-date').value = today;
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('end-date').value = nextMonth.toISOString().split('T')[0];
        
        // Enable form fields
        document.querySelectorAll('#campaign-form input, #campaign-form textarea, #campaign-form select').forEach(el => {
            el.disabled = false;
        });
        document.getElementById('save-campaign').style.display = 'block';
    }
    
    campaignModal.style.display = 'block';
}

function closeCampaignModal() {
    campaignModal.style.display = 'none';
    isEditing = false;
}

function closeDonationModal() {
    donationModal.style.display = 'none';
    currentCampaignId = null;
    currentCampaign = null;
}

function openAddDonationModal() {
    // Reset form
    donationForm.reset();
    addDonationModal.style.display = 'block';
}

function closeAddDonationModal() {
    addDonationModal.style.display = 'none';
}

function closeConfirmModal() {
    confirmModal.style.display = 'none';
}

function closeAllModals() {
    closeCampaignModal();
    closeDonationModal();
    closeAddDonationModal();
    closeConfirmModal();
}

// Utility functions
function formatMoney(amount) {
    return Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function formatCategory(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function getStatusClass(campaign) {
    if (!campaign.isActive) return 'status-inactive';
    return new Date(campaign.endDate) < new Date() ? 'status-ended' : 'status-active';
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

function showNotification(message, type = 'info') {
    // Simple notification display
    alert(`${type.toUpperCase()}: ${message}`);
}

function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
} 