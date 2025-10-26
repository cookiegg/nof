// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package handler

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
	"nof0-api/internal/logic"
	"nof0-api/internal/svc"
	"nof0-api/internal/types"
)

func AccountTotalsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.AccountTotalsRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := logic.NewAccountTotalsLogic(r.Context(), svcCtx)
		resp, err := l.AccountTotals(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
