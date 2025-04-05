const User = require('../models/user.model');
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Get all conversations for the current user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all conversations where the current user is a participant
    const conversations = await Conversation.find({ participants: userId })
      .populate({
        path: 'participants',
        select: 'firstName lastName avatar avatarType',
        match: { _id: { $ne: userId } } // Only populate other participants
      })
      .populate({
        path: 'lastMessage',
        select: 'text createdAt sender read'
      })
      .sort({ lastMessageTime: -1 }); // Sort by most recent message

    // Format conversation data
    const formattedConversations = conversations.map(conversation => {
      const formattedConversation = conversation.toObject();
      
      // Get the other person in the conversation (for 1-1 chats)
      const otherParticipant = formattedConversation.participants[0];
      
      // Calculate unread status
      let unread = false;
      if (
        formattedConversation.lastMessage && 
        !formattedConversation.lastMessage.read &&
        formattedConversation.lastMessage.sender.toString() !== userId
      ) {
        unread = true;
      }
      
      // Format avatar URL
      let avatarUrl = '/assets/images/default-avatar.png';
      if (otherParticipant && otherParticipant.avatar && otherParticipant.avatarType) {
        avatarUrl = `data:${otherParticipant.avatarType};base64,${otherParticipant.avatar.toString('base64')}`;
      }
      
      // Format time for frontend display
      let lastMessageTime = formattedConversation.lastMessageTime;
      
      if (formattedConversation.lastMessage) {
        lastMessageTime = formattedConversation.lastMessage.createdAt;
      }
      
      // Format the display name
      const displayName = otherParticipant 
        ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
        : 'Unknown User';
      
      return {
        id: formattedConversation._id,
        name: displayName,
        avatar: avatarUrl,
        lastMessage: formattedConversation.lastMessage ? formattedConversation.lastMessage.text : '',
        lastMessageTime: formatMessageTime(lastMessageTime),
        unread,
        isOnline: false, // Would need online status tracking
        userId: otherParticipant ? otherParticipant._id : null
      };
    });

    res.json({
      success: true,
      data: formattedConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải cuộc trò chuyện'
    });
  }
};

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify the conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc trò chuyện'
      });
    }

    // Get messages for the conversation
    const messages = await Message.find({ conversationId })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: 1 });

    // Format message data
    const formattedMessages = messages.map(message => {
      const formattedMessage = message.toObject();
      
      // Đảm bảo senderId luôn là string để dễ so sánh ở frontend
      const senderId = formattedMessage.sender._id.toString();
      
      return {
        id: formattedMessage._id,
        senderId: senderId,
        senderName: `${formattedMessage.sender.firstName} ${formattedMessage.sender.lastName}`,
        text: formattedMessage.text,
        time: formatMessageTime(formattedMessage.createdAt),
        isOutgoing: senderId === userId,
        read: formattedMessage.read
      };
    });

    // Mark all unread messages as read
    await Message.updateMany(
      { 
        conversationId,
        sender: { $ne: userId },
        read: false
      },
      { read: true }
    );

    res.json({
      success: true,
      data: formattedMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải tin nhắn'
    });
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const userId = req.user.id;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn không được để trống'
      });
    }

    // Check if conversation exists and user is a participant
    let conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc trò chuyện'
      });
    }

    // Create and save the new message
    const newMessage = new Message({
      conversationId,
      sender: userId,
      text,
      read: false
    });

    const savedMessage = await newMessage.save();

    // Update conversation with new last message
    conversation.lastMessage = savedMessage._id;
    conversation.lastMessageTime = new Date();
    await conversation.save();

    // Format message for response
    const messageWithSender = await Message.findById(savedMessage._id)
      .populate('sender', 'firstName lastName');

    const formattedMessage = {
      id: messageWithSender._id,
      senderId: userId,
      senderName: `${messageWithSender.sender.firstName} ${messageWithSender.sender.lastName}`,
      text: messageWithSender.text,
      time: formatMessageTime(messageWithSender.createdAt),
      isOutgoing: true,  // Luôn là true vì người gửi là người dùng hiện tại
      read: false
    };

    res.json({
      success: true,
      data: formattedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi gửi tin nhắn'
    });
  }
};

// Create a new conversation
exports.createConversation = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const userId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Người nhận không được để trống'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn không được để trống'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người nhận'
      });
    }

    // Check if conversation already exists between these users
    const existingConversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] }
    });

    let conversation;
    
    if (existingConversation) {
      // Use existing conversation
      conversation = existingConversation;
    } else {
      // Create new conversation
      const newConversation = new Conversation({
        participants: [userId, recipientId]
      });
      
      conversation = await newConversation.save();
    }

    // Create and save the message
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: userId,
      text: message,
      read: false
    });

    const savedMessage = await newMessage.save();

    // Update conversation with last message
    conversation.lastMessage = savedMessage._id;
    conversation.lastMessageTime = new Date();
    await conversation.save();

    // Format conversation for response
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate({
        path: 'participants',
        select: 'firstName lastName avatar avatarType',
        match: { _id: { $ne: userId } }
      });

    const otherParticipant = populatedConversation.participants[0];
    
    let avatarUrl = '/assets/images/default-avatar.png';
    if (otherParticipant && otherParticipant.avatar && otherParticipant.avatarType) {
      avatarUrl = `data:${otherParticipant.avatarType};base64,${otherParticipant.avatar.toString('base64')}`;
    }

    const formattedConversation = {
      id: conversation._id,
      name: otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown User',
      avatar: avatarUrl,
      lastMessage: message,
      lastMessageTime: formatMessageTime(new Date()),
      unread: false,
      isOnline: false,
      userId: otherParticipant._id
    };

    res.json({
      success: true,
      data: {
        conversation: formattedConversation,
        message: {
          id: savedMessage._id,
          senderId: userId,
          senderName: req.user.firstName + ' ' + req.user.lastName,
          text: savedMessage.text,
          time: formatMessageTime(savedMessage.createdAt),
          isOutgoing: true,  // Tin nhắn đầu tiên luôn là outgoing vì người tạo cuộc trò chuyện gửi
          read: false
        }
      }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo cuộc trò chuyện'
    });
  }
};

// Get potential recipients (friends) for new conversation
exports.getPotentialRecipients = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's friends
    const user = await User.findById(userId)
      .populate('friends', 'firstName lastName avatar avatarType')
      .select('friends');

    // Format friend data to include avatarUrl
    const formattedFriends = user.friends.map(friend => {
      const formattedFriend = friend.toObject();
      
      // Calculate avatarUrl
      if (friend.avatar && friend.avatarType) {
        formattedFriend.avatarUrl = `data:${friend.avatarType};base64,${friend.avatar.toString('base64')}`;
      } else {
        formattedFriend.avatarUrl = '/assets/images/default-avatar.png';
      }
      
      // Remove binary data
      delete formattedFriend.avatar;
      delete formattedFriend.avatarType;
      
      return {
        id: formattedFriend._id,
        name: `${formattedFriend.firstName} ${formattedFriend.lastName}`,
        avatar: formattedFriend.avatarUrl
      };
    });

    res.json({
      success: true,
      data: formattedFriends
    });
  } catch (error) {
    console.error('Error fetching potential recipients:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải danh sách bạn bè'
    });
  }
};

// Helper function to format message time for frontend display
function formatMessageTime(date) {
  const now = new Date();
  const messageDate = new Date(date);
  
  // If it's today, show time
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If it's yesterday
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua';
  }
  
  // If it's within this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);
  if (messageDate > oneWeekAgo) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[messageDate.getDay()];
  }
  
  // Just show the date for older messages
  return messageDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
} 