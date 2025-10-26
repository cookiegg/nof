package data

import "nof0-api/internal/types"

// DataSource abstracts how data is loaded. It can be backed by files, DB, etc.
type DataSource interface {
	LoadCryptoPrices() (*types.CryptoPricesResponse, error)
	LoadAccountTotals() (*types.AccountTotalsResponse, error)
	LoadTrades() (*types.TradesResponse, error)
	LoadSinceInception() (*types.SinceInceptionResponse, error)
	LoadLeaderboard() (*types.LeaderboardResponse, error)
	LoadAnalytics() (*types.AnalyticsResponse, error)
	LoadModelAnalytics(modelId string) (*types.ModelAnalyticsResponse, error)
	LoadPositions() (*types.PositionsResponse, error)
	LoadConversations() (*types.ConversationsResponse, error)
}

// Ensure DataLoader implements DataSource
var _ DataSource = (*DataLoader)(nil)
