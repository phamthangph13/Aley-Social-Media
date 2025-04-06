// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add active class to the current nav item
    const navItems = document.querySelectorAll('.nav-menu li');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(el => el.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update header title based on nav item
            const headerTitle = document.querySelector('.header-left h1');
            const headerText = this.querySelector('a').textContent.trim();
            headerTitle.textContent = headerText;
        });
    });
    
    // Notification click handler
    const notification = document.querySelector('.notification');
    
    if (notification) {
        notification.addEventListener('click', function() {
            alert('You have 5 unread notifications');
        });
    }
    
    // Logout button click handler
    const logoutButton = document.querySelector('.logout button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                alert('Logged out successfully');
                // In a real application, you would redirect to the login page or perform actual logout
                // window.location.href = 'login.html';
            }
        });
    }
    
    // Search input handler
    const searchInput = document.querySelector('.search-box input');
    
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                alert(`Searching for: ${this.value}`);
                this.value = '';
            }
        });
    }
    
    // Table actions handlers
    const editButtons = document.querySelectorAll('.actions .edit');
    const deleteButtons = document.querySelectorAll('.actions .delete');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const userName = row.querySelector('.user-cell h4').textContent;
            alert(`Edit user: ${userName}`);
        });
    });
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const userName = row.querySelector('.user-cell h4').textContent;
            
            if (confirm(`Are you sure you want to delete user: ${userName}?`)) {
                alert(`User ${userName} deleted successfully`);
                // In a real application, you would make an API call to delete the user
                // After successful deletion, you would remove the row from the table
                // row.remove();
            }
        });
    });
    
    // Mock functionality for view all links
    const viewAllLinks = document.querySelectorAll('.view-all');
    
    viewAllLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionTitle = this.closest('.section-header').querySelector('h2').textContent;
            alert(`View all ${sectionTitle}`);
        });
    });
    
    // Function to create charts (placeholder)
    function initCharts() {
        console.log('Charts would be initialized here with a real chart library');
        // In a real application, you would use a chart library like Chart.js
        // to create visualizations for analytics data
    }
    
    // Call chart initialization
    initCharts();
    
    // Function to toggle sidebar in mobile view
    function setupMobileNav() {
        // This would add a toggle button for mobile view
        // Not implemented in this simple version
    }
    
    // Check if mobile view needs to be set up
    if (window.innerWidth <= 768) {
        setupMobileNav();
    }
    
    // Window resize handler for responsive adjustments
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            setupMobileNav();
        }
    });
    
    // Simulate loading real data (in a real app, this would be an API call)
    function fetchDashboardData() {
        console.log('Fetching dashboard data from API...');
        // Simulate a successful API response
        setTimeout(() => {
            console.log('Dashboard data loaded successfully');
        }, 500);
    }
    
    // Initialize data loading
    fetchDashboardData();
}); 