package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ PositionsModel = (*customPositionsModel)(nil)

type (
	// PositionsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customPositionsModel.
	PositionsModel interface {
		positionsModel
		withSession(session sqlx.Session) PositionsModel
	}

	customPositionsModel struct {
		*defaultPositionsModel
	}
)

// NewPositionsModel returns a model for the database table.
func NewPositionsModel(conn sqlx.SqlConn) PositionsModel {
	return &customPositionsModel{
		defaultPositionsModel: newPositionsModel(conn),
	}
}

func (m *customPositionsModel) withSession(session sqlx.Session) PositionsModel {
	return NewPositionsModel(sqlx.NewSqlConnFromSession(session))
}
