// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ModelAnalyticsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewModelAnalyticsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ModelAnalyticsLogic {
	return &ModelAnalyticsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ModelAnalyticsLogic) ModelAnalytics(modelId string) (resp *types.ModelAnalyticsResponse, err error) {
	return l.svcCtx.DataLoader.LoadModelAnalytics(modelId)
}
