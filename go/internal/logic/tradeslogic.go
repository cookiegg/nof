// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type TradesLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewTradesLogic(ctx context.Context, svcCtx *svc.ServiceContext) *TradesLogic {
	return &TradesLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *TradesLogic) Trades() (resp *types.TradesResponse, err error) {
	return l.svcCtx.DataLoader.LoadTrades()
}
