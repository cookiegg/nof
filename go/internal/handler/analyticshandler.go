// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package handler

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
	"nof0-api/internal/logic"
	"nof0-api/internal/svc"
)

func AnalyticsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logic.NewAnalyticsLogic(r.Context(), svcCtx)
		resp, err := l.Analytics()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
