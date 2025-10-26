// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type AnalyticsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewAnalyticsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *AnalyticsLogic {
	return &AnalyticsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *AnalyticsLogic) Analytics() (resp *types.AnalyticsResponse, err error) {
	return l.svcCtx.DataLoader.LoadAnalytics()
}
