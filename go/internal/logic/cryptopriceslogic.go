// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type CryptoPricesLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCryptoPricesLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CryptoPricesLogic {
	return &CryptoPricesLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *CryptoPricesLogic) CryptoPrices() (resp *types.CryptoPricesResponse, err error) {
	return l.svcCtx.DataLoader.LoadCryptoPrices()
}
