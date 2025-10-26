package svc

import (
	_ "github.com/jackc/pgx/v5/stdlib" // register pgx driver
	"github.com/zeromicro/go-zero/core/stores/sqlx"

	"nof0-api/internal/config"
	"nof0-api/internal/data"
	"nof0-api/internal/model"
)

type ServiceContext struct {
	Config     config.Config
	DataLoader *data.DataLoader

	// Optional DB models (injected but unused by handlers/logic for now)
	DBConn                      sqlx.SqlConn
	ModelsModel                 model.ModelsModel
	SymbolsModel                model.SymbolsModel
	PriceTicksModel             model.PriceTicksModel
	PriceLatestModel            model.PriceLatestModel
	AccountsModel               model.AccountsModel
	AccountEquitySnapshotsModel model.AccountEquitySnapshotsModel
	PositionsModel              model.PositionsModel
	TradesModel                 model.TradesModel
	ModelAnalyticsModel         model.ModelAnalyticsModel
	ConversationsModel          model.ConversationsModel
	ConversationMessagesModel   model.ConversationMessagesModel
}

func NewServiceContext(c config.Config) *ServiceContext {
	svc := &ServiceContext{
		Config:     c,
		DataLoader: data.NewDataLoader(c.DataPath),
	}
	// Only inject DB models when DSN provided; business logic still uses DataLoader.
	if c.Postgres.DSN != "" {
		conn := sqlx.NewSqlConn("pgx", c.Postgres.DSN)
		svc.DBConn = conn
		svc.ModelsModel = model.NewModelsModel(conn)
		svc.SymbolsModel = model.NewSymbolsModel(conn)
		svc.PriceTicksModel = model.NewPriceTicksModel(conn)
		svc.PriceLatestModel = model.NewPriceLatestModel(conn)
		svc.AccountsModel = model.NewAccountsModel(conn)
		svc.AccountEquitySnapshotsModel = model.NewAccountEquitySnapshotsModel(conn)
		svc.PositionsModel = model.NewPositionsModel(conn)
		svc.TradesModel = model.NewTradesModel(conn)
		svc.ModelAnalyticsModel = model.NewModelAnalyticsModel(conn)
		svc.ConversationsModel = model.NewConversationsModel(conn)
		svc.ConversationMessagesModel = model.NewConversationMessagesModel(conn)
	}
	return svc
}
