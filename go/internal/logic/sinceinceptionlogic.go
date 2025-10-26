// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type SinceInceptionLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewSinceInceptionLogic(ctx context.Context, svcCtx *svc.ServiceContext) *SinceInceptionLogic {
	return &SinceInceptionLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *SinceInceptionLogic) SinceInception() (resp *types.SinceInceptionResponse, err error) {
	return l.svcCtx.DataLoader.LoadSinceInception()
}
