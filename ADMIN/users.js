// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // API base URL
    const API_BASE_URL = 'http://localhost:5000/api/admin';
    
    // DOM elements
    const userTableBody = document.querySelector('.user-list tbody');
    const searchInput = document.querySelector('.search-box input');
    const statusFilter = document.getElementById('status-filter');
    const roleFilter = document.getElementById('role-filter');
    const filterBtn = document.getElementById('filter-btn');
    const paginationContainer = document.querySelector('.pagination');
    
    // Current page and filters state
    let currentPage = 1;
    let currentFilters = {
        status: 'all',
        role: 'all',
        search: ''
    };
    
    // Load users on page load
    loadUsers();
    
    // Modal functionality
    const modal = document.getElementById('user-modal');
    const addUserBtn = document.querySelector('.add-user-btn');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const userForm = document.getElementById('user-form');
    
    // Function to open modal
    function openModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    
    // Function to close modal
    function closeModalFunc() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        userForm.reset(); // Reset form when closing
    }
    
    // Add event listeners for modal actions
    if (addUserBtn) {
        addUserBtn.addEventListener('click', openModal);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunc);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModalFunc);
    }
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModalFunc();
        }
    });
    
    // Function to load users from API
    function loadUsers() {
        // Show loading indicator
        userTableBody.innerHTML = '<tr><td colspan="10" class="loading">Loading users...</td></tr>';
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage);
        queryParams.append('limit', 10);
        
        if (currentFilters.status !== 'all') {
            queryParams.append('status', currentFilters.status);
        }
        
        if (currentFilters.role !== 'all') {
            queryParams.append('role', currentFilters.role);
        }
        
        if (currentFilters.search) {
            queryParams.append('search', currentFilters.search);
        }
        
        // Fetch users from API
        fetch(`${API_BASE_URL}/users?${queryParams.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    renderUsers(data.users);
                    renderPagination(data.currentPage, data.totalPages);
                } else {
                    throw new Error(data.message || 'Failed to fetch users');
                }
            })
            .catch(error => {
                console.error('Error loading users:', error);
                userTableBody.innerHTML = `<tr><td colspan="10" class="error">Error: ${error.message}</td></tr>`;
            });
    }
    
    // Function to render users in the table
    function renderUsers(users) {
        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="10" class="no-data">No users found</td></tr>';
            return;
        }
        
        userTableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Format date
            const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            // Create user status badge class with null check
            const statusClass = user.status ? user.status.toLowerCase() : 'unknown';
            const statusText = user.status || 'Unknown';
            
            // Fix avatar URL path
            const avatarUrl = user.profilePicture ? 
                (user.profilePicture.startsWith('http') ? user.profilePicture : `http://localhost:5000/uploads/${user.profilePicture}`) : 
                'https://via.placeholder.com/40';
            
            row.innerHTML = `
                <td><input type="checkbox" class="user-select" data-id="${user._id}"></td>
                <td>#${user._id.slice(-6).toUpperCase()}</td>
                <td class="user-cell">
                    <img src="${avatarUrl}" alt="User" onerror="this.src='https://via.placeholder.com/40'">
                    <div>
                        <h4>${user.firstName} ${user.lastName}</h4>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.postCount || 0}</td>
                <td>${user.role || 'user'}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>${joinedDate}</td>
                <td class="actions">
                    <button class="view" title="View Profile" data-id="${user._id}"><i class="fas fa-eye"></i></button>
                    <button class="edit" title="Edit User" data-id="${user._id}"><i class="fas fa-edit"></i></button>
                    <button class="delete" title="Delete User" data-id="${user._id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            userTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        addActionButtonListeners();
    }
    
    // Function to render pagination
    function renderPagination(currentPage, totalPages) {
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
        loadUsers();
    }
    
    // Function to add event listeners to action buttons
    function addActionButtonListeners() {
        // View user profile
        document.querySelectorAll('.actions .view').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                viewUser(userId);
            });
        });
        
        // Edit user
        document.querySelectorAll('.actions .edit').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                editUser(userId);
            });
        });
        
        // Delete user
        document.querySelectorAll('.actions .delete').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                const userName = this.closest('tr').querySelector('.user-cell h4').textContent;
                deleteUser(userId, userName);
            });
        });
    }
    
    // Function to view user details
    function viewUser(userId) {
        fetch(`${API_BASE_URL}/users/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user details');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Here you would typically open a modal with user details
                    // For now, we'll just alert with some basic info
                    const user = data.user;
                    alert(`User Details:\n
                    Name: ${user.firstName} ${user.lastName}
                    Email: ${user.email}
                    Role: ${user.role}
                    Status: ${user.status}
                    Posts: ${user.postCount}
                    Joined: ${new Date(user.createdAt).toLocaleDateString()}`);
                } else {
                    throw new Error(data.message || 'Failed to fetch user details');
                }
            })
            .catch(error => {
                console.error('Error viewing user:', error);
                alert(`Error: ${error.message}`);
            });
    }
    
    // Function to edit user
    function editUser(userId) {
        fetch(`${API_BASE_URL}/users/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user details');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Here you would open the modal and populate it with user data
                    // For now, we'll just do a simplified version
                    const user = data.user;
                    
                    // Simplified update for demo purposes
                    const newFirstName = prompt('First Name:', user.firstName);
                    const newLastName = prompt('Last Name:', user.lastName);
                    const newEmail = prompt('Email:', user.email);
                    const newRole = prompt('Role (user, moderator, admin):', user.role);
                    
                    if (newFirstName && newLastName && newEmail) {
                        updateUser(userId, {
                            firstName: newFirstName,
                            lastName: newLastName,
                            email: newEmail,
                            role: newRole
                        });
                    }
                } else {
                    throw new Error(data.message || 'Failed to fetch user details');
                }
            })
            .catch(error => {
                console.error('Error editing user:', error);
                alert(`Error: ${error.message}`);
            });
    }
    
    // Function to update user
    function updateUser(userId, userData) {
        fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update user');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('User updated successfully!');
                loadUsers(); // Reload the user list
            } else {
                throw new Error(data.message || 'Failed to update user');
            }
        })
        .catch(error => {
            console.error('Error updating user:', error);
            alert(`Error: ${error.message}`);
        });
    }
    
    // Function to delete user
    function deleteUser(userId, userName) {
        if (confirm(`Are you sure you want to delete user ${userName}?`)) {
            fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete user');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert('User deleted successfully!');
                    loadUsers(); // Reload the user list
                } else {
                    throw new Error(data.message || 'Failed to delete user');
                }
            })
            .catch(error => {
                console.error('Error deleting user:', error);
                alert(`Error: ${error.message}`);
            });
        }
    }
    
    // Form submission handling
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                phone: document.getElementById('phone').value,
                role: document.getElementById('role').value,
                status: document.getElementById('status').value
            };
            
            // Create user via API
            fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to create user');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert('User created successfully!');
                    closeModalFunc();
                    loadUsers(); // Reload the user list
                } else {
                    throw new Error(data.message || 'Failed to create user');
                }
            })
            .catch(error => {
                console.error('Error creating user:', error);
                alert(`Error: ${error.message}`);
            });
        });
    }
    
    // Select all functionality
    const selectAll = document.getElementById('select-all');
    
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            document.querySelectorAll('.user-select').forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    // Filter functionality
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            currentFilters.status = statusFilter.value;
            currentFilters.role = roleFilter.value;
            currentPage = 1; // Reset to first page when filtering
            loadUsers();
        });
    }
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                currentFilters.search = this.value.trim();
                currentPage = 1; // Reset to first page when searching
                loadUsers();
            }
        });
    }
    
    // Bulk actions
    const applyBulkBtn = document.getElementById('apply-bulk');
    
    if (applyBulkBtn) {
        applyBulkBtn.addEventListener('click', function() {
            const bulkAction = document.getElementById('bulk-action').value;
            
            if (!bulkAction) {
                alert('Please select an action to perform');
                return;
            }
            
            const selectedUsers = Array.from(document.querySelectorAll('.user-select:checked'))
                .map(checkbox => checkbox.getAttribute('data-id'));
            
            if (selectedUsers.length === 0) {
                alert('Please select at least one user');
                return;
            }
            
            if (confirm(`Are you sure you want to ${bulkAction} these users?`)) {
                // Handle different bulk actions
                if (bulkAction === 'delete') {
                    Promise.all(selectedUsers.map(userId => 
                        fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' })
                            .then(response => response.json())
                    ))
                    .then(() => {
                        alert(`Successfully deleted ${selectedUsers.length} users`);
                        loadUsers();
                        selectAll.checked = false;
                    })
                    .catch(error => {
                        console.error('Bulk delete error:', error);
                        alert(`Error: ${error.message}`);
                    });
                } else if (['activate', 'deactivate', 'suspend'].includes(bulkAction)) {
                    // Map actions to status values
                    const statusMap = {
                        'activate': 'active',
                        'deactivate': 'inactive',
                        'suspend': 'suspended'
                    };
                    
                    Promise.all(selectedUsers.map(userId => 
                        fetch(`${API_BASE_URL}/users/${userId}/status`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ status: statusMap[bulkAction] })
                        })
                        .then(response => response.json())
                    ))
                    .then(() => {
                        alert(`Successfully ${bulkAction}d ${selectedUsers.length} users`);
                        loadUsers();
                        selectAll.checked = false;
                    })
                    .catch(error => {
                        console.error(`Bulk ${bulkAction} error:`, error);
                        alert(`Error: ${error.message}`);
                    });
                }
            }
        });
    }
}); 