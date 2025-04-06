// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // API base URL
    const API_BASE_URL = 'http://localhost:5000/api/admin';
    
    // DOM elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const postsReportsTableBody = document.querySelector('#posts-tab .reports-list tbody');
    const usersReportsTableBody = document.querySelector('#users-tab .reports-list tbody');
    const searchInput = document.querySelector('.search-box input');
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');
    const filterBtn = document.getElementById('filter-btn');
    
    // Current page and filters state
    let currentTab = 'posts';
    let currentPage = 1;
    let currentFilters = {
        status: 'all',
        priority: 'all',
        search: ''
    };
    
    // Load reports on page load
    loadReports(currentTab);
    
    // Tab functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get the tab to show
            const tabToShow = this.getAttribute('data-tab');
            currentTab = tabToShow;
            
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show the relevant tab content
            document.getElementById(`${tabToShow}-tab`).classList.add('active');
            
            // Load reports for this tab
            loadReports(tabToShow);
        });
    });
    
    // Function to load reports from API
    function loadReports(tabType) {
        // Get the appropriate table body
        const tableBody = tabType === 'posts' ? postsReportsTableBody : usersReportsTableBody;
        
        // Show loading indicator
        tableBody.innerHTML = '<tr><td colspan="9" class="loading">Loading reports...</td></tr>';
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage);
        queryParams.append('limit', 10);
        
        if (currentFilters.status !== 'all') {
            queryParams.append('status', currentFilters.status);
        }
        
        if (currentFilters.priority !== 'all') {
            queryParams.append('priority', currentFilters.priority);
        }
        
        // Determine the API endpoint based on tab type
        const endpoint = tabType === 'posts' ? 'reports/posts' : 'reports/users';
        
        // Fetch reports from API
        fetch(`${API_BASE_URL}/${endpoint}?${queryParams.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch reports');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    renderReports(tabType, data.reports);
                    renderPagination(data.currentPage, data.totalPages);
                } else {
                    throw new Error(data.message || 'Failed to fetch reports');
                }
            })
            .catch(error => {
                console.error(`Error loading ${tabType} reports:`, error);
                tableBody.innerHTML = `<tr><td colspan="9" class="error">Error: ${error.message}</td></tr>`;
            });
    }
    
    // Function to render reports in the table
    function renderReports(tabType, reports) {
        const tableBody = tabType === 'posts' ? postsReportsTableBody : usersReportsTableBody;
        
        if (reports.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="no-data">No reports found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        reports.forEach(report => {
            const row = document.createElement('tr');
            
            // Format date
            const reportDate = new Date(report.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Add null checks for status and priority
            const status = report.status || 'pending';
            const priority = report.priority || 'medium';
            const statusText = status.charAt(0).toUpperCase() + status.slice(1);
            const priorityText = priority.charAt(0).toUpperCase() + priority.slice(1);
            
            // Generate row HTML based on report type
            if (tabType === 'posts') {
                const postContent = report.post ? report.post.content : 'Post Content Unavailable';
                const reportedBy = report.reportedBy ? 
                    `${report.reportedBy.firstName} ${report.reportedBy.lastName}` : 
                    'Unknown User';
                
                // Get post image if available or use placeholder
                const postImage = report.post && report.post.image ? 
                    `http://localhost:5000/uploads/${report.post.image}` : 
                    'https://via.placeholder.com/40';
                    
                row.innerHTML = `
                    <td><input type="checkbox" class="report-select" data-id="${report._id}"></td>
                    <td>#${report._id.slice(-6).toUpperCase()}</td>
                    <td class="post-cell">
                        <img src="${postImage}" alt="Post Thumbnail" onerror="this.src='https://via.placeholder.com/40'">
                        <div>
                            <h4>${postContent.length > 30 ? postContent.substring(0, 30) + '...' : postContent}</h4>
                            <p>By: ${report.postAuthor || 'Unknown Author'}</p>
                        </div>
                    </td>
                    <td>${reportedBy}</td>
                    <td>${report.violationType || 'Not Specified'}</td>
                    <td>${reportDate}</td>
                    <td><span class="status ${status}">${statusText}</span></td>
                    <td><span class="priority ${priority}">${priorityText}</span></td>
                    <td class="actions">
                        <button class="view" title="View Details" data-id="${report._id}"><i class="fas fa-eye"></i></button>
                        <button class="resolve" title="Resolve Report" data-id="${report._id}" ${status === 'resolved' || status === 'rejected' ? 'disabled' : ''}><i class="fas fa-check"></i></button>
                        <button class="reject" title="Reject Report" data-id="${report._id}" ${status === 'resolved' || status === 'rejected' ? 'disabled' : ''}><i class="fas fa-times"></i></button>
                    </td>
                `;
            } else {
                // User Report row
                const reportedUser = report.reportedUser ? 
                    `${report.reportedUser.firstName} ${report.reportedUser.lastName}` : 
                    'Unknown User';
                const reportedBy = report.reportedBy ? 
                    `${report.reportedBy.firstName} ${report.reportedBy.lastName}` : 
                    'Unknown User';
                
                // Get user avatar if available or use placeholder
                const userAvatar = report.reportedUser && report.reportedUser.profilePicture ? 
                    `http://localhost:5000/uploads/${report.reportedUser.profilePicture}` : 
                    'https://via.placeholder.com/40';
                
                row.innerHTML = `
                    <td><input type="checkbox" class="report-select" data-id="${report._id}"></td>
                    <td>#${report._id.slice(-6).toUpperCase()}</td>
                    <td class="user-cell">
                        <img src="${userAvatar}" alt="User Avatar" onerror="this.src='https://via.placeholder.com/40'">
                        <div>
                            <h4>${reportedUser}</h4>
                            <p>${report.reportedUser ? report.reportedUser.email : 'No Email'}</p>
                        </div>
                    </td>
                    <td>${reportedBy}</td>
                    <td>${report.violationType || 'Not Specified'}</td>
                    <td>${reportDate}</td>
                    <td><span class="status ${status}">${statusText}</span></td>
                    <td><span class="priority ${priority}">${priorityText}</span></td>
                    <td class="actions">
                        <button class="view" title="View Details" data-id="${report._id}"><i class="fas fa-eye"></i></button>
                        <button class="resolve" title="Resolve Report" data-id="${report._id}" ${status === 'resolved' || status === 'rejected' ? 'disabled' : ''}><i class="fas fa-check"></i></button>
                        <button class="reject" title="Reject Report" data-id="${report._id}" ${status === 'resolved' || status === 'rejected' ? 'disabled' : ''}><i class="fas fa-times"></i></button>
                    </td>
                `;
            }
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        addActionButtonListeners(tabType);
    }
    
    // Function to render pagination
    function renderPagination(currentPage, totalPages) {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.classList.add('page-btn');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        if (!prevButton.disabled) {
            prevButton.addEventListener('click', () => {
                goToPage(currentPage - 1);
            });
        }
        paginationContainer.appendChild(prevButton);
        
        // Page buttons
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.classList.add('page-btn');
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                goToPage(i);
            });
            paginationContainer.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.classList.add('page-btn');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        if (!nextButton.disabled) {
            nextButton.addEventListener('click', () => {
                goToPage(currentPage + 1);
            });
        }
        paginationContainer.appendChild(nextButton);
    }
    
    // Function to navigate to a specific page
    function goToPage(page) {
        currentPage = page;
        loadReports(currentTab);
    }
    
    // Add event listeners to action buttons
    function addActionButtonListeners(tabType) {
        // View report details
        document.querySelectorAll(`#${tabType}-tab .actions .view`).forEach(button => {
            button.addEventListener('click', function() {
                const reportId = this.getAttribute('data-id');
                viewReport(reportId, tabType);
            });
        });
        
        // Resolve report
        document.querySelectorAll(`#${tabType}-tab .actions .resolve:not([disabled])`).forEach(button => {
            button.addEventListener('click', function() {
                const reportId = this.getAttribute('data-id');
                updateReportStatus(reportId, 'resolved', tabType);
            });
        });
        
        // Reject report
        document.querySelectorAll(`#${tabType}-tab .actions .reject:not([disabled])`).forEach(button => {
            button.addEventListener('click', function() {
                const reportId = this.getAttribute('data-id');
                updateReportStatus(reportId, 'rejected', tabType);
            });
        });
    }
    
    // Function to view report details
    function viewReport(reportId, tabType) {
        const endpoint = tabType === 'posts' ? 'reports/posts' : 'reports/users';
        
        fetch(`${API_BASE_URL}/${endpoint}/${reportId}`)
            .then(response => {
                if (!response.ok) {
                    // If endpoint doesn't exist, we'll fake it for now by getting all reports and finding this one
                    return fetch(`${API_BASE_URL}/${endpoint}`)
                        .then(res => res.json())
                        .then(data => {
                            const report = data.reports.find(r => r._id === reportId);
                            if (report) {
                                return { success: true, report };
                            } else {
                                throw new Error('Report not found');
                            }
                        });
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.report) {
                    openReportModal(data.report, tabType);
                } else {
                    throw new Error(data.message || 'Failed to fetch report details');
                }
            })
            .catch(error => {
                console.error('Error viewing report:', error);
                alert(`Error: ${error.message}`);
                
                // For demo purposes, if the API endpoint is not implemented, show mock data
                const mockReport = {
                    _id: reportId,
                    status: 'pending',
                    priority: 'high',
                    violationType: 'Inappropriate Content',
                    additionalDetails: 'This is a mock report for demonstration purposes.',
                    createdAt: new Date().toISOString()
                };
                
                if (tabType === 'posts') {
                    mockReport.post = { content: 'Sample post content' };
                    mockReport.reportedBy = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
                } else {
                    mockReport.reportedUser = { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' };
                    mockReport.reportedBy = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
                }
                
                openReportModal(mockReport, tabType);
            });
    }
    
    // Function to update report status
    function updateReportStatus(reportId, status, tabType) {
        const endpoint = tabType === 'posts' ? 'reports/posts' : 'reports/users';
        
        if (confirm(`Are you sure you want to mark this report as ${status}?`)) {
            fetch(`${API_BASE_URL}/${endpoint}/${reportId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to update report status to ${status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert(`Report has been ${status} successfully!`);
                    loadReports(currentTab);
                } else {
                    throw new Error(data.message || `Failed to update report status to ${status}`);
                }
            })
            .catch(error => {
                console.error('Error updating report status:', error);
                alert(`Error: ${error.message}`);
                
                // For demo purposes, if the API fails, simulate a successful update
                setTimeout(() => {
                    loadReports(currentTab);
                }, 500);
            });
        }
    }
    
    // Modal functionality
    const modal = document.getElementById('report-details-modal');
    const closeModal = document.querySelector('.close-modal');
    
    // Function to open modal with report details
    function openReportModal(reportData, tabType) {
        // Set report type
        reportData.type = tabType;
        
        // Add null checks for status and priority
        const status = reportData.status || 'pending';
        const priority = reportData.priority || 'medium';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        const priorityText = priority.charAt(0).toUpperCase() + priority.slice(1);
        
        // Populate the modal with report data
        document.getElementById('report-id').textContent = `#${reportData._id.slice(-6).toUpperCase()}`;
        document.getElementById('report-date').textContent = new Date(reportData.createdAt).toLocaleString();
        
        // Update status
        const statusElement = document.getElementById('report-status');
        statusElement.textContent = statusText;
        statusElement.className = `status ${status}`;
        
        // Update priority
        const priorityElement = document.getElementById('report-priority');
        priorityElement.textContent = priorityText;
        priorityElement.className = `priority ${priority}`;
        
        // Update other data
        const reportedBy = reportData.reportedBy ? 
            `${reportData.reportedBy.firstName} ${reportData.reportedBy.lastName}` : 
            'Unknown User';
        document.getElementById('reporter-name').textContent = reportedBy;
        document.getElementById('report-reason').textContent = reportData.violationType || 'Not Specified';
        document.getElementById('report-description').textContent = reportData.additionalDetails || 'No additional details provided.';
        
        // Set selected values in dropdowns
        document.getElementById('update-status').value = reportData.status;
        document.getElementById('update-priority').value = reportData.priority || 'medium';
        
        // Populate content preview based on report type
        const contentPreview = document.getElementById('content-preview');
        
        if (tabType === 'posts') {
            // Post report preview
            const postContent = reportData.post ? reportData.post.content : 'Post content unavailable';
            const postAuthor = reportData.postAuthor || 'Unknown Author';
            
            // Get post author avatar if available
            const authorAvatar = reportData.post && reportData.post.user && reportData.post.user.profilePicture ? 
                `http://localhost:5000/uploads/${reportData.post.user.profilePicture}` : 
                'https://via.placeholder.com/40';
            
            // Get post image if available
            const postImage = reportData.post && reportData.post.image ? 
                `<img src="http://localhost:5000/uploads/${reportData.post.image}" alt="Post Image" onerror="this.src='https://via.placeholder.com/500x300'">` : 
                '';
            
            contentPreview.innerHTML = `
                <div class="post-preview">
                    <div class="post-preview-header">
                        <img src="${authorAvatar}" alt="User" onerror="this.src='https://via.placeholder.com/40'">
                        <div>
                            <h4>${postAuthor}</h4>
                            <span class="post-date">${new Date(reportData.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="post-preview-content">
                        <p>${postContent}</p>
                        ${postImage}
                    </div>
                </div>
            `;
        } else {
            // User report preview
            const reportedUser = reportData.reportedUser ? 
                `${reportData.reportedUser.firstName} ${reportData.reportedUser.lastName}` : 
                'Unknown User';
            const userEmail = reportData.reportedUser ? reportData.reportedUser.email : 'No email available';
            
            // Get user avatar if available
            const userAvatar = reportData.reportedUser && reportData.reportedUser.profilePicture ? 
                `http://localhost:5000/uploads/${reportData.reportedUser.profilePicture}` : 
                'https://via.placeholder.com/60';
            
            contentPreview.innerHTML = `
                <div class="user-preview">
                    <div class="user-preview-header">
                        <img src="${userAvatar}" alt="User" onerror="this.src='https://via.placeholder.com/60'">
                        <div>
                            <h4>${reportedUser}</h4>
                            <p>${userEmail}</p>
                            <span class="user-status active">Active</span>
                        </div>
                    </div>
                    <div class="user-preview-details">
                        <div class="detail-item">
                            <span class="label">Joined:</span>
                            <span class="value">${reportData.reportedUser && reportData.reportedUser.createdAt ? 
                                new Date(reportData.reportedUser.createdAt).toLocaleDateString() : 
                                'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Reports Filed Against:</span>
                            <span class="value">${reportData.reportCount || '1'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add event listeners for report actions in modal
        setupModalActionListeners(reportData);
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    
    // Function to close modal
    function closeModalFunc() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Close modal event
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunc);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModalFunc();
        }
    });
    
    // Setup modal action listeners
    function setupModalActionListeners(reportData) {
        const resolveBtn = document.querySelector('.resolve-btn');
        const rejectBtn = document.querySelector('.reject-btn');
        const updateStatusSelect = document.getElementById('update-status');
        const updatePrioritySelect = document.getElementById('update-priority');
        
        // Add null checks
        const status = reportData.status || 'pending';
        const priority = reportData.priority || 'medium';
        
        // Set dropdown initial values
        if (updateStatusSelect) updateStatusSelect.value = status;
        if (updatePrioritySelect) updatePrioritySelect.value = priority;
        
        // Resolve button in modal
        if (resolveBtn) {
            resolveBtn.onclick = function() {
                updateReportStatus(reportData._id, 'resolved', reportData.type);
                closeModalFunc();
            };
        }
        
        // Reject button in modal
        if (rejectBtn) {
            rejectBtn.onclick = function() {
                updateReportStatus(reportData._id, 'rejected', reportData.type);
                closeModalFunc();
            };
        }
        
        // Status dropdown in modal
        if (updateStatusSelect) {
            updateStatusSelect.onchange = function() {
                const newStatus = this.value;
                updateReportStatus(reportData._id, newStatus, reportData.type);
                
                // Update displayed status in modal
                const statusElement = document.getElementById('report-status');
                statusElement.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                statusElement.className = `status ${newStatus}`;
            };
        }
        
        // Priority dropdown in modal
        if (updatePrioritySelect) {
            updatePrioritySelect.onchange = function() {
                const newPriority = this.value;
                const endpoint = reportData.type === 'posts' ? 'reports/posts' : 'reports/users';
                
                fetch(`${API_BASE_URL}/${endpoint}/${reportData._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ priority: newPriority })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update priority');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Update displayed priority in modal
                        const priorityElement = document.getElementById('report-priority');
                        priorityElement.textContent = newPriority.charAt(0).toUpperCase() + newPriority.slice(1);
                        priorityElement.className = `priority ${newPriority}`;
                    } else {
                        throw new Error(data.message || 'Failed to update priority');
                    }
                })
                .catch(error => {
                    console.error('Error updating priority:', error);
                    
                    // For demo purposes, update UI even if API fails
                    const priorityElement = document.getElementById('report-priority');
                    priorityElement.textContent = newPriority.charAt(0).toUpperCase() + newPriority.slice(1);
                    priorityElement.className = `priority ${newPriority}`;
                });
            };
        }
    }
    
    // Filter functionality
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            currentFilters.status = statusFilter.value;
            currentFilters.priority = priorityFilter.value;
            currentPage = 1; // Reset to first page when filtering
            loadReports(currentTab);
        });
    }
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                currentFilters.search = this.value.trim();
                currentPage = 1; // Reset to first page when searching
                loadReports(currentTab);
            }
        });
    }
    
    // Export reports functionality
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            const tabType = currentTab;
            const endpoint = tabType === 'posts' ? 'reports/posts' : 'reports/users';
            
            // Build query parameters (get all reports for export)
            const queryParams = new URLSearchParams();
            if (currentFilters.status !== 'all') {
                queryParams.append('status', currentFilters.status);
            }
            if (currentFilters.priority !== 'all') {
                queryParams.append('priority', currentFilters.priority);
            }
            if (currentFilters.search) {
                queryParams.append('search', currentFilters.search);
            }
            
            // In a real application, this would be an API call to get a CSV/Excel file
            alert(`Exporting ${tabType} reports with filters: ${queryParams.toString() || 'none'}`);
        });
    }
}); 