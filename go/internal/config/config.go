package config

import "github.com/zeromicro/go-zero/rest"

type Config struct {
	rest.RestConf
	DataPath string `json:",default=../../mcp/data"`
}
