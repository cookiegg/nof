package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ PriceTicksModel = (*customPriceTicksModel)(nil)

type (
	// PriceTicksModel is an interface to be customized, add more methods here,
	// and implement the added methods in customPriceTicksModel.
	PriceTicksModel interface {
		priceTicksModel
		withSession(session sqlx.Session) PriceTicksModel
	}

	customPriceTicksModel struct {
		*defaultPriceTicksModel
	}
)

// NewPriceTicksModel returns a model for the database table.
func NewPriceTicksModel(conn sqlx.SqlConn) PriceTicksModel {
	return &customPriceTicksModel{
		defaultPriceTicksModel: newPriceTicksModel(conn),
	}
}

func (m *customPriceTicksModel) withSession(session sqlx.Session) PriceTicksModel {
	return NewPriceTicksModel(sqlx.NewSqlConnFromSession(session))
}
