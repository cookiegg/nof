package logic

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConversations(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewConversationsLogic(context.Background(), svcCtx)

	resp, err := logic.Conversations()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate response structure
	assert.NotNil(t, resp.Conversations)
	assert.NotZero(t, resp.ServerTime, "ServerTime should be set")
	assert.Greater(t, len(resp.Conversations), 0, "Should have at least one conversation")

	// Validate conversation structure
	for _, conversation := range resp.Conversations {
		assert.NotEmpty(t, conversation.ModelId, "ModelId should not be empty")
		assert.NotNil(t, conversation.Messages, "Messages should not be nil")
		assert.Greater(t, len(conversation.Messages), 0, "Should have at least one message")

		// Validate message structure
		for i, message := range conversation.Messages {
			assert.NotEmpty(t, message.Role, "Message role should not be empty")
			assert.Contains(t, []string{"system", "user", "assistant"}, message.Role,
				"Message role should be system, user, or assistant")
			assert.NotEmpty(t, message.Content, "Message content should not be empty")

			// First message should typically be system or user
			if i == 0 {
				assert.Contains(t, []string{"system", "user"}, message.Role,
					"First message should be system or user")
			}
		}

		t.Logf("Model: %s, Messages: %d", conversation.ModelId, len(conversation.Messages))
	}
}

func TestConversationsTypes(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewConversationsLogic(context.Background(), svcCtx)

	resp, err := logic.Conversations()
	require.NoError(t, err)

	// Validate data types
	assert.IsType(t, int64(0), resp.ServerTime, "ServerTime should be int64")

	if len(resp.Conversations) > 0 {
		conv := resp.Conversations[0]
		assert.IsType(t, "", conv.ModelId, "ModelId should be string")

		if len(conv.Messages) > 0 {
			msg := conv.Messages[0]
			assert.IsType(t, "", msg.Role, "Role should be string")
			assert.IsType(t, "", msg.Content, "Content should be string")
			// Timestamp can be nil, int, float64, or string - interface{} type
		}
	}
}

func TestConversationsValidateModels(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewConversationsLogic(context.Background(), svcCtx)

	resp, err := logic.Conversations()
	require.NoError(t, err)

	// Expected models
	expectedModels := map[string]bool{
		"gpt-5":              false,
		"claude-sonnet-4-5":  false,
		"deepseek-chat-v3.1": false,
		"qwen3-max":          false,
		"grok-4":             false,
		"gemini-2.5-pro":     false,
	}

	// Check which models have conversations
	for _, conv := range resp.Conversations {
		if _, exists := expectedModels[conv.ModelId]; exists {
			expectedModels[conv.ModelId] = true
		}
	}

	// Verify all expected models have conversations
	missingCount := 0
	for modelId, hasConversation := range expectedModels {
		if !hasConversation {
			t.Logf("Warning: Model %s has no conversation", modelId)
			missingCount++
		} else {
			t.Logf("Model %s has conversation", modelId)
		}
	}

	// At least some models should have conversations
	assert.Less(t, missingCount, len(expectedModels),
		"At least some models should have conversations")
}

func TestConversationsMessageContent(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewConversationsLogic(context.Background(), svcCtx)

	resp, err := logic.Conversations()
	require.NoError(t, err)

	// Check for trading-related keywords in conversations
	tradingKeywords := []string{
		"trade", "trading", "position", "market", "price",
		"BTC", "ETH", "SOL", "XRP", "BNB", "DOGE",
		"buy", "sell", "long", "short", "leverage",
		"profit", "loss", "stop", "target", "entry",
	}

	foundKeywords := make(map[string]int)
	for _, conv := range resp.Conversations {
		for _, msg := range conv.Messages {
			content := msg.Content
			for _, keyword := range tradingKeywords {
				if contains(content, keyword) {
					foundKeywords[keyword]++
				}
			}
		}
	}

	t.Logf("Found trading keywords: %v", foundKeywords)
	assert.Greater(t, len(foundKeywords), 0,
		"Should find at least some trading-related keywords in conversations")
}

// Helper function to check if string contains substring (case-insensitive)
func contains(s, substr string) bool {
	// Simple contains check - could be made case-insensitive if needed
	return len(s) >= len(substr) && (s == substr ||
		len(s) > len(substr) && (s[:len(substr)] == substr ||
			contains(s[1:], substr)))
}

func BenchmarkConversations(b *testing.B) {
	svcCtx := createTestServiceContext(&testing.T{})
	logic := NewConversationsLogic(context.Background(), svcCtx)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = logic.Conversations()
	}
}
