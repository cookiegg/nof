package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ ModelsModel = (*customModelsModel)(nil)

type (
	// ModelsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customModelsModel.
	ModelsModel interface {
		modelsModel
		withSession(session sqlx.Session) ModelsModel
	}

	customModelsModel struct {
		*defaultModelsModel
	}
)

// NewModelsModel returns a model for the database table.
func NewModelsModel(conn sqlx.SqlConn) ModelsModel {
	return &customModelsModel{
		defaultModelsModel: newModelsModel(conn),
	}
}

func (m *customModelsModel) withSession(session sqlx.Session) ModelsModel {
	return NewModelsModel(sqlx.NewSqlConnFromSession(session))
}
