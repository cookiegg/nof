// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package handler

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
	"github.com/zeromicro/go-zero/rest/pathvar"
	"nof0-api/internal/logic"
	"nof0-api/internal/svc"
)

func ModelAnalyticsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract modelId from path parameter using go-zero's pathvar
		vars := pathvar.Vars(r)
		modelId := vars["modelId"]

		l := logic.NewModelAnalyticsLogic(r.Context(), svcCtx)
		resp, err := l.ModelAnalytics(modelId)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
