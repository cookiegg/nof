-- Helper functions to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_views_nof0()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_crypto_prices_latest;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_since_inception;
END;
$$;

