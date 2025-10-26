package logic

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"nof0-api/internal/types"
)

func TestPositions(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewPositionsLogic(context.Background(), svcCtx)

	req := &types.PositionsRequest{
		Limit: 1000,
	}

	resp, err := logic.Positions(req)
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Validate response structure
	assert.NotNil(t, resp.AccountTotals)
	assert.NotZero(t, resp.ServerTime, "ServerTime should be set")
	assert.Greater(t, len(resp.AccountTotals), 0, "Should have at least one model with positions")

	// Validate each model's positions
	for _, modelPositions := range resp.AccountTotals {
		assert.NotEmpty(t, modelPositions.ModelId, "ModelId should not be empty")
		assert.NotNil(t, modelPositions.Positions, "Positions map should not be nil")

		// Validate position structure for each symbol
		for symbol, position := range modelPositions.Positions {
			assert.NotEmpty(t, symbol, "Symbol should not be empty")
			assert.Equal(t, symbol, position.Symbol, "Symbol in key should match position.Symbol")
			assert.NotZero(t, position.EntryOid, "EntryOid should be set")
			assert.Greater(t, position.RiskUsd, 0.0, "RiskUsd should be positive")
			assert.GreaterOrEqual(t, position.Confidence, 0.0, "Confidence should be >= 0")
			assert.LessOrEqual(t, position.Confidence, 1.0, "Confidence should be <= 1")
			assert.NotZero(t, position.EntryTime, "EntryTime should be set")
			assert.Greater(t, position.EntryPrice, 0.0, "EntryPrice should be positive")
			assert.Greater(t, position.Margin, 0.0, "Margin should be positive")
			assert.Greater(t, position.Leverage, 0.0, "Leverage should be positive")
			assert.NotZero(t, position.Quantity, "Quantity should not be zero")
			assert.Greater(t, position.CurrentPrice, 0.0, "CurrentPrice should be positive")

			t.Logf("Model: %s, Symbol: %s, Entry: %.2f, Current: %.2f, Quantity: %.4f, UnrealizedPnl: %.2f",
				modelPositions.ModelId, symbol, position.EntryPrice, position.CurrentPrice,
				position.Quantity, position.UnrealizedPnl)
		}
	}
}

func TestPositionsTypes(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewPositionsLogic(context.Background(), svcCtx)

	req := &types.PositionsRequest{Limit: 1000}
	resp, err := logic.Positions(req)
	require.NoError(t, err)

	// Validate data types
	assert.IsType(t, int64(0), resp.ServerTime, "ServerTime should be int64")
	assert.IsType(t, []types.PositionsByModel{}, resp.AccountTotals, "AccountTotals should be slice")

	if len(resp.AccountTotals) > 0 {
		modelPos := resp.AccountTotals[0]
		assert.IsType(t, "", modelPos.ModelId, "ModelId should be string")
		assert.IsType(t, map[string]types.Position{}, modelPos.Positions, "Positions should be map")

		for _, pos := range modelPos.Positions {
			assert.IsType(t, int64(0), pos.EntryOid, "EntryOid should be int64")
			assert.IsType(t, float64(0), pos.RiskUsd, "RiskUsd should be float64")
			assert.IsType(t, float64(0), pos.Confidence, "Confidence should be float64")
			assert.IsType(t, float64(0), pos.EntryTime, "EntryTime should be float64")
			assert.IsType(t, "", pos.Symbol, "Symbol should be string")
			assert.IsType(t, float64(0), pos.EntryPrice, "EntryPrice should be float64")
			assert.IsType(t, float64(0), pos.Margin, "Margin should be float64")
			assert.IsType(t, float64(0), pos.Leverage, "Leverage should be float64")
			assert.IsType(t, float64(0), pos.Quantity, "Quantity should be float64")
			assert.IsType(t, float64(0), pos.CurrentPrice, "CurrentPrice should be float64")
			assert.IsType(t, float64(0), pos.UnrealizedPnl, "UnrealizedPnl should be float64")
			break
		}
	}
}

func TestPositionsValidateModels(t *testing.T) {
	svcCtx := createTestServiceContext(t)
	logic := NewPositionsLogic(context.Background(), svcCtx)

	req := &types.PositionsRequest{Limit: 1000}
	resp, err := logic.Positions(req)
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

	// Check which models have positions
	for _, modelPos := range resp.AccountTotals {
		if _, exists := expectedModels[modelPos.ModelId]; exists {
			expectedModels[modelPos.ModelId] = true
		}
	}

	// Log which models have positions
	for modelId, hasPositions := range expectedModels {
		if hasPositions {
			t.Logf("Model %s has positions", modelId)
		} else {
			t.Logf("Model %s has no positions (this is OK)", modelId)
		}
	}
}

func BenchmarkPositions(b *testing.B) {
	cfg := createTestServiceContext(&testing.T{}).Config
	svcCtx := createTestServiceContext(&testing.T{})
	logic := NewPositionsLogic(context.Background(), svcCtx)
	req := &types.PositionsRequest{Limit: 1000}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = logic.Positions(req)
	}
	_ = cfg
}
