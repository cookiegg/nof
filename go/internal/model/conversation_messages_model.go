package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ ConversationMessagesModel = (*customConversationMessagesModel)(nil)

type (
	// ConversationMessagesModel is an interface to be customized, add more methods here,
	// and implement the added methods in customConversationMessagesModel.
	ConversationMessagesModel interface {
		conversationMessagesModel
		withSession(session sqlx.Session) ConversationMessagesModel
	}

	customConversationMessagesModel struct {
		*defaultConversationMessagesModel
	}
)

// NewConversationMessagesModel returns a model for the database table.
func NewConversationMessagesModel(conn sqlx.SqlConn) ConversationMessagesModel {
	return &customConversationMessagesModel{
		defaultConversationMessagesModel: newConversationMessagesModel(conn),
	}
}

func (m *customConversationMessagesModel) withSession(session sqlx.Session) ConversationMessagesModel {
	return NewConversationMessagesModel(sqlx.NewSqlConnFromSession(session))
}
