package test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"nof0-api/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	baseURL  = "http://localhost:8888/api"
	dataPath = "../../mcp/data"
)

// TestDataConsistency validates that API responses match the JSON data files
func TestDataConsistency(t *testing.T) {
	// Skip if server is not running
	if !isServerRunning() {
		t.Skip("Server is not running. Start server with: ./nof0-api -f etc/nof0.yaml")
	}

	t.Run("CryptoPrices", testCryptoPricesConsistency)
	t.Run("Leaderboard", testLeaderboardConsistency)
	t.Run("Trades", testTradesConsistency)
	t.Run("SinceInception", testSinceInceptionConsistency)
	t.Run("AccountTotals", testAccountTotalsConsistency)
	t.Run("Analytics", testAnalyticsConsistency)
	t.Run("ModelAnalytics", testModelAnalyticsConsistency)
	t.Run("Positions", testPositionsConsistency)
	t.Run("Conversations", testConversationsConsistency)
}

func testCryptoPricesConsistency(t *testing.T) {
	// Load from file
	fileData := loadJSONFile[types.CryptoPricesResponse](t, "crypto-prices.json")

	// Get from API
	apiData := getFromAPI[types.CryptoPricesResponse](t, "/crypto-prices")

	// Validate
	assert.Equal(t, len(fileData.Prices), len(apiData.Prices), "Number of prices should match")

	for symbol, filePrice := range fileData.Prices {
		apiPrice, exists := apiData.Prices[symbol]
		require.True(t, exists, "Symbol %s should exist in API response", symbol)
		assert.Equal(t, filePrice.Symbol, apiPrice.Symbol)
		assert.Equal(t, filePrice.Price, apiPrice.Price)
		assert.Equal(t, filePrice.Timestamp, apiPrice.Timestamp)
	}
}

func testLeaderboardConsistency(t *testing.T) {
	fileData := loadJSONFile[types.LeaderboardResponse](t, "leaderboard.json")
	apiData := getFromAPI[types.LeaderboardResponse](t, "/leaderboard")

	assert.Equal(t, len(fileData.Leaderboard), len(apiData.Leaderboard), "Leaderboard count should match")

	// Create map for easier comparison
	fileMap := make(map[string]types.LeaderboardEntry)
	for _, entry := range fileData.Leaderboard {
		fileMap[entry.Id] = entry
	}

	for _, apiEntry := range apiData.Leaderboard {
		fileEntry, exists := fileMap[apiEntry.Id]
		require.True(t, exists, "Model %s should exist in file data", apiEntry.Id)

		assert.Equal(t, fileEntry.NumTrades, apiEntry.NumTrades)
		assert.Equal(t, fileEntry.Sharpe, apiEntry.Sharpe)
		assert.Equal(t, fileEntry.Equity, apiEntry.Equity)
		assert.Equal(t, fileEntry.ReturnPct, apiEntry.ReturnPct)
		assert.Equal(t, fileEntry.NumWins, apiEntry.NumWins)
		assert.Equal(t, fileEntry.NumLosses, apiEntry.NumLosses)
	}
}

func testTradesConsistency(t *testing.T) {
	var fileData struct {
		Trades []types.Trade `json:"trades"`
	}
	loadJSONFileRaw(t, "trades.json", &fileData)

	apiData := getFromAPI[types.TradesResponse](t, "/trades")

	assert.Equal(t, len(fileData.Trades), len(apiData.Trades), "Trades count should match")

	if len(fileData.Trades) > 0 && len(apiData.Trades) > 0 {
		// Validate first trade structure
		fileTrade := fileData.Trades[0]
		apiTrade := apiData.Trades[0]

		assert.Equal(t, fileTrade.Id, apiTrade.Id)
		assert.Equal(t, fileTrade.ModelId, apiTrade.ModelId)
		assert.Equal(t, fileTrade.Symbol, apiTrade.Symbol)
		assert.Equal(t, fileTrade.Side, apiTrade.Side)
		assert.Equal(t, fileTrade.Quantity, apiTrade.Quantity)
		assert.Equal(t, fileTrade.EntryPrice, apiTrade.EntryPrice)
		assert.Equal(t, fileTrade.ExitPrice, apiTrade.ExitPrice)
		assert.Equal(t, fileTrade.RealizedNetPnl, apiTrade.RealizedNetPnl)
	}
}

