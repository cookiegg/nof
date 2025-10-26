package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ AccountsModel = (*customAccountsModel)(nil)

type (
	// AccountsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customAccountsModel.
	AccountsModel interface {
		accountsModel
		withSession(session sqlx.Session) AccountsModel
	}

	customAccountsModel struct {
		*defaultAccountsModel
	}
)

// NewAccountsModel returns a model for the database table.
func NewAccountsModel(conn sqlx.SqlConn) AccountsModel {
	return &customAccountsModel{
		defaultAccountsModel: newAccountsModel(conn),
	}
}

func (m *customAccountsModel) withSession(session sqlx.Session) AccountsModel {
	return NewAccountsModel(sqlx.NewSqlConnFromSession(session))
}
