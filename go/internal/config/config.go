package config

import (
	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/rest"
)

type PostgresConf struct {
	// DSN example: postgres://user:pass@localhost:5432/nof0?sslmode=disable
	DSN     string `json:",optional"`
	MaxOpen int    `json:",default=10"`
	MaxIdle int    `json:",default=5"`
}

type CacheTTL struct {
	Short  int `json:",default=10"` // seconds
	Medium int `json:",default=60"`
	Long   int `json:",default=300"`
}

type Config struct {
	rest.RestConf
	DataPath string          `json:",default=../../mcp/data"`
	Postgres PostgresConf    `json:",optional"`
	Redis    redis.RedisConf `json:",optional"`
	TTL      CacheTTL        `json:",optional"`
}
