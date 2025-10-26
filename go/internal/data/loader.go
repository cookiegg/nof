package data

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"nof0-api/internal/types"
)

// DataLoader handles loading JSON data from MCP data files
type DataLoader struct {
	dataPath string
}

func NewDataLoader(dataPath string) *DataLoader {
	return &DataLoader{
		dataPath: dataPath,
	}
}

// LoadCryptoPrices loads crypto prices from JSON file
func (dl *DataLoader) LoadCryptoPrices() (*types.CryptoPricesResponse, error) {
	var response types.CryptoPricesResponse
	err := dl.loadJSONFile("crypto-prices.json", &response)
	return &response, err
}

// LoadAccountTotals loads account totals from JSON file
func (dl *DataLoader) LoadAccountTotals() (*types.AccountTotalsResponse, error) {
	var response types.AccountTotalsResponse
	err := dl.loadJSONFile("account-totals.json", &response)
	if err != nil {
		return nil, err
	}
	response.ServerTime = getCurrentTimestamp()
	return &response, nil
}

// LoadTrades loads trades from JSON file
func (dl *DataLoader) LoadTrades() (*types.TradesResponse, error) {
	var data struct {
		Trades []types.Trade `json:"trades"`
	}
	err := dl.loadJSONFile("trades.json", &data)
	if err != nil {
		return nil, err
	}

	return &types.TradesResponse{
		Trades:     data.Trades,
		ServerTime: getCurrentTimestamp(),
	}, nil
}

// LoadSinceInception loads since inception values from JSON file
func (dl *DataLoader) LoadSinceInception() (*types.SinceInceptionResponse, error) {
	var response types.SinceInceptionResponse
	err := dl.loadJSONFile("since-inception-values.json", &response)
	if err != nil {
		return nil, err
	}
	response.ServerTime = getCurrentTimestamp()
	return &response, nil
}

// LoadLeaderboard loads leaderboard from JSON file
func (dl *DataLoader) LoadLeaderboard() (*types.LeaderboardResponse, error) {
	var response types.LeaderboardResponse
	err := dl.loadJSONFile("leaderboard.json", &response)
	return &response, err
}

// LoadAnalytics loads all analytics from JSON file
func (dl *DataLoader) LoadAnalytics() (*types.AnalyticsResponse, error) {
	var response types.AnalyticsResponse
	err := dl.loadJSONFile("analytics.json", &response)
	if err != nil {
		return nil, err
	}
	response.ServerTime = getCurrentTimestamp()
	return &response, nil
}

// LoadModelAnalytics loads analytics for a specific model
func (dl *DataLoader) LoadModelAnalytics(modelId string) (*types.ModelAnalyticsResponse, error) {
	// Try to load model-specific file first
	var analytics types.ModelAnalytics
	filename := "analytics-" + modelId + ".json"

	var data struct {
		Analytics types.ModelAnalytics `json:"analytics"`
	}

	err := dl.loadJSONFile(filename, &data)
	if err == nil {
		return &types.ModelAnalyticsResponse{
			Analytics:  data.Analytics,
			ServerTime: getCurrentTimestamp(),
		}, nil
	}

	// Fallback to loading from main analytics file
	allAnalytics, err := dl.LoadAnalytics()
	if err != nil {
		return nil, err
	}

	// Find the specific model
	for _, a := range allAnalytics.Analytics {
		if a.ModelId == modelId {
			analytics = a
			return &types.ModelAnalyticsResponse{
				Analytics:  analytics,
				ServerTime: getCurrentTimestamp(),
			}, nil
		}
	}

	// Return empty analytics if not found
	return &types.ModelAnalyticsResponse{
		Analytics: types.ModelAnalytics{
			ModelId: modelId,
		},
		ServerTime: getCurrentTimestamp(),
	}, nil
}

// Helper function to load JSON file
func (dl *DataLoader) loadJSONFile(filename string, v interface{}) error {
	filePath := filepath.Join(dl.dataPath, filename)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// LoadPositions loads positions from JSON file
func (dl *DataLoader) LoadPositions() (*types.PositionsResponse, error) {
	var data struct {
		AccountTotals []types.PositionsByModel `json:"accountTotals"`
	}
	err := dl.loadJSONFile("positions.json", &data)
	if err != nil {
		return nil, err
	}

	return &types.PositionsResponse{
		AccountTotals: data.AccountTotals,
		ServerTime:    getCurrentTimestamp(),
	}, nil
}

// LoadConversations loads conversations from JSON file
func (dl *DataLoader) LoadConversations() (*types.ConversationsResponse, error) {
	var data struct {
		Conversations []types.Conversation `json:"conversations"`
	}
	err := dl.loadJSONFile("conversations.json", &data)
	if err != nil {
		return nil, err
	}

	return &types.ConversationsResponse{
		Conversations: data.Conversations,
		ServerTime:    getCurrentTimestamp(),
	}, nil
}

// getCurrentTimestamp returns current timestamp in milliseconds
func getCurrentTimestamp() int64 {
	return time.Now().UnixMilli()
}
