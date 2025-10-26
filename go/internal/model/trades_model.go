package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ TradesModel = (*customTradesModel)(nil)

type (
	// TradesModel is an interface to be customized, add more methods here,
	// and implement the added methods in customTradesModel.
	TradesModel interface {
		tradesModel
		withSession(session sqlx.Session) TradesModel
	}

	customTradesModel struct {
		*defaultTradesModel
	}
)

// NewTradesModel returns a model for the database table.
func NewTradesModel(conn sqlx.SqlConn) TradesModel {
	return &customTradesModel{
		defaultTradesModel: newTradesModel(conn),
	}
}

func (m *customTradesModel) withSession(session sqlx.Session) TradesModel {
	return NewTradesModel(sqlx.NewSqlConnFromSession(session))
}
