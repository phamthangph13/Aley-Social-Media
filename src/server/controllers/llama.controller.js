const axios = require('axios');
const config = require('../config');
// const Conversation = require('../models/conversation.model');

/**
 * Handle sending a message to Llama 3 and getting a response
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId, model } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Prepare messages array for Llama API
    const messagesForAI = [
      { role: 'system', content: 'You are a helpful assistant for Aley social media platform users. Provide accurate, concise, and helpful responses.' },
      { role: 'user', content: message }
    ];
    
    // Call Llama API via Groq using the standard structure
    const llama3Response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: model || config.llama.model || 'llama3-70b-8192',
      messages: messagesForAI,
      temperature: config.llama.temperature || 0.7,
      max_completion_tokens: config.llama.maxTokens || 1000,
      top_p: config.llama.top_p || 1,
      stream: false,
      stop: null
    }, {
      headers: {
        'Authorization': `Bearer ${config.llama.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Extract the response
    const aiResponse = llama3Response.data.choices[0].message.content;
    
    // Return the response
    return res.status(200).json({
      reply: aiResponse,
      conversationId: conversationId || 'temp-' + Date.now(),
      model: model || config.llama.model || 'llama3-70b-8192'
    });
    
  } catch (error) {
    console.error('Error in Llama service:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message
    });
  }
};

/**
 * Get conversation history - simple mock implementation
 */
exports.getConversationHistory = async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    // For now, return mock data since we're not storing conversations
    const mockConversation = {
      id: conversationId,
      title: 'Sample conversation',
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date()
    };
    
    const mockMessages = [
      { role: 'user', content: 'Hello there', timestamp: new Date(Date.now() - 3600000) },
      { role: 'assistant', content: 'Hi! How can I help you today?', timestamp: new Date(Date.now() - 3590000) }
    ];
    
    return res.status(200).json({
      conversation: mockConversation,
      messages: mockMessages,
      model: config.llama.model || 'llama3-70b-8192'
    });
    
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
};

/**
 * Get list of conversations - simple mock implementation
 */
exports.getConversations = async (req, res) => {
  try {
    // For now, return mock data since we're not storing conversations
    const mockConversations = [
      { id: 'conv1', title: 'First conversation', createdAt: new Date(Date.now() - 86400000), updatedAt: new Date() },
      { id: 'conv2', title: 'Second conversation', createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 86400000) }
    ];
    
    return res.status(200).json({
      conversations: mockConversations,
      model: config.llama.model || 'llama3-70b-8192'
    });
    
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}; 