func testSinceInceptionConsistency(t *testing.T) {
	var fileData struct {
		SinceInceptionValues []types.SinceInceptionValue `json:"sinceInceptionValues"`
	}
	loadJSONFileRaw(t, "since-inception-values.json", &fileData)

	apiData := getFromAPI[types.SinceInceptionResponse](t, "/since-inception-values")

	assert.Equal(t, len(fileData.SinceInceptionValues), len(apiData.SinceInceptionValues),
		"Since inception values count should match")

	// Create map for comparison
	fileMap := make(map[string]types.SinceInceptionValue)
	for _, val := range fileData.SinceInceptionValues {
		fileMap[val.ModelId] = val
	}

	for _, apiVal := range apiData.SinceInceptionValues {
		fileVal, exists := fileMap[apiVal.ModelId]
		require.True(t, exists, "Model %s should exist", apiVal.ModelId)

		assert.Equal(t, fileVal.NavSinceInception, apiVal.NavSinceInception)
		assert.Equal(t, fileVal.InceptionDate, apiVal.InceptionDate)
		assert.Equal(t, fileVal.NumInvocations, apiVal.NumInvocations)
	}
}

func testAccountTotalsConsistency(t *testing.T) {
	var fileData struct {
		AccountTotals        []types.AccountTotal `json:"accountTotals"`
		LastHourlyMarkerRead int                  `json:"lastHourlyMarkerRead"`
	}
	loadJSONFileRaw(t, "account-totals.json", &fileData)

	apiData := getFromAPI[types.AccountTotalsResponse](t, "/account-totals")

	assert.Equal(t, len(fileData.AccountTotals), len(apiData.AccountTotals),
		"Account totals count should match")
	assert.Equal(t, fileData.LastHourlyMarkerRead, apiData.LastHourlyMarkerRead,
		"Last hourly marker should match")

	if len(fileData.AccountTotals) > 0 && len(apiData.AccountTotals) > 0 {
		fileTotal := fileData.AccountTotals[0]
		apiTotal := apiData.AccountTotals[0]

		assert.Equal(t, fileTotal.ModelId, apiTotal.ModelId)
		assert.Equal(t, fileTotal.DollarEquity, apiTotal.DollarEquity)
		assert.Equal(t, fileTotal.RealizedPnl, apiTotal.RealizedPnl)
		assert.Equal(t, len(fileTotal.Positions), len(apiTotal.Positions))
	}
}

func testAnalyticsConsistency(t *testing.T) {
	var fileData struct {
		Analytics []types.ModelAnalytics `json:"analytics"`
	}
	loadJSONFileRaw(t, "analytics.json", &fileData)

	apiData := getFromAPI[types.AnalyticsResponse](t, "/analytics")

	assert.Equal(t, len(fileData.Analytics), len(apiData.Analytics),
		"Analytics count should match")

	// Create map for comparison
	fileMap := make(map[string]types.ModelAnalytics)
	for _, analytics := range fileData.Analytics {
		fileMap[analytics.ModelId] = analytics
	}

	for _, apiAnalytics := range apiData.Analytics {
		fileAnalytics, exists := fileMap[apiAnalytics.ModelId]
		require.True(t, exists, "Model %s should exist", apiAnalytics.ModelId)

		assert.Equal(t, fileAnalytics.UpdatedAt, apiAnalytics.UpdatedAt)
		assert.Equal(t, fileAnalytics.LastTradeExitTime, apiAnalytics.LastTradeExitTime)
	}
}

func testModelAnalyticsConsistency(t *testing.T) {
	modelIds := []string{"qwen3-max", "deepseek-chat-v3.1", "claude-sonnet-4-5",
		"grok-4", "gemini-2.5-pro", "gpt-5"}

	for _, modelId := range modelIds {
		t.Run(modelId, func(t *testing.T) {
			filename := fmt.Sprintf("analytics-%s.json", modelId)

			// Check if file exists
			filePath := filepath.Join(dataPath, filename)
			if _, err := os.Stat(filePath); os.IsNotExist(err) {
				t.Skipf("File %s does not exist", filename)
				return
			}

			var fileData struct {
				Analytics types.ModelAnalytics `json:"analytics"`
			}
			loadJSONFileRaw(t, filename, &fileData)

			apiData := getFromAPI[types.ModelAnalyticsResponse](t, "/analytics/"+modelId)

			assert.Equal(t, fileData.Analytics.ModelId, apiData.Analytics.ModelId)
			assert.Equal(t, fileData.Analytics.UpdatedAt, apiData.Analytics.UpdatedAt)
		})
	}
}

