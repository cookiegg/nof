package data

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testDataPath = "../../../mcp/data"

func TestNewDataLoader(t *testing.T) {
	loader := NewDataLoader(testDataPath)
	assert.NotNil(t, loader)
	assert.Equal(t, testDataPath, loader.dataPath)
}

func TestLoadCryptoPrices(t *testing.T) {
	loader := NewDataLoader(testDataPath)

	resp, err := loader.LoadCryptoPrices()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate structure
	assert.NotNil(t, resp.Prices)
	assert.Greater(t, len(resp.Prices), 0, "Should have at least one price")
	assert.NotZero(t, resp.ServerTime)

	// Validate expected cryptocurrencies
	expectedCoins := []string{"BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"}
	for _, coin := range expectedCoins {
		price, exists := resp.Prices[coin]
		assert.True(t, exists, "Should have price for %s", coin)
		if exists {
			assert.Equal(t, coin, price.Symbol)
			assert.Greater(t, price.Price, 0.0, "%s price should be positive", coin)
			assert.NotZero(t, price.Timestamp)
		}
	}
}

func TestLoadAccountTotals(t *testing.T) {
	loader := NewDataLoader(testDataPath)

	resp, err := loader.LoadAccountTotals()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate structure
	assert.NotNil(t, resp.AccountTotals)
	assert.Greater(t, len(resp.AccountTotals), 0, "Should have at least one account total")
	assert.NotZero(t, resp.ServerTime)
	assert.GreaterOrEqual(t, resp.LastHourlyMarkerRead, 0)

	// Validate first account total
	if len(resp.AccountTotals) > 0 {
		total := resp.AccountTotals[0]
		assert.NotEmpty(t, total.Id)
		assert.NotEmpty(t, total.ModelId)
		assert.NotZero(t, total.Timestamp)
		// Positions map can be empty or have items
		assert.NotNil(t, total.Positions)
	}
}

func TestLoadTrades(t *testing.T) {
	loader := NewDataLoader(testDataPath)

	resp, err := loader.LoadTrades()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate structure
	assert.NotNil(t, resp.Trades)
	assert.Greater(t, len(resp.Trades), 0, "Should have at least one trade")
	assert.NotZero(t, resp.ServerTime)

	// Validate first trade
	if len(resp.Trades) > 0 {
		trade := resp.Trades[0]
		assert.NotEmpty(t, trade.Id)
		assert.NotEmpty(t, trade.ModelId)
		assert.NotEmpty(t, trade.Symbol)
		assert.NotEmpty(t, trade.Side)
		assert.Greater(t, trade.Quantity, 0.0, "Quantity should be positive")
		assert.Greater(t, trade.EntryPrice, 0.0, "Entry price should be positive")
		assert.Greater(t, trade.ExitPrice, 0.0, "Exit price should be positive")
	}
}

func TestLoadSinceInception(t *testing.T) {
	loader := NewDataLoader(testDataPath)

	resp, err := loader.LoadSinceInception()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate structure
	assert.NotNil(t, resp.SinceInceptionValues)
	assert.Greater(t, len(resp.SinceInceptionValues), 0, "Should have at least one inception value")
	assert.NotZero(t, resp.ServerTime)

	// Validate first value
	if len(resp.SinceInceptionValues) > 0 {
		val := resp.SinceInceptionValues[0]
		assert.NotEmpty(t, val.Id)
		assert.NotEmpty(t, val.ModelId)
		assert.Greater(t, val.NavSinceInception, 0.0, "NAV should be positive")
		assert.NotZero(t, val.InceptionDate)
		assert.GreaterOrEqual(t, val.NumInvocations, 0)
	}
}

func TestLoadLeaderboard(t *testing.T) {
	loader := NewDataLoader(testDataPath)

	resp, err := loader.LoadLeaderboard()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate structure
	assert.NotNil(t, resp.Leaderboard)
	assert.Greater(t, len(resp.Leaderboard), 0, "Should have at least one leaderboard entry")

	// Validate expected models
	expectedModels := []string{"qwen3-max", "deepseek-chat-v3.1", "claude-sonnet-4-5",
		"grok-4", "gemini-2.5-pro", "gpt-5"}

	modelMap := make(map[string]bool)
	for _, entry := range resp.Leaderboard {
		assert.NotEmpty(t, entry.Id)
		assert.GreaterOrEqual(t, entry.NumTrades, 0)
		assert.Greater(t, entry.Equity, 0.0, "Equity should be positive")
		modelMap[entry.Id] = true
	}

	// Check that all expected models are present
	for _, model := range expectedModels {
		assert.True(t, modelMap[model], "Should have entry for %s", model)
	}
}

func TestLoadAnalytics(t *testing.T) {
	loader := NewDataLoader(testDataPath)

	resp, err := loader.LoadAnalytics()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate structure
	assert.NotNil(t, resp.Analytics)
	assert.Greater(t, len(resp.Analytics), 0, "Should have at least one analytics entry")
	assert.NotZero(t, resp.ServerTime)

	// Validate first analytics
	if len(resp.Analytics) > 0 {
		analytics := resp.Analytics[0]
		assert.NotEmpty(t, analytics.Id)
		assert.NotEmpty(t, analytics.ModelId)
		assert.NotZero(t, analytics.UpdatedAt)
	}
}

func TestLoadModelAnalytics(t *testing.T) {
	loader := NewDataLoader(testDataPath)

	testCases := []struct {
		modelId string
		hasFile bool
	}{
		{"qwen3-max", true},
		{"deepseek-chat-v3.1", true},
		{"claude-sonnet-4-5", true},
		{"grok-4", true},
		{"gemini-2.5-pro", true},
		{"gpt-5", true},
		{"nonexistent-model", false},
	}

	for _, tc := range testCases {
		t.Run(tc.modelId, func(t *testing.T) {
			resp, err := loader.LoadModelAnalytics(tc.modelId)

			if tc.hasFile {
				require.NoError(t, err)
				require.NotNil(t, resp)
				assert.NotZero(t, resp.ServerTime)
				assert.Equal(t, tc.modelId, resp.Analytics.ModelId)
			} else {
				// For non-existent models, should still return empty analytics
				// (fallback behavior)
				require.NotNil(t, resp)
				assert.Equal(t, tc.modelId, resp.Analytics.ModelId)
			}
		})
	}
}

func TestLoadNonExistentFile(t *testing.T) {
	loader := NewDataLoader("/nonexistent/path")

	_, err := loader.LoadCryptoPrices()
	assert.Error(t, err, "Should return error for non-existent file")
}

func TestLoadInvalidJSON(t *testing.T) {
	loader := NewDataLoader("../../")

	// Try to load a non-JSON file
	var result interface{}
	err := loader.loadJSONFile("README.md", &result)
	assert.Error(t, err, "Should return error for invalid JSON")
}

// Benchmark tests

func BenchmarkLoadCryptoPrices(b *testing.B) {
	loader := NewDataLoader(testDataPath)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = loader.LoadCryptoPrices()
	}
}

func BenchmarkLoadLeaderboard(b *testing.B) {
	loader := NewDataLoader(testDataPath)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = loader.LoadLeaderboard()
	}
}

func BenchmarkLoadTrades(b *testing.B) {
	loader := NewDataLoader(testDataPath)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = loader.LoadTrades()
	}
}

func BenchmarkLoadAccountTotals(b *testing.B) {
	loader := NewDataLoader(testDataPath)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = loader.LoadAccountTotals()
	}
}

func BenchmarkLoadAnalytics(b *testing.B) {
	loader := NewDataLoader(testDataPath)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = loader.LoadAnalytics()
	}
}
