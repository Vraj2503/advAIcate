"""
Conversation Summarization Utilities
Generates summaries of conversation history using LLM
"""
from typing import List, Dict, Any, Optional
from groq import Groq
import os

class ConversationSummarizer:
    """Generate summaries of conversations"""
    
    def __init__(self, groq_client: Optional[Groq] = None):
        """
        Initialize the summarizer
        
        Args:
            groq_client: Optional Groq client instance
        """
        self.groq_client = groq_client
        if not self.groq_client:
            api_key = os.getenv("GROQ_API_KEY")
            if api_key:
                self.groq_client = Groq(api_key=api_key)
    
    def summarize_conversation(
        self, 
        messages: List[Dict[str, Any]], 
        summary_type: str = "session"
    ) -> str:
        """
        Generate a summary of a conversation
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            summary_type: Type of summary ('session', 'brief', 'detailed')
            
        Returns:
            Summary text
        """
        if not self.groq_client:
            return self._fallback_summary(messages)
        
        # Build conversation context
        conversation_text = self._format_messages(messages)
        
        # Generate summary based on type
        if summary_type == "brief":
            prompt = self._get_brief_summary_prompt(conversation_text)
            max_tokens = 200
        elif summary_type == "detailed":
            prompt = self._get_detailed_summary_prompt(conversation_text)
            max_tokens = 500
        else:  # session
            prompt = self._get_session_summary_prompt(conversation_text)
            max_tokens = 300
        
        try:
            response = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that creates concise, accurate summaries of legal conversations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama-3.1-8b-instant",
                temperature=0.3,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"Error generating summary with LLM: {e}")
            return self._fallback_summary(messages)
    
    def _format_messages(self, messages: List[Dict[str, Any]]) -> str:
        """Format messages into a readable conversation"""
        formatted = []
        for msg in messages:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            
            if role == 'user':
                formatted.append(f"User: {content}")
            elif role == 'bot' or role == 'assistant':
                formatted.append(f"Assistant: {content}")
        
        return "\n\n".join(formatted)
    
    def _get_session_summary_prompt(self, conversation: str) -> str:
        """Get prompt for session-level summary"""
        return f"""Summarize the following legal assistance conversation in 2-3 sentences. Focus on:
1. The main legal topic or issue discussed
2. Key information provided
3. Any actions or next steps mentioned

Conversation:
{conversation}

Summary:"""
    
    def _get_brief_summary_prompt(self, conversation: str) -> str:
        """Get prompt for brief summary"""
        return f"""Provide a one-sentence summary of this legal conversation's main topic:

{conversation}

Brief summary:"""
    
    def _get_detailed_summary_prompt(self, conversation: str) -> str:
        """Get prompt for detailed summary"""
        return f"""Create a detailed summary of this legal assistance conversation including:
- Main legal topics and questions
- Key facts and information provided
- Important legal concepts explained
- Any recommendations or next steps
- Document references if mentioned

Conversation:
{conversation}

Detailed Summary:"""
    
    def _fallback_summary(self, messages: List[Dict[str, Any]]) -> str:
        """Generate a simple fallback summary without LLM"""
        if not messages:
            return "Empty conversation"
        
        user_messages = [msg for msg in messages if msg.get('role') == 'user']
        
        if not user_messages:
            return "No user messages in conversation"
        
        # Simple extractive summary
        first_user_msg = user_messages[0].get('content', '')[:200]
        msg_count = len(messages)
        
        return f"Conversation with {msg_count} messages. User asked about: {first_user_msg}..."
    
    def generate_title_from_summary(self, summary: str) -> str:
        """
        Generate a short title from a summary
        
        Args:
            summary: The conversation summary
            
        Returns:
            A short title (max 60 characters)
        """
        if not self.groq_client:
            # Fallback: take first N characters
            return summary[:60] + "..." if len(summary) > 60 else summary
        
        try:
            response = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "Generate a short, descriptive title (max 60 characters) for a legal conversation based on its summary."
                    },
                    {
                        "role": "user",
                        "content": f"Generate a title for this conversation summary:\n\n{summary}"
                    }
                ],
                model="llama-3.1-8b-instant",
                temperature=0.3,
                max_tokens=30
            )
            
            title = response.choices[0].message.content.strip()
            # Remove quotes if present
            title = title.strip('"\'')
            
            # Truncate if too long
            return title[:60] + "..." if len(title) > 60 else title
        
        except Exception as e:
            print(f"Error generating title: {e}")
            return summary[:60] + "..." if len(summary) > 60 else summary


# Global instance
_conversation_summarizer = None

def get_conversation_summarizer(groq_client: Optional[Groq] = None) -> ConversationSummarizer:
    """Get or create the global conversation summarizer instance"""
    global _conversation_summarizer
    if _conversation_summarizer is None:
        _conversation_summarizer = ConversationSummarizer(groq_client)
    return _conversation_summarizer
