// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package logic

import (
	"context"

	"nof0-api/internal/svc"
	"nof0-api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type ConversationsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewConversationsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ConversationsLogic {
	return &ConversationsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ConversationsLogic) Conversations() (resp *types.ConversationsResponse, err error) {
	return l.svcCtx.DataLoader.LoadConversations()
}
