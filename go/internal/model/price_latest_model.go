package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ PriceLatestModel = (*customPriceLatestModel)(nil)

type (
	// PriceLatestModel is an interface to be customized, add more methods here,
	// and implement the added methods in customPriceLatestModel.
	PriceLatestModel interface {
		priceLatestModel
		withSession(session sqlx.Session) PriceLatestModel
	}

	customPriceLatestModel struct {
		*defaultPriceLatestModel
	}
)

// NewPriceLatestModel returns a model for the database table.
func NewPriceLatestModel(conn sqlx.SqlConn) PriceLatestModel {
	return &customPriceLatestModel{
		defaultPriceLatestModel: newPriceLatestModel(conn),
	}
}

func (m *customPriceLatestModel) withSession(session sqlx.Session) PriceLatestModel {
	return NewPriceLatestModel(sqlx.NewSqlConnFromSession(session))
}