// Helper functions

func isServerRunning() bool {
	resp, err := http.Get(baseURL + "/crypto-prices")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func loadJSONFile[T any](t *testing.T, filename string) T {
	var data T
	loadJSONFileRaw(t, filename, &data)
	return data
}

func loadJSONFileRaw(t *testing.T, filename string, v interface{}) {
	filePath := filepath.Join(dataPath, filename)
	content, err := os.ReadFile(filePath)
	require.NoError(t, err, "Failed to read file %s", filename)

	err = json.Unmarshal(content, v)
	require.NoError(t, err, "Failed to unmarshal file %s", filename)
}

func testPositionsConsistency(t *testing.T) {
	var fileData struct {
		AccountTotals []types.PositionsByModel `json:"accountTotals"`
	}
	loadJSONFileRaw(t, "positions.json", &fileData)

	apiData := getFromAPI[types.PositionsResponse](t, "/positions")

	assert.Equal(t, len(fileData.AccountTotals), len(apiData.AccountTotals),
		"Positions count should match")

	// Create map for easier comparison
	fileMap := make(map[string]types.PositionsByModel)
	for _, modelPos := range fileData.AccountTotals {
		fileMap[modelPos.ModelId] = modelPos
	}

	for _, apiModelPos := range apiData.AccountTotals {
		fileModelPos, exists := fileMap[apiModelPos.ModelId]
		require.True(t, exists, "Model %s should exist in file data", apiModelPos.ModelId)

		assert.Equal(t, len(fileModelPos.Positions), len(apiModelPos.Positions),
			"Position count for %s should match", apiModelPos.ModelId)

		// Validate each position
		for symbol, apiPos := range apiModelPos.Positions {
			filePos, exists := fileModelPos.Positions[symbol]
			require.True(t, exists, "Position for %s should exist in model %s",
				symbol, apiModelPos.ModelId)

			assert.Equal(t, filePos.EntryOid, apiPos.EntryOid)
			assert.Equal(t, filePos.RiskUsd, apiPos.RiskUsd)
			assert.Equal(t, filePos.Confidence, apiPos.Confidence)
			assert.Equal(t, filePos.Symbol, apiPos.Symbol)
			assert.Equal(t, filePos.EntryPrice, apiPos.EntryPrice)
			assert.Equal(t, filePos.Quantity, apiPos.Quantity)
		}
	}
}

func testConversationsConsistency(t *testing.T) {
	var fileData struct {
		Conversations []types.Conversation `json:"conversations"`
	}
	loadJSONFileRaw(t, "conversations.json", &fileData)

	apiData := getFromAPI[types.ConversationsResponse](t, "/conversations")

	assert.Equal(t, len(fileData.Conversations), len(apiData.Conversations),
		"Conversations count should match")

	// Create map for easier comparison
	fileMap := make(map[string]types.Conversation)
	for _, conv := range fileData.Conversations {
		fileMap[conv.ModelId] = conv
	}

	for _, apiConv := range apiData.Conversations {
		fileConv, exists := fileMap[apiConv.ModelId]
		require.True(t, exists, "Conversation for model %s should exist", apiConv.ModelId)

		assert.Equal(t, len(fileConv.Messages), len(apiConv.Messages),
			"Message count for %s should match", apiConv.ModelId)

		// Validate first few messages
		for i := 0; i < len(fileConv.Messages) && i < 3; i++ {
			assert.Equal(t, fileConv.Messages[i].Role, apiConv.Messages[i].Role,
				"Message %d role should match for %s", i, apiConv.ModelId)
			assert.Equal(t, fileConv.Messages[i].Content, apiConv.Messages[i].Content,
				"Message %d content should match for %s", i, apiConv.ModelId)
		}
	}
}

func getFromAPI[T any](t *testing.T, endpoint string) T {
	var data T

	resp, err := http.Get(baseURL + endpoint)
	require.NoError(t, err, "Failed to get %s", endpoint)
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode, "Expected 200 status for %s", endpoint)

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err, "Failed to read response body for %s", endpoint)

	err = json.Unmarshal(body, &data)
	require.NoError(t, err, "Failed to unmarshal response for %s", endpoint)

	return data
}
