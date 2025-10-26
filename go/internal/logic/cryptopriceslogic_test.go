package logic

import (
	"context"
	"testing"

	"nof0-api/internal/config"
	"nof0-api/internal/svc"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestServiceContext(t *testing.T) *svc.ServiceContext {
	// Create a test service context with test data path
	cfg := config.Config{}
	cfg.DataPath = "../../../mcp/data"
	return svc.NewServiceContext(cfg)
}

func TestCryptoPrices(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewCryptoPricesLogic(context.Background(), svcCtx)

	resp, err := logic.CryptoPrices()
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate response structure
	assert.NotNil(t, resp.Prices)
	assert.Greater(t, len(resp.Prices), 0, "Should have at least one cryptocurrency price")
	assert.NotZero(t, resp.ServerTime, "ServerTime should be set")

	// Validate all expected cryptocurrencies are present
	expectedCoins := []string{"BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"}
	for _, coin := range expectedCoins {
		price, exists := resp.Prices[coin]
		assert.True(t, exists, "Should have %s price", coin)
		if exists {
			assert.Equal(t, coin, price.Symbol)
			assert.Greater(t, price.Price, 0.0, "%s price should be positive", coin)
			assert.NotZero(t, price.Timestamp)
		}
	}
}

func TestCryptoPricesTypes(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewCryptoPricesLogic(context.Background(), svcCtx)

	resp, err := logic.CryptoPrices()
	require.NoError(t, err)

	// Validate data types
	for symbol, price := range resp.Prices {
		assert.IsType(t, "", price.Symbol, "Symbol should be string")
		assert.IsType(t, float64(0), price.Price, "Price should be float64")
		assert.IsType(t, int64(0), price.Timestamp, "Timestamp should be int64")
		t.Logf("%s: $%.2f at %d", symbol, price.Price, price.Timestamp)
	}
}

func BenchmarkCryptoPrices(b *testing.B) {
	cfg := config.Config{}
	cfg.DataPath = "../../../mcp/data"
	svcCtx := svc.NewServiceContext(cfg)
	logic := NewCryptoPricesLogic(context.Background(), svcCtx)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = logic.CryptoPrices()
	}
}
