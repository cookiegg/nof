// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type AccountTotalsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewAccountTotalsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *AccountTotalsLogic {
	return &AccountTotalsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *AccountTotalsLogic) AccountTotals(req *types.AccountTotalsRequest) (resp *types.AccountTotalsResponse, err error) {
	return l.svcCtx.DataLoader.LoadAccountTotals()
}
