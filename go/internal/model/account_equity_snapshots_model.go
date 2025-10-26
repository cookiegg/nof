package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ AccountEquitySnapshotsModel = (*customAccountEquitySnapshotsModel)(nil)

type (
	// AccountEquitySnapshotsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customAccountEquitySnapshotsModel.
	AccountEquitySnapshotsModel interface {
		accountEquitySnapshotsModel
		withSession(session sqlx.Session) AccountEquitySnapshotsModel
	}

	customAccountEquitySnapshotsModel struct {
		*defaultAccountEquitySnapshotsModel
	}
)

// NewAccountEquitySnapshotsModel returns a model for the database table.
func NewAccountEquitySnapshotsModel(conn sqlx.SqlConn) AccountEquitySnapshotsModel {
	return &customAccountEquitySnapshotsModel{
		defaultAccountEquitySnapshotsModel: newAccountEquitySnapshotsModel(conn),
	}
}

func (m *customAccountEquitySnapshotsModel) withSession(session sqlx.Session) AccountEquitySnapshotsModel {
	return NewAccountEquitySnapshotsModel(sqlx.NewSqlConnFromSession(session))
}
