export interface ChatMessage {
  id?: string;
  user_id: string;
  expert_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export const chatService = {
  async getHistory(userId: string, expertId?: string): Promise<ChatMessage[]> {
    try {
      const url = new URL('/api/chat-history', window.location.origin);
      url.searchParams.append('userId', userId);
      if (expertId) {
        url.searchParams.append('expertId', expertId);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch chat history');
      return await response.json();
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  },

  async saveMessage(message: ChatMessage): Promise<boolean> {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: message.user_id,
          expertId: message.expert_id,
          role: message.role,
          content: message.content
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving chat message:', error);
      return false;
    }
  }
};
