package svc

import (
	"nof0-api/internal/config"
	"nof0-api/internal/data"
)

type ServiceContext struct {
	Config     config.Config
	DataLoader *data.DataLoader
}

func NewServiceContext(c config.Config) *ServiceContext {
	return &ServiceContext{
		Config:     c,
		DataLoader: data.NewDataLoader(c.DataPath),
	}
}
