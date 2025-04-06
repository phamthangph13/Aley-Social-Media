const Notification = require('../models/notification.model');
const User = require('../models/user.model');

// Create a new notification
exports.createNotification = async (recipientId, senderId, type, postId = null, commentId = null) => {
  try {
    // Don't create notification if sender is the recipient (self-action)
    if (recipientId.toString() === senderId.toString()) {
      return null;
    }

    const newNotification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      ...(postId && { postId }),
      ...(commentId && { commentId })
    });

    const savedNotification = await newNotification.save();
    
    // Populate sender information for real-time notification
    const populatedNotification = await Notification.findById(savedNotification._id)
      .populate('sender', 'firstName lastName avatar avatarType')
      .populate('postId', 'content');
    
    // Format the notification for socket emission
    let formattedNotification = null;
    if (populatedNotification) {
      formattedNotification = populatedNotification.toObject();
      
      if (populatedNotification.sender && populatedNotification.sender.avatar && populatedNotification.sender.avatarType) {
        formattedNotification.sender.avatarUrl = 
          `data:${populatedNotification.sender.avatarType};base64,${populatedNotification.sender.avatar.toString('base64')}`;
      } else if (populatedNotification.sender) {
        formattedNotification.sender.avatarUrl = '/assets/images/default-avatar.png';
      }
      
      delete formattedNotification.sender.avatar;
      delete formattedNotification.sender.avatarType;
    }
    
    // Access the global io instance that will be attached by server.js
    if (global.io && global.connectedUsers) {
      const recipientSocketId = global.connectedUsers.get(recipientId.toString());
      if (recipientSocketId) {
        global.io.to(recipientSocketId).emit('receiveNotification', formattedNotification);
        console.log(`Sent notification to user ${recipientId} via socket ${recipientSocketId}`);
      }
    }

    return savedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'firstName lastName avatar avatarType')
      .populate('postId', 'content')
      .sort({ createdAt: -1 })
      .limit(50);

    // Format avatar URLs
    const formattedNotifications = notifications.map(notification => {
      if (!notification) return null; // Skip if notification is null
      
      const formattedNotification = notification.toObject();
        
      if (formattedNotification.sender && notification.sender && notification.sender.avatar && notification.sender.avatarType) {
        formattedNotification.sender.avatarUrl = 
          `data:${notification.sender.avatarType};base64,${notification.sender.avatar.toString('base64')}`;
      } else if (formattedNotification.sender) {
        formattedNotification.sender.avatarUrl = '/assets/images/default-avatar.png';
      }
      
      // Only delete properties if sender exists
      if (formattedNotification.sender) {
        delete formattedNotification.sender.avatar;
        delete formattedNotification.sender.avatarType;
      }
      
      return formattedNotification;
    }).filter(notification => notification !== null); // Filter out any null entries
    
    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId,
      read: false 
    });
    
    res.status(200).json({
      notifications: formattedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Failed to get notifications', error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    const notification = await Notification.findOne({ 
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await Notification.countDocuments({ 
      recipient: userId,
      read: false 
    });
    
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({ message: 'Failed to get unread count', error: error.message });
  }
}; 