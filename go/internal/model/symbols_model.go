package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ SymbolsModel = (*customSymbolsModel)(nil)

type (
	// SymbolsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customSymbolsModel.
	SymbolsModel interface {
		symbolsModel
		withSession(session sqlx.Session) SymbolsModel
	}

	customSymbolsModel struct {
		*defaultSymbolsModel
	}
)

// NewSymbolsModel returns a model for the database table.
func NewSymbolsModel(conn sqlx.SqlConn) SymbolsModel {
	return &customSymbolsModel{
		defaultSymbolsModel: newSymbolsModel(conn),
	}
}

func (m *customSymbolsModel) withSession(session sqlx.Session) SymbolsModel {
	return NewSymbolsModel(sqlx.NewSqlConnFromSession(session))
}
