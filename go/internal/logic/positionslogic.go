// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type PositionsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewPositionsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *PositionsLogic {
	return &PositionsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *PositionsLogic) Positions(req *types.PositionsRequest) (resp *types.PositionsResponse, err error) {
	return l.svcCtx.DataLoader.LoadPositions()
}
