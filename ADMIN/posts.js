document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentPage = 1;
    let totalPages = 1;
    let currentFilters = {
        privacy: 'all',
        emotion: 'all',
        dateFilter: 'all',
        search: ''
    };

    // Get base API URL (handle case when running from live server)
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api' 
        : '/api';

    // DOM elements
    const postsTableBody = document.getElementById('posts-table-body');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    const privacyFilter = document.getElementById('privacy-filter');
    const emotionFilter = document.getElementById('emotion-filter');
    const dateFilter = document.getElementById('date-filter');
    const filterBtn = document.getElementById('filter-btn');
    const refreshBtn = document.querySelector('.refresh-btn');
    const searchInput = document.getElementById('search-input');

    // Modals
    const viewPostModal = document.getElementById('view-post-modal');
    const editPostModal = document.getElementById('edit-post-modal');
    const deletePostModal = document.getElementById('delete-post-modal');
    const modalCloseButtons = document.querySelectorAll('.close');
    const cancelButtons = document.querySelectorAll('.cancel-btn');

    // Initialize page
    fetchPosts();

    // Event listeners
    filterBtn.addEventListener('click', applyFilters);
    refreshBtn.addEventListener('click', fetchPosts);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    document.getElementById('select-all').addEventListener('change', toggleSelectAll);
    
    // Search functionality
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            currentFilters.search = this.value;
            currentPage = 1;
            fetchPosts();
        }
    });

    // Modal event listeners
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    cancelButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Edit post form submission
    document.getElementById('edit-post-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updatePost();
    });

    // Delete post button
    document.querySelector('#delete-post-modal .delete-btn').addEventListener('click', deletePost);

    // Functions
    function fetchPosts() {
        // Show loading state
        postsTableBody.innerHTML = '<tr><td colspan="12" class="text-center">Loading posts...</td></tr>';
        
        // Prepare query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage);
        queryParams.append('limit', 10);
        
        if (currentFilters.privacy !== 'all') {
            queryParams.append('privacy', currentFilters.privacy);
        }
        
        if (currentFilters.emotion !== 'all') {
            queryParams.append('emotion', currentFilters.emotion);
        }
        
        if (currentFilters.dateFilter !== 'all') {
            queryParams.append('dateFilter', currentFilters.dateFilter);
        }
        
        if (currentFilters.search) {
            queryParams.append('search', currentFilters.search);
        }
        
        // Fetch posts from API
        fetch(`${API_BASE_URL}/admin/posts?${queryParams.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    displayPosts(data.posts);
                    updatePagination(data.currentPage, data.totalPages, data.totalPosts);
                } else {
                    showError('Failed to fetch posts: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error fetching posts:', error);
                showError(`Error connecting to server: ${error.message}. Make sure the backend server is running.`);
            });
    }

    function displayPosts(posts) {
        if (posts.length === 0) {
            postsTableBody.innerHTML = '<tr><td colspan="12" class="text-center">No posts found</td></tr>';
            return;
        }
        
        postsTableBody.innerHTML = '';
        
        posts.forEach(post => {
            const row = document.createElement('tr');
            
            // Format post content (truncate if too long)
            const truncatedContent = post.content.length > 50 
                ? post.content.substring(0, 50) + '...' 
                : post.content;
            
            // Format user name
            const userName = post.user 
                ? `${post.user.firstName} ${post.user.lastName}` 
                : 'Unknown User';
            
            // Format user avatar
            const userAvatar = post.user && post.user.avatarUrl 
                ? post.user.avatarUrl 
                : '/assets/images/default-avatar.png';
            
            // Format media count and thumbnail
            const hasImages = post.imageUrls && post.imageUrls.length > 0;
            const hasVideos = post.videoUrls && post.videoUrls.length > 0;
            const totalMedia = (hasImages ? post.imageUrls.length : 0) + (hasVideos ? post.videoUrls.length : 0);
            
            // Format hashtags
            const hashtagsHTML = post.hashtags && post.hashtags.length > 0
                ? post.hashtags.slice(0, 2).map(tag => `<span class="hashtag-item">#${tag}</span>`).join('')
                : '<span>None</span>';
            
            // Format date
            const createdDate = new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            row.innerHTML = `
                <td><input type="checkbox" class="post-select" data-id="${post._id}"></td>
                <td>${post._id.substring(0, 8)}...</td>
                <td class="post-cell">
                    <img src="${userAvatar}" alt="${userName}">
                    <div>
                        <h4>${userName}</h4>
                    </div>
                </td>
                <td class="post-content">${truncatedContent}</td>
                <td>
                    ${totalMedia > 0 
                        ? `<div class="media-preview">
                            ${hasImages 
                                ? `<img src="${post.imageUrls[0]}" class="media-thumbnail" alt="Post media">` 
                                : hasVideos 
                                    ? `<img src="/assets/images/video-placeholder.png" class="media-thumbnail" alt="Video">` 
                                    : ''}
                            ${totalMedia > 1 ? `<span class="media-count">+${totalMedia - 1}</span>` : ''}
                           </div>`
                        : 'None'}
                </td>
                <td>${hashtagsHTML}</td>
                <td>${post.likes ? post.likes.length : 0}</td>
                <td>${post.comments ? post.comments.length : 0}</td>
                <td><span class="emotion-badge ${post.emotion}">${post.emotion.charAt(0).toUpperCase() + post.emotion.slice(1)}</span></td>
                <td><span class="status ${post.privacy}">${post.privacy.charAt(0).toUpperCase() + post.privacy.slice(1)}</span></td>
                <td>${createdDate}</td>
                <td class="actions">
                    <button class="view" title="View Post" onclick="viewPost('${post._id}')"><i class="fas fa-eye"></i></button>
                    <button class="edit" title="Edit Post" onclick="editPost('${post._id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete" title="Delete Post" onclick="confirmDeletePost('${post._id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            postsTableBody.appendChild(row);
        });
    }

    function updatePagination(page, totalPages, totalPosts) {
        currentPage = page;
        this.totalPages = totalPages;
        
        // Update pagination UI
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages;
        
        // Generate page numbers
        pageNumbersContainer.innerHTML = '';
        
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageSpan = document.createElement('span');
            pageSpan.textContent = i;
            pageSpan.classList.toggle('active', i === currentPage);
            pageSpan.addEventListener('click', () => goToPage(i));
            
            pageNumbersContainer.appendChild(pageSpan);
        }
    }

    function applyFilters() {
        currentFilters.privacy = privacyFilter.value;
        currentFilters.emotion = emotionFilter.value;
        currentFilters.dateFilter = dateFilter.value;
        currentPage = 1;
        fetchPosts();
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            fetchPosts();
        }
    }

    function goToNextPage() {
        if (currentPage < totalPages) {
            currentPage++;
            fetchPosts();
        }
    }

    function goToPage(page) {
        if (page !== currentPage && page >= 1 && page <= totalPages) {
            currentPage = page;
            fetchPosts();
        }
    }

    function toggleSelectAll() {
        const isChecked = this.checked;
        document.querySelectorAll('.post-select').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    }

    function closeAllModals() {
        viewPostModal.style.display = 'none';
        editPostModal.style.display = 'none';
        deletePostModal.style.display = 'none';
    }

    function showError(message) {
        postsTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">${message}</td></tr>`;
    }

    // Make functions available globally
    window.viewPost = function(postId) {
        // Fetch post details
        fetch(`${API_BASE_URL}/admin/posts/${postId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    displayPostDetails(data.post);
                    viewPostModal.style.display = 'block';
                } else {
                    alert('Failed to load post details: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error fetching post details:', error);
                alert(`Error connecting to server: ${error.message}`);
            });
    };

    window.editPost = function(postId) {
        // Fetch post details
        fetch(`${API_BASE_URL}/admin/posts/${postId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Populate edit form
                    document.getElementById('edit-post-id').value = data.post._id;
                    document.getElementById('edit-content').value = data.post.content;
                    document.getElementById('edit-hashtags').value = data.post.hashtags ? data.post.hashtags.join(', ') : '';
                    document.getElementById('edit-privacy').value = data.post.privacy;
                    document.getElementById('edit-emotion').value = data.post.emotion;
                    
                    // Show modal
                    editPostModal.style.display = 'block';
                } else {
                    alert('Failed to load post details: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error fetching post details:', error);
                alert(`Error connecting to server: ${error.message}`);
            });
    };

    window.confirmDeletePost = function(postId) {
        document.getElementById('delete-post-id').value = postId;
        deletePostModal.style.display = 'block';
    };

    function displayPostDetails(post) {
        // Set user info
        document.getElementById('post-user-avatar').src = post.user.avatarUrl || '/assets/images/default-avatar.png';
        document.getElementById('post-user-name').textContent = `${post.user.firstName} ${post.user.lastName}`;
        document.getElementById('post-date').textContent = new Date(post.createdAt).toLocaleString();
        
        // Set post content
        document.getElementById('post-content').textContent = post.content;
        
        // Set post metadata
        document.getElementById('post-likes').textContent = post.likes ? post.likes.length : 0;
        document.getElementById('post-comments-count').textContent = post.comments ? post.comments.length : 0;
        document.getElementById('post-privacy').textContent = post.privacy.charAt(0).toUpperCase() + post.privacy.slice(1);
        document.getElementById('post-emotion').textContent = post.emotion.charAt(0).toUpperCase() + post.emotion.slice(1);
        
        // Set media
        const mediaContainer = document.getElementById('post-media-container');
        mediaContainer.innerHTML = '';
        
        if (post.imageUrls && post.imageUrls.length > 0) {
            post.imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Post image';
                mediaContainer.appendChild(img);
            });
        }
        
        if (post.videoUrls && post.videoUrls.length > 0) {
            post.videoUrls.forEach(url => {
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                mediaContainer.appendChild(video);
            });
        }
        
        // Set hashtags
        const hashtagsContainer = document.getElementById('post-hashtags');
        hashtagsContainer.innerHTML = '';
        
        if (post.hashtags && post.hashtags.length > 0) {
            post.hashtags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'hashtag';
                span.textContent = `#${tag}`;
                hashtagsContainer.appendChild(span);
            });
        } else {
            hashtagsContainer.innerHTML = '<span>No hashtags</span>';
        }
        
        // Set comments
        const commentsContainer = document.getElementById('post-comments-container');
        commentsContainer.innerHTML = '';
        
        if (post.comments && post.comments.length > 0) {
            post.comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment-item';
                
                const commentAvatar = comment.user && comment.user.avatarUrl 
                    ? comment.user.avatarUrl 
                    : '/assets/images/default-avatar.png';
                
                const commentUserName = comment.user 
                    ? `${comment.user.firstName} ${comment.user.lastName}` 
                    : 'Unknown User';
                
                const commentDate = new Date(comment.createdAt).toLocaleString();
                
                commentDiv.innerHTML = `
                    <img src="${commentAvatar}" alt="${commentUserName}">
                    <div class="comment-content">
                        <div class="comment-user">${commentUserName}</div>
                        <div class="comment-text">${comment.text}</div>
                        <div class="comment-date">${commentDate}</div>
                    </div>
                `;
                
                commentsContainer.appendChild(commentDiv);
            });
        } else {
            commentsContainer.innerHTML = '<p>No comments yet</p>';
        }
    }

    function updatePost() {
        const postId = document.getElementById('edit-post-id').value;
        const content = document.getElementById('edit-content').value;
        const hashtags = document.getElementById('edit-hashtags').value;
        const privacy = document.getElementById('edit-privacy').value;
        const emotion = document.getElementById('edit-emotion').value;
        
        // Basic validation
        if (!content.trim()) {
            alert('Post content cannot be empty');
            return;
        }
        
        // Prepare post data
        const postData = {
            content,
            hashtags,
            privacy,
            emotion
        };
        
        // Update post via API
        fetch(`${API_BASE_URL}/admin/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                closeAllModals();
                fetchPosts(); // Refresh posts list
                alert('Post updated successfully');
            } else {
                alert('Failed to update post: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error updating post:', error);
            alert(`Error connecting to server: ${error.message}`);
        });
    }

    function deletePost() {
        const postId = document.getElementById('delete-post-id').value;
        
        // Delete post via API
        fetch(`${API_BASE_URL}/admin/posts/${postId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                closeAllModals();
                fetchPosts(); // Refresh posts list
                alert('Post deleted successfully');
            } else {
                alert('Failed to delete post: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error deleting post:', error);
            alert(`Error connecting to server: ${error.message}`);
        });
    }
}); 