// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type LeaderboardLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewLeaderboardLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LeaderboardLogic {
	return &LeaderboardLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *LeaderboardLogic) Leaderboard() (resp *types.LeaderboardResponse, err error) {
	return l.svcCtx.DataLoader.LoadLeaderboard()
}
