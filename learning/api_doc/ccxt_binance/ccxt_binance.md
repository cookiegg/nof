binance
Kind: global class
Extends: Exchange

enableDemoTrading
fetchTime
fetchCurrencies
fetchMarkets
fetchBalance
fetchOrderBook
fetchStatus
fetchTicker
fetchBidsAsks
fetchLastPrices
fetchTickers
fetchMarkPrice
fetchMarkPrices
fetchOHLCV
fetchTrades
editContractOrder
editOrder
editOrders
createOrders
createOrder
createMarketOrderWithCost
createMarketBuyOrderWithCost
createMarketSellOrderWithCost
fetchOrder
fetchOrders
fetchOpenOrders
fetchOpenOrder
fetchClosedOrders
fetchCanceledOrders
fetchCanceledAndClosedOrders
cancelOrder
cancelAllOrders
cancelOrders
fetchOrderTrades
fetchMyTrades
fetchMyDustTrades
fetchDeposits
fetchWithdrawals
transfer
fetchTransfers
fetchDepositAddress
fetchTransactionFees
fetchDepositWithdrawFees
withdraw
fetchTradingFee
fetchTradingFees
fetchFundingRate
fetchFundingRateHistory
fetchFundingRates
fetchLeverageTiers
fetchPosition
fetchOptionPositions
fetchPositions
fetchFundingHistory
setLeverage
setMarginMode
setPositionMode
fetchLeverages
fetchSettlementHistory
fetchMySettlementHistory
fetchLedgerEntry
fetchLedger
reduceMargin
addMargin
fetchCrossBorrowRate
fetchIsolatedBorrowRate
fetchIsolatedBorrowRates
fetchBorrowRateHistory
createGiftCode
redeemGiftCode
verifyGiftCode
fetchBorrowInterest
repayCrossMargin
repayIsolatedMargin
borrowCrossMargin
borrowIsolatedMargin
fetchOpenInterestHistory
fetchOpenInterest
fetchMyLiquidations
fetchGreeks
fetchAllGreeks
fetchPositionMode
fetchMarginModes
fetchMarginMode
fetchOption
fetchMarginAdjustmentHistory
fetchConvertCurrencies
fetchConvertQuote
createConvertTrade
fetchConvertTrade
fetchConvertTradeHistory
fetchFundingIntervals
fetchLongShortRatioHistory

enableDemoTrading
enables or disables demo trading mode

Kind: instance method of binance

See

https://www.binance.com/en/support/faq/detail/9be58f73e5e14338809e3b705b9687dd
https://demo.binance.com/en/my/settings/api-management
Param	Type	Required	Description
enable	boolean	No	true if demo trading should be enabled, false otherwise
binance.enableDemoTrading ([enable])
Copy to clipboardErrorCopied

fetchTime
fetches the current integer timestamp in milliseconds from the exchange server

Kind: instance method of binance
Returns: int - the current integer timestamp in milliseconds from the exchange server

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-endpoints#check-server-time // spot
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Check-Server-Time // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Check-Server-time // future
Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchTime ([params])
Copy to clipboardErrorCopied

fetchCurrencies
fetches all available currencies on an exchange

Kind: instance method of binance
Returns: object - an associative dictionary of currencies

See

https://developers.binance.com/docs/wallet/capital/all-coins-info
https://developers.binance.com/docs/margin_trading/market-data/Get-All-Margin-Assets
Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchCurrencies ([params])
Copy to clipboardErrorCopied

fetchMarkets
retrieves data on all markets for binance

Kind: instance method of binance
Returns: Array<object> - an array of objects representing market data

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-endpoints#exchange-information // spot
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Exchange-Information // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Exchange-Information // future
https://developers.binance.com/docs/derivatives/option/market-data/Exchange-Information // option
https://developers.binance.com/docs/margin_trading/market-data/Get-All-Cross-Margin-Pairs // cross margin
https://developers.binance.com/docs/margin_trading/market-data/Get-All-Isolated-Margin-Symbol // isolated margin
Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchMarkets ([params])
Copy to clipboardErrorCopied

fetchBalance
query for balance and get the amount of funds available for trading or funds locked in orders

Kind: instance method of binance
Returns: object - a balance structure

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/account-endpoints#account-information-user_data // spot
https://developers.binance.com/docs/margin_trading/account/Query-Cross-Margin-Account-Details // cross margin
https://developers.binance.com/docs/margin_trading/account/Query-Isolated-Margin-Account-Info // isolated margin
https://developers.binance.com/docs/wallet/asset/funding-wallet // funding
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Futures-Account-Balance-V2 // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Futures-Account-Balance // future
https://developers.binance.com/docs/derivatives/option/account/Option-Account-Information // option
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Account-Balance // portfolio margin
Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
params.type	string	No	'future', 'delivery', 'savings', 'funding', or 'spot' or 'papi'
params.marginMode	string	No	'cross' or 'isolated', for margin trading, uses this.options.defaultMarginMode if not passed, defaults to undefined/None/null
params.symbols	Array<string>, undefined	No	unified market symbols, only used in isolated margin mode
params.portfolioMargin	boolean	No	set to true if you would like to fetch the balance for a portfolio margin account
params.subType	string	No	'linear' or 'inverse'
binance.fetchBalance ([params])
Copy to clipboardErrorCopied

fetchOrderBook
fetches information on open orders with bid (buy) and ask (sell) prices, volumes and other data

Kind: instance method of binance
Returns: object - A dictionary of order book structures indexed by market symbols

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#order-book // spot
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Order-Book // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Order-Book // future
https://developers.binance.com/docs/derivatives/option/market-data/Order-Book // option
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch the order book for
limit	int	No	the maximum amount of order book entries to return
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchOrderBook (symbol[, limit, params])
Copy to clipboardErrorCopied

fetchStatus
the latest known information on the availability of the exchange API

Kind: instance method of binance
Returns: object - a status structure

See: https://developers.binance.com/docs/wallet/others/system-status

Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchStatus ([params])
Copy to clipboardErrorCopied

fetchTicker
fetches a price ticker, a statistical calculation with the information calculated over the past 24 hours for a specific market

Kind: instance method of binance
Returns: object - a ticker structure

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#24hr-ticker-price-change-statistics // spot
https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#rolling-window-price-change-statistics // spot
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/24hr-Ticker-Price-Change-Statistics // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/24hr-Ticker-Price-Change-Statistics // future
https://developers.binance.com/docs/derivatives/option/market-data/24hr-Ticker-Price-Change-Statistics // option
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch the ticker for
params	object	No	extra parameters specific to the exchange API endpoint
params.rolling	boolean	No	(spot only) default false, if true, uses the rolling 24 hour ticker endpoint /api/v3/ticker
binance.fetchTicker (symbol[, params])
Copy to clipboardErrorCopied

fetchBidsAsks
fetches the bid and ask price and volume for multiple markets

Kind: instance method of binance
Returns: object - a dictionary of ticker structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#symbol-order-book-ticker // spot
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Symbol-Order-Book-Ticker // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Symbol-Order-Book-Ticker // future
Param	Type	Required	Description
symbols	Array<string>, undefined	Yes	unified symbols of the markets to fetch the bids and asks for, all markets are returned if not assigned
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchBidsAsks (symbols[, params])
Copy to clipboardErrorCopied

fetchLastPrices
fetches the last price for multiple markets

Kind: instance method of binance
Returns: object - a dictionary of lastprices structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#symbol-price-ticker // spot
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Symbol-Price-Ticker // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Symbol-Price-Ticker // future
Param	Type	Required	Description
symbols	Array<string>, undefined	Yes	unified symbols of the markets to fetch the last prices
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchLastPrices (symbols[, params])
Copy to clipboardErrorCopied

fetchTickers
fetches price tickers for multiple markets, statistical information calculated over the past 24 hours for each market

Kind: instance method of binance
Returns: object - a dictionary of ticker structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#24hr-ticker-price-change-statistics // spot
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/24hr-Ticker-Price-Change-Statistics // swap
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/24hr-Ticker-Price-Change-Statistics // future
https://developers.binance.com/docs/derivatives/option/market-data/24hr-Ticker-Price-Change-Statistics // option
Param	Type	Required	Description
symbols	Array<string>	No	unified symbols of the markets to fetch the ticker for, all market tickers are returned if not assigned
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
params.type	string	No	'spot', 'option', use params["subType"] for swap and future markets
binance.fetchTickers ([symbols, params])
Copy to clipboardErrorCopied

fetchMarkPrice
fetches mark price for the market

Kind: instance method of binance
Returns: object - a dictionary of ticker structures

See

https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Index-Price-and-Mark-Price
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Mark-Price
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch the ticker for
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchMarkPrice (symbol[, params])
Copy to clipboardErrorCopied

fetchMarkPrices
fetches mark prices for multiple markets

Kind: instance method of binance
Returns: object - a dictionary of ticker structures

See

https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Index-Price-and-Mark-Price
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Mark-Price
Param	Type	Required	Description
symbols	Array<string>	No	unified symbols of the markets to fetch the ticker for, all market tickers are returned if not assigned
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchMarkPrices ([symbols, params])
Copy to clipboardErrorCopied

fetchOHLCV
fetches historical candlestick data containing the open, high, low, and close price, and the volume of a market

Kind: instance method of binance
Returns: Array<Array<int>> - A list of candles ordered as timestamp, open, high, low, close, volume

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#klinecandlestick-data
https://developers.binance.com/docs/derivatives/option/market-data/Kline-Candlestick-Data
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Kline-Candlestick-Data
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Index-Price-Kline-Candlestick-Data
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Mark-Price-Kline-Candlestick-Data
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Premium-Index-Kline-Data
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Kline-Candlestick-Data
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Index-Price-Kline-Candlestick-Data
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Mark-Price-Kline-Candlestick-Data
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Premium-Index-Kline-Data
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch OHLCV data for
timeframe	string	Yes	the length of time each candle represents
since	int	No	timestamp in ms of the earliest candle to fetch
limit	int	No	the maximum amount of candles to fetch
params	object	No	extra parameters specific to the exchange API endpoint
params.price	string	No	"mark" or "index" for mark price and index price candles
params.until	int	No	timestamp in ms of the latest candle to fetch
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
binance.fetchOHLCV (symbol, timeframe[, since, limit, params])
Copy to clipboardErrorCopied

fetchTrades
get the list of most recent trades for a particular symbol Default fetchTradesMethod

Kind: instance method of binance
Returns: Array<Trade> - a list of trade structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#compressedaggregate-trades-list // publicGetAggTrades (spot)
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Compressed-Aggregate-Trades-List // fapiPublicGetAggTrades (swap)
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Compressed-Aggregate-Trades-List // dapiPublicGetAggTrades (future)
https://developers.binance.com/docs/derivatives/option/market-data/Recent-Trades-List // eapiPublicGetTrades (option) Other fetchTradesMethod
https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#recent-trades-list // publicGetTrades (spot)
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Recent-Trades-List // fapiPublicGetTrades (swap)
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Recent-Trades-List // dapiPublicGetTrades (future)
https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#old-trade-lookup // publicGetHistoricalTrades (spot)
https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Old-Trades-Lookup // fapiPublicGetHistoricalTrades (swap)
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Old-Trades-Lookup // dapiPublicGetHistoricalTrades (future)
https://developers.binance.com/docs/derivatives/option/market-data/Old-Trades-Lookup // eapiPublicGetHistoricalTrades (option)
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch trades for
since	int	No	only used when fetchTradesMethod is 'publicGetAggTrades', 'fapiPublicGetAggTrades', or 'dapiPublicGetAggTrades'
limit	int	No	default 500, max 1000
params	object	No	extra parameters specific to the exchange API endpoint
params.until	int	No	only used when fetchTradesMethod is 'publicGetAggTrades', 'fapiPublicGetAggTrades', or 'dapiPublicGetAggTrades'
params.fetchTradesMethod	int	No	'publicGetAggTrades' (spot default), 'fapiPublicGetAggTrades' (swap default), 'dapiPublicGetAggTrades' (future default), 'eapiPublicGetTrades' (option default), 'publicGetTrades', 'fapiPublicGetTrades', 'dapiPublicGetTrades', 'publicGetHistoricalTrades', 'fapiPublicGetHistoricalTrades', 'dapiPublicGetHistoricalTrades', 'eapiPublicGetHistoricalTrades'
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the availble parameters EXCHANGE SPECIFIC PARAMETERS
params.fromId	int	No	trade id to fetch from, default gets most recent trades, not used when fetchTradesMethod is 'publicGetTrades', 'fapiPublicGetTrades', 'dapiPublicGetTrades', or 'eapiPublicGetTrades'
binance.fetchTrades (symbol[, since, limit, params])
Copy to clipboardErrorCopied

editContractOrder
edit a trade order

Kind: instance method of binance
Returns: object - an order structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Modify-Order
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Modify-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Modify-UM-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Modify-CM-Order
Param	Type	Required	Description
id	string	Yes	cancel order id
symbol	string	Yes	unified symbol of the market to create an order in
type	string	Yes	'market' or 'limit'
side	string	Yes	'buy' or 'sell'
amount	float	Yes	how much of currency you want to trade in units of base currency
price	float	No	the price at which the order is to be fulfilled, in units of the quote currency, ignored in market orders
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to edit an order in a portfolio margin account
binance.editContractOrder (id, symbol, type, side, amount[, price, params])
Copy to clipboardErrorCopied

editOrder
edit a trade order

Kind: instance method of binance
Returns: object - an order structure

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#cancel-an-existing-order-and-send-a-new-order-trade
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Modify-Order
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Modify-Order
Param	Type	Required	Description
id	string	Yes	cancel order id
symbol	string	Yes	unified symbol of the market to create an order in
type	string	Yes	'market' or 'limit'
side	string	Yes	'buy' or 'sell'
amount	float	Yes	how much of currency you want to trade in units of base currency
price	float	No	the price at which the order is to be fulfilled, in units of the quote currency, ignored in market orders
params	object	No	extra parameters specific to the exchange API endpoint
binance.editOrder (id, symbol, type, side, amount[, price, params])
Copy to clipboardErrorCopied

editOrders
edit a list of trade orders

Kind: instance method of binance
Returns: object - an order structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Modify-Multiple-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Modify-Multiple-Orders
Param	Type	Required	Description
orders	Array	Yes	list of orders to create, each object should contain the parameters required by createOrder, namely symbol, type, side, amount, price and params
params	object	No	extra parameters specific to the exchange API endpoint
binance.editOrders (orders[, params])
Copy to clipboardErrorCopied

createOrders
contract only create a list of trade orders

Kind: instance method of binance
Returns: object - an order structure

See

https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Place-Multiple-Orders
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Place-Multiple-Orders
https://developers.binance.com/docs/derivatives/option/trade/Place-Multiple-Orders
Param	Type	Required	Description
orders	Array	Yes	list of orders to create, each object should contain the parameters required by createOrder, namely symbol, type, side, amount, price and params
params	object	No	extra parameters specific to the exchange API endpoint
binance.createOrders (orders[, params])
Copy to clipboardErrorCopied

createOrder
create a trade order

Kind: instance method of binance
Returns: object - an order structure

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#new-order-trade
https://developers.binance.com/docs/binance-spot-api-docs/testnet/rest-api/trading-endpoints#test-new-order-trade
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/New-Order
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api
https://developers.binance.com/docs/derivatives/option/trade/New-Order
https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#sor
https://developers.binance.com/docs/binance-spot-api-docs/testnet/rest-api/trading-endpoints#sor
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/New-UM-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/New-CM-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/New-Margin-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/New-UM-Conditional-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/New-CM-Conditional-Order
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to create an order in
type	string	Yes	'market' or 'limit' or 'STOP_LOSS' or 'STOP_LOSS_LIMIT' or 'TAKE_PROFIT' or 'TAKE_PROFIT_LIMIT' or 'STOP'
side	string	Yes	'buy' or 'sell'
amount	float	Yes	how much of you want to trade in units of the base currency
price	float	No	the price that the order is to be fulfilled, in units of the quote currency, ignored in market orders
params	object	No	extra parameters specific to the exchange API endpoint
params.reduceOnly	string	No	for swap and future reduceOnly is a string 'true' or 'false' that cant be sent with close position set to true or in hedge mode. For spot margin and option reduceOnly is a boolean.
params.marginMode	string	No	'cross' or 'isolated', for spot margin trading
params.sor	boolean	No	spot only whether to use SOR (Smart Order Routing) or not, default is false
params.test	boolean	No	spot only whether to use the test endpoint or not, default is false
params.trailingPercent	float	No	the percent to trail away from the current market price
params.trailingTriggerPrice	float	No	the price to trigger a trailing order, default uses the price argument
params.triggerPrice	float	No	the price that a trigger order is triggered at
params.stopLossPrice	float	No	the price that a stop loss order is triggered at
params.takeProfitPrice	float	No	the price that a take profit order is triggered at
params.portfolioMargin	boolean	No	set to true if you would like to create an order in a portfolio margin account
params.selfTradePrevention	string	No	set unified value for stp, one of NONE, EXPIRE_MAKER, EXPIRE_TAKER or EXPIRE_BOTH
params.icebergAmount	float	No	set iceberg amount for limit orders
params.stopLossOrTakeProfit	string	No	'stopLoss' or 'takeProfit', required for spot trailing orders
params.positionSide	string	No	swap and portfolio margin only "BOTH" for one-way mode, "LONG" for buy side of hedged mode, "SHORT" for sell side of hedged mode
params.hedged	bool	No	swap and portfolio margin only true for hedged mode, false for one way mode, default is false
binance.createOrder (symbol, type, side, amount[, price, params])
Copy to clipboardErrorCopied

createMarketOrderWithCost
create a market order by providing the symbol, side and cost

Kind: instance method of binance
Returns: object - an order structure

See: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#new-order-trade

Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to create an order in
side	string	Yes	'buy' or 'sell'
cost	float	Yes	how much you want to trade in units of the quote currency
params	object	No	extra parameters specific to the exchange API endpoint
binance.createMarketOrderWithCost (symbol, side, cost[, params])
Copy to clipboardErrorCopied

createMarketBuyOrderWithCost
create a market buy order by providing the symbol and cost

Kind: instance method of binance
Returns: object - an order structure

See: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#new-order-trade

Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to create an order in
cost	float	Yes	how much you want to trade in units of the quote currency
params	object	No	extra parameters specific to the exchange API endpoint
binance.createMarketBuyOrderWithCost (symbol, cost[, params])
Copy to clipboardErrorCopied

createMarketSellOrderWithCost
create a market sell order by providing the symbol and cost

Kind: instance method of binance
Returns: object - an order structure

See: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#new-order-trade

Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to create an order in
cost	float	Yes	how much you want to trade in units of the quote currency
params	object	No	extra parameters specific to the exchange API endpoint
binance.createMarketSellOrderWithCost (symbol, cost[, params])
Copy to clipboardErrorCopied

fetchOrder
fetches information on an order made by the user

Kind: instance method of binance
Returns: object - An order structure

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#query-order-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Query-Order
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Query-Order
https://developers.binance.com/docs/derivatives/option/trade/Query-Single-Order
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-UM-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-CM-Order
Param	Type	Required	Description
id	string	Yes	the order id
symbol	string	Yes	unified symbol of the market the order was made in
params	object	No	extra parameters specific to the exchange API endpoint
params.marginMode	string	No	'cross' or 'isolated', for spot margin trading
params.portfolioMargin	boolean	No	set to true if you would like to fetch an order in a portfolio margin account
binance.fetchOrder (id, symbol[, params])
Copy to clipboardErrorCopied

fetchOrders
fetches information on multiple orders made by the user

Kind: instance method of binance
Returns: Array<Order> - a list of order structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#all-orders-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/option/trade/Query-Option-Order-History
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-All-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Conditional-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Conditional-Orders
Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the market orders were made in
since	int	No	the earliest time in ms to fetch orders for
limit	int	No	the maximum number of order structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.marginMode	string	No	'cross' or 'isolated', for spot margin trading
params.until	int	No	the latest time in ms to fetch orders for
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.portfolioMargin	boolean	No	set to true if you would like to fetch orders in a portfolio margin account
params.trigger	boolean	No	set to true if you would like to fetch portfolio margin account trigger or conditional orders
binance.fetchOrders (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchOpenOrders
fetch all unfilled currently open orders

Kind: instance method of binance
Returns: Array<Order> - a list of order structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#current-open-orders-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Current-All-Open-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Current-All-Open-Orders
https://developers.binance.com/docs/derivatives/option/trade/Query-Current-Open-Option-Orders
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-Open-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-Current-UM-Open-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-Current-UM-Open-Conditional-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-Current-CM-Open-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-Current-CM-Open-Conditional-Orders
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
since	int	No	the earliest time in ms to fetch open orders for
limit	int	No	the maximum number of open orders structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.marginMode	string	No	'cross' or 'isolated', for spot margin trading
params.portfolioMargin	boolean	No	set to true if you would like to fetch open orders in the portfolio margin account
params.trigger	boolean	No	set to true if you would like to fetch portfolio margin account conditional orders
params.subType	string	No	"linear" or "inverse"
binance.fetchOpenOrders (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchOpenOrder
fetch an open order by the id

Kind: instance method of binance
Returns: object - an order structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Query-Current-Open-Order
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Query-Current-Open-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-Current-UM-Open-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-Current-UM-Open-Conditional-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-Current-CM-Open-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-Current-CM-Open-Conditional-Order
Param	Type	Required	Description
id	string	Yes	order id
symbol	string	Yes	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint
params.trigger	string	No	set to true if you would like to fetch portfolio margin account stop or conditional orders
params.portfolioMargin	boolean	No	set to true if you would like to fetch for a portfolio margin account
binance.fetchOpenOrder (id, symbol[, params])
Copy to clipboardErrorCopied

fetchClosedOrders
fetches information on multiple closed orders made by the user

Kind: instance method of binance
Returns: Array<Order> - a list of order structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#all-orders-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/option/trade/Query-Option-Order-History
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-All-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Conditional-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Conditional-Orders
Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the market orders were made in
since	int	No	the earliest time in ms to fetch orders for
limit	int	No	the maximum number of order structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.portfolioMargin	boolean	No	set to true if you would like to fetch orders in a portfolio margin account
params.trigger	boolean	No	set to true if you would like to fetch portfolio margin account trigger or conditional orders
binance.fetchClosedOrders (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchCanceledOrders
fetches information on multiple canceled orders made by the user

Kind: instance method of binance
Returns: Array<object> - a list of order structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#all-orders-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/option/trade/Query-Option-Order-History
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-All-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Conditional-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Conditional-Orders
Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the market the orders were made in
since	int	No	the earliest time in ms to fetch orders for
limit	int	No	the maximum number of order structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.portfolioMargin	boolean	No	set to true if you would like to fetch orders in a portfolio margin account
params.trigger	boolean	No	set to true if you would like to fetch portfolio margin account trigger or conditional orders
binance.fetchCanceledOrders (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchCanceledAndClosedOrders
fetches information on multiple canceled orders made by the user

Kind: instance method of binance
Returns: Array<object> - a list of order structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#all-orders-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/All-Orders
https://developers.binance.com/docs/derivatives/option/trade/Query-Option-Order-History
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-All-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-UM-Conditional-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-All-CM-Conditional-Orders
Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the market the orders were made in
since	int	No	the earliest time in ms to fetch orders for
limit	int	No	the maximum number of order structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.portfolioMargin	boolean	No	set to true if you would like to fetch orders in a portfolio margin account
params.trigger	boolean	No	set to true if you would like to fetch portfolio margin account trigger or conditional orders
binance.fetchCanceledAndClosedOrders (symbol[, since, limit, params])
Copy to clipboardErrorCopied

cancelOrder
cancels an open order

Kind: instance method of binance
Returns: object - An order structure

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#cancel-order-trade
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Cancel-Order
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Cancel-Order
https://developers.binance.com/docs/derivatives/option/trade/Cancel-Option-Order
https://developers.binance.com/docs/margin_trading/trade/Margin-Account-Cancel-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-UM-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-CM-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-UM-Conditional-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-CM-Conditional-Order
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-Margin-Account-Order
Param	Type	Required	Description
id	string	Yes	order id
symbol	string	Yes	unified symbol of the market the order was made in
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to cancel an order in a portfolio margin account
params.trigger	boolean	No	set to true if you would like to cancel a portfolio margin account conditional order
binance.cancelOrder (id, symbol[, params])
Copy to clipboardErrorCopied

cancelAllOrders
cancel all open orders in a market

Kind: instance method of binance
Returns: Array<object> - a list of order structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/trading-endpoints#cancel-all-open-orders-on-a-symbol-trade
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Cancel-All-Open-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Cancel-All-Open-Orders
https://developers.binance.com/docs/derivatives/option/trade/Cancel-all-Option-orders-on-specific-symbol
https://developers.binance.com/docs/margin_trading/trade/Margin-Account-Cancel-All-Open-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-All-UM-Open-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-All-UM-Open-Conditional-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-All-CM-Open-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-All-CM-Open-Conditional-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Cancel-Margin-Account-All-Open-Orders-on-a-Symbol
Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the market to cancel orders in
params	object	No	extra parameters specific to the exchange API endpoint
params.marginMode	string	No	'cross' or 'isolated', for spot margin trading
params.portfolioMargin	boolean	No	set to true if you would like to cancel orders in a portfolio margin account
params.trigger	boolean	No	set to true if you would like to cancel portfolio margin account conditional orders
binance.cancelAllOrders (symbol[, params])
Copy to clipboardErrorCopied

cancelOrders
cancel multiple orders

Kind: instance method of binance
Returns: object - an list of order structures

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Cancel-Multiple-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Cancel-Multiple-Orders
Param	Type	Required	Description
ids	Array<string>	Yes	order ids
symbol	string	No	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint
params.clientOrderIds	Array<string>	No	alternative to ids, array of client order ids EXCHANGE SPECIFIC PARAMETERS
params.origClientOrderIdList	Array<string>	No	max length 10 e.g. ["my_id_1","my_id_2"], encode the double quotes. No space after comma
params.recvWindow	Array<int>	No	
binance.cancelOrders (ids[, symbol, params])
Copy to clipboardErrorCopied

fetchOrderTrades
fetch all the trades made from a single order

Kind: instance method of binance
Returns: Array<object> - a list of trade structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/account-endpoints#account-trade-list-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Account-Trade-List
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Account-Trade-List
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-Trade-List
Param	Type	Required	Description
id	string	Yes	order id
symbol	string	Yes	unified market symbol
since	int	No	the earliest time in ms to fetch trades for
limit	int	No	the maximum number of trades to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchOrderTrades (id, symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchMyTrades
fetch all trades made by the user

Kind: instance method of binance
Returns: Array<Trade> - a list of trade structures

See

https://developers.binance.com/docs/binance-spot-api-docs/rest-api/account-endpoints#account-trade-list-user_data
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Account-Trade-List
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Account-Trade-List
https://developers.binance.com/docs/margin_trading/trade/Query-Margin-Account-Trade-List
https://developers.binance.com/docs/derivatives/option/trade/Account-Trade-List
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/UM-Account-Trade-List
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/CM-Account-Trade-List
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
since	int	No	the earliest time in ms to fetch trades for
limit	int	No	the maximum number of trades structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.until	int	No	the latest time in ms to fetch entries for
params.portfolioMargin	boolean	No	set to true if you would like to fetch trades for a portfolio margin account
binance.fetchMyTrades (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchMyDustTrades
fetch all dust trades made by the user

Kind: instance method of binance
Returns: Array<object> - a list of trade structures

See: https://developers.binance.com/docs/wallet/asset/dust-log

Param	Type	Required	Description
symbol	string	Yes	not used by binance fetchMyDustTrades ()
since	int	No	the earliest time in ms to fetch my dust trades for
limit	int	No	the maximum number of dust trades to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.type	string	No	'spot' or 'margin', default spot
binance.fetchMyDustTrades (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchDeposits
fetch all deposits made to an account

Kind: instance method of binance
Returns: Array<object> - a list of transaction structures

See

https://developers.binance.com/docs/wallet/capital/deposite-history
https://developers.binance.com/docs/fiat/rest-api/Get-Fiat-Deposit-Withdraw-History
Param	Type	Required	Description
code	string	Yes	unified currency code
since	int	No	the earliest time in ms to fetch deposits for
limit	int	No	the maximum number of deposits structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.fiat	bool	No	if true, only fiat deposits will be returned
params.until	int	No	the latest time in ms to fetch entries for
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
binance.fetchDeposits (code[, since, limit, params])
Copy to clipboardErrorCopied

fetchWithdrawals
fetch all withdrawals made from an account

Kind: instance method of binance
Returns: Array<object> - a list of transaction structures

See

https://developers.binance.com/docs/wallet/capital/withdraw-history
https://developers.binance.com/docs/fiat/rest-api/Get-Fiat-Deposit-Withdraw-History
Param	Type	Required	Description
code	string	Yes	unified currency code
since	int	No	the earliest time in ms to fetch withdrawals for
limit	int	No	the maximum number of withdrawals structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.fiat	bool	No	if true, only fiat withdrawals will be returned
params.until	int	No	the latest time in ms to fetch withdrawals for
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
binance.fetchWithdrawals (code[, since, limit, params])
Copy to clipboardErrorCopied

transfer
transfer currency internally between wallets on the same account

Kind: instance method of binance
Returns: object - a transfer structure

See: https://developers.binance.com/docs/wallet/asset/user-universal-transfer

Param	Type	Required	Description
code	string	Yes	unified currency code
amount	float	Yes	amount to transfer
fromAccount	string	Yes	account to transfer from
toAccount	string	Yes	account to transfer to
params	object	No	extra parameters specific to the exchange API endpoint
params.type	string	No	exchange specific transfer type
params.symbol	string	No	the unified symbol, required for isolated margin transfers
binance.transfer (code, amount, fromAccount, toAccount[, params])
Copy to clipboardErrorCopied

fetchTransfers
fetch a history of internal transfers made on an account

Kind: instance method of binance
Returns: Array<object> - a list of transfer structures

See: https://developers.binance.com/docs/wallet/asset/query-user-universal-transfer

Param	Type	Required	Description
code	string	Yes	unified currency code of the currency transferred
since	int	No	the earliest time in ms to fetch transfers for
limit	int	No	the maximum number of transfers structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.until	int	No	the latest time in ms to fetch transfers for
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.internal	boolean	No	default false, when true will fetch pay trade history
binance.fetchTransfers (code[, since, limit, params])
Copy to clipboardErrorCopied

fetchDepositAddress
fetch the deposit address for a currency associated with this account

Kind: instance method of binance
Returns: object - an address structure

See: https://developers.binance.com/docs/wallet/capital/deposite-address

Param	Type	Required	Description
code	string	Yes	unified currency code
params	object	No	extra parameters specific to the exchange API endpoint
params.network	string	No	network for fetch deposit address
binance.fetchDepositAddress (code[, params])
Copy to clipboardErrorCopied

fetchTransactionFees
DEPRECATED

please use fetchDepositWithdrawFees instead

Kind: instance method of binance
Returns: Array<object> - a list of fee structures

See: https://developers.binance.com/docs/wallet/capital/all-coins-info

Param	Type	Required	Description
codes	Array<string>, undefined	Yes	not used by binance fetchTransactionFees ()
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchTransactionFees (codes[, params])
Copy to clipboardErrorCopied

fetchDepositWithdrawFees
fetch deposit and withdraw fees

Kind: instance method of binance
Returns: Array<object> - a list of fee structures

See: https://developers.binance.com/docs/wallet/capital/all-coins-info

Param	Type	Required	Description
codes	Array<string>, undefined	Yes	not used by binance fetchDepositWithdrawFees ()
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchDepositWithdrawFees (codes[, params])
Copy to clipboardErrorCopied

withdraw
make a withdrawal

Kind: instance method of binance
Returns: object - a transaction structure

See: https://developers.binance.com/docs/wallet/capital/withdraw

Param	Type	Required	Description
code	string	Yes	unified currency code
amount	float	Yes	the amount to withdraw
address	string	Yes	the address to withdraw to
tag	string	Yes	
params	object	No	extra parameters specific to the exchange API endpoint
binance.withdraw (code, amount, address, tag[, params])
Copy to clipboardErrorCopied

fetchTradingFee
fetch the trading fees for a market

Kind: instance method of binance
Returns: object - a fee structure

See

https://developers.binance.com/docs/wallet/asset/trade-fee
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/User-Commission-Rate
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/User-Commission-Rate
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-User-Commission-Rate-for-UM
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-User-Commission-Rate-for-CM
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to fetch trading fees in a portfolio margin account
params.subType	string	No	"linear" or "inverse"
binance.fetchTradingFee (symbol[, params])
Copy to clipboardErrorCopied

fetchTradingFees
fetch the trading fees for multiple markets

Kind: instance method of binance
Returns: object - a dictionary of fee structures indexed by market symbols

See

https://developers.binance.com/docs/wallet/asset/trade-fee
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Account-Information-V2
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Account-Information
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Account-Config
Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchTradingFees ([params])
Copy to clipboardErrorCopied

fetchFundingRate
fetch the current funding rate

Kind: instance method of binance
Returns: object - a funding rate structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Mark-Price
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Index-Price-and-Mark-Price
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchFundingRate (symbol[, params])
Copy to clipboardErrorCopied

fetchFundingRateHistory
fetches historical funding rate prices

Kind: instance method of binance
Returns: Array<object> - a list of funding rate structures

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Get-Funding-Rate-History
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Get-Funding-Rate-History-of-Perpetual-Futures
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch the funding rate history for
since	int	No	timestamp in ms of the earliest funding rate to fetch
limit	int	No	the maximum amount of funding rate structures to fetch
params	object	No	extra parameters specific to the exchange API endpoint
params.until	int	No	timestamp in ms of the latest funding rate
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.subType	string	No	"linear" or "inverse"
binance.fetchFundingRateHistory (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchFundingRates
fetch the funding rate for multiple markets

Kind: instance method of binance
Returns: Array<object> - a list of funding rate structures, indexed by market symbols

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Mark-Price
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Index-Price-and-Mark-Price
Param	Type	Required	Description
symbols	Array<string>, undefined	Yes	list of unified market symbols
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchFundingRates (symbols[, params])
Copy to clipboardErrorCopied

fetchLeverageTiers
retrieve information on the maximum leverage, and maintenance margin for trades of varying trade sizes

Kind: instance method of binance
Returns: object - a dictionary of leverage tiers structures, indexed by market symbols

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Notional-and-Leverage-Brackets
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Notional-Bracket-for-Pair
https://developers.binance.com/docs/derivatives/portfolio-margin/account/UM-Notional-and-Leverage-Brackets
https://developers.binance.com/docs/derivatives/portfolio-margin/account/CM-Notional-and-Leverage-Brackets
Param	Type	Required	Description
symbols	Array<string>, undefined	Yes	list of unified market symbols
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to fetch the leverage tiers for a portfolio margin account
params.subType	string	No	"linear" or "inverse"
binance.fetchLeverageTiers (symbols[, params])
Copy to clipboardErrorCopied

fetchPosition
fetch data on an open position

Kind: instance method of binance
Returns: object - a position structure

See: https://developers.binance.com/docs/derivatives/option/trade/Option-Position-Information

Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the market the position is held in
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchPosition (symbol[, params])
Copy to clipboardErrorCopied

fetchOptionPositions
fetch data on open options positions

Kind: instance method of binance
Returns: Array<object> - a list of position structures

See: https://developers.binance.com/docs/derivatives/option/trade/Option-Position-Information

Param	Type	Required	Description
symbols	Array<string>, undefined	Yes	list of unified market symbols
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchOptionPositions (symbols[, params])
Copy to clipboardErrorCopied

fetchPositions
fetch all open positions

Kind: instance method of binance
Returns: Array<object> - a list of position structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Account-Information-V2
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Account-Information
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Position-Information-V2
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Position-Information
https://developers.binance.com/docs/derivatives/option/trade/Option-Position-Information
Param	Type	Required	Description
symbols	Array<string>	No	list of unified market symbols
params	object	No	extra parameters specific to the exchange API endpoint
params.params	object	No	extra parameters specific to the exchange API endpoint
params.method	string	No	method name to call, "positionRisk", "account" or "option", default is "positionRisk"
params.useV2	bool	No	set to true if you want to use the obsolete endpoint, where some more additional fields were provided
binance.fetchPositions ([symbols, params])
Copy to clipboardErrorCopied

fetchFundingHistory
fetch the history of funding payments paid and received on this account

Kind: instance method of binance
Returns: object - a funding history structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Get-Income-History
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Get-Income-History
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-UM-Income-History
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-CM-Income-History
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
since	int	No	the earliest time in ms to fetch funding history for
limit	int	No	the maximum number of funding history structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.until	int	No	timestamp in ms of the latest funding history entry
params.portfolioMargin	boolean	No	set to true if you would like to fetch the funding history for a portfolio margin account
params.subType	string	No	"linear" or "inverse"
binance.fetchFundingHistory (symbol[, since, limit, params])
Copy to clipboardErrorCopied

setLeverage
set the level of leverage for a market

Kind: instance method of binance
Returns: object - response from the exchange

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Change-Initial-Leverage
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Change-Initial-Leverage
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Change-UM-Initial-Leverage
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Change-CM-Initial-Leverage
Param	Type	Required	Description
leverage	float	Yes	the rate of leverage
symbol	string	Yes	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to set the leverage for a trading pair in a portfolio margin account
binance.setLeverage (leverage, symbol[, params])
Copy to clipboardErrorCopied

setMarginMode
set margin mode to 'cross' or 'isolated'

Kind: instance method of binance
Returns: object - response from the exchange

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Change-Margin-Type
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Change-Margin-Type
Param	Type	Required	Description
marginMode	string	Yes	'cross' or 'isolated'
symbol	string	Yes	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint
binance.setMarginMode (marginMode, symbol[, params])
Copy to clipboardErrorCopied

setPositionMode
set hedged to true or false for a market

Kind: instance method of binance
Returns: object - response from the exchange

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Change-Position-Mode
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Change-Position-Mode
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-UM-Current-Position-Mode
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-CM-Current-Position-Mode
Param	Type	Required	Description
hedged	bool	Yes	set to true to use dualSidePosition
symbol	string	Yes	not used by binance setPositionMode ()
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to set the position mode for a portfolio margin account
params.subType	string	No	"linear" or "inverse"
binance.setPositionMode (hedged, symbol[, params])
Copy to clipboardErrorCopied

fetchLeverages
fetch the set leverage for all markets

Kind: instance method of binance
Returns: object - a list of leverage structures

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Account-Information-V2
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Account-Information
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-UM-Account-Detail
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-CM-Account-Detail
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Symbol-Config
Param	Type	Required	Description
symbols	Array<string>	No	a list of unified market symbols
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchLeverages ([symbols, params])
Copy to clipboardErrorCopied

fetchSettlementHistory
fetches historical settlement records

Kind: instance method of binance
Returns: Array<object> - a list of settlement history objects

See: https://developers.binance.com/docs/derivatives/option/market-data/Historical-Exercise-Records

Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the settlement history
since	int	No	timestamp in ms
limit	int	No	number of records, default 100, max 100
params	object	No	exchange specific params
binance.fetchSettlementHistory (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchMySettlementHistory
fetches historical settlement records of the user

Kind: instance method of binance
Returns: Array<object> - a list of [settlement history objects]

See: https://developers.binance.com/docs/derivatives/option/trade/User-Exercise-Record

Param	Type	Required	Description
symbol	string	Yes	unified market symbol of the settlement history
since	int	No	timestamp in ms
limit	int	No	number of records
params	object	No	exchange specific params
binance.fetchMySettlementHistory (symbol[, since, limit, params])
Copy to clipboardErrorCopied

fetchLedgerEntry
fetch the history of changes, actions done by the user or operations that altered the balance of the user

Kind: instance method of binance
Returns: object - a ledger structure

See: https://developers.binance.com/docs/derivatives/option/account/Account-Funding-Flow

Param	Type	Required	Description
id	string	Yes	the identification number of the ledger entry
code	string	Yes	unified currency code
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchLedgerEntry (id, code[, params])
Copy to clipboardErrorCopied

fetchLedger
fetch the history of changes, actions done by the user or operations that altered the balance of the user

Kind: instance method of binance
Returns: object - a ledger structure

See

https://developers.binance.com/docs/derivatives/option/account/Account-Funding-Flow
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Get-Income-History
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Get-Income-History
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-UM-Income-History
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-CM-Income-History
Param	Type	Required	Description
code	string	No	unified currency code
since	int	No	timestamp in ms of the earliest ledger entry
limit	int	No	max number of ledger entries to return
params	object	No	extra parameters specific to the exchange API endpoint
params.until	int	No	timestamp in ms of the latest ledger entry
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.portfolioMargin	boolean	No	set to true if you would like to fetch the ledger for a portfolio margin account
params.subType	string	No	"linear" or "inverse"
binance.fetchLedger ([code, since, limit, params])
Copy to clipboardErrorCopied

reduceMargin
remove margin from a position

Kind: instance method of binance
Returns: object - a margin structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Modify-Isolated-Position-Margin
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Modify-Isolated-Position-Margin
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
amount	float	Yes	the amount of margin to remove
params	object	No	extra parameters specific to the exchange API endpoint
binance.reduceMargin (symbol, amount[, params])
Copy to clipboardErrorCopied

addMargin
add margin

Kind: instance method of binance
Returns: object - a margin structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Modify-Isolated-Position-Margin
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Modify-Isolated-Position-Margin
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
amount	float	Yes	amount of margin to add
params	object	No	extra parameters specific to the exchange API endpoint
binance.addMargin (symbol, amount[, params])
Copy to clipboardErrorCopied

fetchCrossBorrowRate
fetch the rate of interest to borrow a currency for margin trading

Kind: instance method of binance
Returns: object - a borrow rate structure

See: https://developers.binance.com/docs/margin_trading/borrow-and-repay/Query-Margin-Interest-Rate-History

Param	Type	Required	Description
code	string	Yes	unified currency code
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchCrossBorrowRate (code[, params])
Copy to clipboardErrorCopied

fetchIsolatedBorrowRate
fetch the rate of interest to borrow a currency for margin trading

Kind: instance method of binance
Returns: object - an isolated borrow rate structure

See: https://developers.binance.com/docs/margin_trading/account/Query-Isolated-Margin-Fee-Data

Param	Type	Required	Description
symbol	string	Yes	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint EXCHANGE SPECIFIC PARAMETERS
params.vipLevel	object	No	user's current specific margin data will be returned if viplevel is omitted
binance.fetchIsolatedBorrowRate (symbol[, params])
Copy to clipboardErrorCopied

fetchIsolatedBorrowRates
fetch the borrow interest rates of all currencies

Kind: instance method of binance
Returns: object - a borrow rate structure

See: https://developers.binance.com/docs/margin_trading/account/Query-Isolated-Margin-Fee-Data

Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
params.symbol	object	No	unified market symbol EXCHANGE SPECIFIC PARAMETERS
params.vipLevel	object	No	user's current specific margin data will be returned if viplevel is omitted
binance.fetchIsolatedBorrowRates ([params])
Copy to clipboardErrorCopied

fetchBorrowRateHistory
retrieves a history of a currencies borrow interest rate at specific time slots

Kind: instance method of binance
Returns: Array<object> - an array of borrow rate structures

See: https://developers.binance.com/docs/margin_trading/borrow-and-repay/Query-Margin-Interest-Rate-History

Param	Type	Required	Description
code	string	Yes	unified currency code
since	int	No	timestamp for the earliest borrow rate
limit	int	No	the maximum number of borrow rate structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchBorrowRateHistory (code[, since, limit, params])
Copy to clipboardErrorCopied

createGiftCode
create gift code

Kind: instance method of binance
Returns: object - The gift code id, code, currency and amount

See: https://developers.binance.com/docs/gift_card/market-data/Create-a-single-token-gift-card

Param	Type	Required	Description
code	string	Yes	gift code
amount	float	Yes	amount of currency for the gift
params	object	No	extra parameters specific to the exchange API endpoint
binance.createGiftCode (code, amount[, params])
Copy to clipboardErrorCopied

redeemGiftCode
redeem gift code

Kind: instance method of binance
Returns: object - response from the exchange

See: https://developers.binance.com/docs/gift_card/market-data/Redeem-a-Binance-Gift-Card

Param	Type	Required	Description
giftcardCode	string	Yes	
params	object	No	extra parameters specific to the exchange API endpoint
binance.redeemGiftCode (giftcardCode[, params])
Copy to clipboardErrorCopied

verifyGiftCode
verify gift code

Kind: instance method of binance
Returns: object - response from the exchange

See: https://developers.binance.com/docs/gift_card/market-data/Verify-Binance-Gift-Card-by-Gift-Card-Number

Param	Type	Required	Description
id	string	Yes	reference number id
params	object	No	extra parameters specific to the exchange API endpoint
binance.verifyGiftCode (id[, params])
Copy to clipboardErrorCopied

fetchBorrowInterest
fetch the interest owed by the user for borrowing currency for margin trading

Kind: instance method of binance
Returns: Array<object> - a list of borrow interest structures

See

https://developers.binance.com/docs/margin_trading/borrow-and-repay/Get-Interest-History
https://developers.binance.com/docs/derivatives/portfolio-margin/account/Get-Margin-BorrowLoan-Interest-History
Param	Type	Required	Description
code	string	No	unified currency code
symbol	string	No	unified market symbol when fetch interest in isolated markets
since	int	No	the earliest time in ms to fetch borrrow interest for
limit	int	No	the maximum number of structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to fetch the borrow interest in a portfolio margin account
binance.fetchBorrowInterest ([code, symbol, since, limit, params])
Copy to clipboardErrorCopied

repayCrossMargin
repay borrowed margin and interest

Kind: instance method of binance
Returns: object - a margin loan structure

See

https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Margin-Account-Repay
https://developers.binance.com/docs/margin_trading/borrow-and-repay/Margin-Account-Borrow-Repay
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Margin-Account-Repay-Debt
Param	Type	Required	Description
code	string	Yes	unified currency code of the currency to repay
amount	float	Yes	the amount to repay
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to repay margin in a portfolio margin account
params.repayCrossMarginMethod	string	No	portfolio margin only 'papiPostRepayLoan' (default), 'papiPostMarginRepayDebt' (alternative)
params.specifyRepayAssets	string	No	portfolio margin papiPostMarginRepayDebt only specific asset list to repay debt
binance.repayCrossMargin (code, amount[, params])
Copy to clipboardErrorCopied

repayIsolatedMargin
repay borrowed margin and interest

Kind: instance method of binance
Returns: object - a margin loan structure

See: https://developers.binance.com/docs/margin_trading/borrow-and-repay/Margin-Account-Borrow-Repay

Param	Type	Required	Description
symbol	string	Yes	unified market symbol, required for isolated margin
code	string	Yes	unified currency code of the currency to repay
amount	float	Yes	the amount to repay
params	object	No	extra parameters specific to the exchange API endpoint
binance.repayIsolatedMargin (symbol, code, amount[, params])
Copy to clipboardErrorCopied

borrowCrossMargin
create a loan to borrow margin

Kind: instance method of binance
Returns: object - a margin loan structure

See

https://developers.binance.com/docs/margin_trading/borrow-and-repay/Margin-Account-Borrow-Repay
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Margin-Account-Borrow
Param	Type	Required	Description
code	string	Yes	unified currency code of the currency to borrow
amount	float	Yes	the amount to borrow
params	object	No	extra parameters specific to the exchange API endpoint
params.portfolioMargin	boolean	No	set to true if you would like to borrow margin in a portfolio margin account
binance.borrowCrossMargin (code, amount[, params])
Copy to clipboardErrorCopied

borrowIsolatedMargin
create a loan to borrow margin

Kind: instance method of binance
Returns: object - a margin loan structure

See: https://developers.binance.com/docs/margin_trading/borrow-and-repay/Margin-Account-Borrow-Repay

Param	Type	Required	Description
symbol	string	Yes	unified market symbol, required for isolated margin
code	string	Yes	unified currency code of the currency to borrow
amount	float	Yes	the amount to borrow
params	object	No	extra parameters specific to the exchange API endpoint
binance.borrowIsolatedMargin (symbol, code, amount[, params])
Copy to clipboardErrorCopied

fetchOpenInterestHistory
Retrieves the open interest history of a currency

Kind: instance method of binance
Returns: object - an array of open interest structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Open-Interest-Statistics
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Open-Interest-Statistics
Param	Type	Required	Description
symbol	string	Yes	Unified CCXT market symbol
timeframe	string	Yes	"5m","15m","30m","1h","2h","4h","6h","12h", or "1d"
since	int	No	the time(ms) of the earliest record to retrieve as a unix timestamp
limit	int	No	default 30, max 500
params	object	No	exchange specific parameters
params.until	int	No	the time(ms) of the latest record to retrieve as a unix timestamp
params.paginate	boolean	No	default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the availble parameters
binance.fetchOpenInterestHistory (symbol, timeframe[, since, limit, params])
Copy to clipboardErrorCopied

fetchOpenInterest
retrieves the open interest of a contract trading pair

Kind: instance method of binance
Returns: object - an open interest structurehttps://docs.ccxt.com/#/?id=open-interest-structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Open-Interest
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Open-Interest
https://developers.binance.com/docs/derivatives/option/market-data/Open-Interest
Param	Type	Required	Description
symbol	string	Yes	unified CCXT market symbol
params	object	No	exchange specific parameters
binance.fetchOpenInterest (symbol[, params])
Copy to clipboardErrorCopied

fetchMyLiquidations
retrieves the users liquidated positions

Kind: instance method of binance
Returns: object - an array of liquidation structures

See

https://developers.binance.com/docs/margin_trading/trade/Get-Force-Liquidation-Record
https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Users-Force-Orders
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Users-Force-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-Users-UM-Force-Orders
https://developers.binance.com/docs/derivatives/portfolio-margin/trade/Query-Users-CM-Force-Orders
Param	Type	Required	Description
symbol	string	No	unified CCXT market symbol
since	int	No	the earliest time in ms to fetch liquidations for
limit	int	No	the maximum number of liquidation structures to retrieve
params	object	No	exchange specific parameters for the binance api endpoint
params.until	int	No	timestamp in ms of the latest liquidation
params.paginate	boolean	No	spot only default false, when true will automatically paginate by calling this endpoint multiple times. See in the docs all the available parameters
params.portfolioMargin	boolean	No	set to true if you would like to fetch liquidations in a portfolio margin account
params.type	string	No	"spot"
params.subType	string	No	"linear" or "inverse"
binance.fetchMyLiquidations ([symbol, since, limit, params])
Copy to clipboardErrorCopied

fetchGreeks
fetches an option contracts greeks, financial metrics used to measure the factors that affect the price of an options contract

Kind: instance method of binance
Returns: object - a greeks structure

See: https://developers.binance.com/docs/derivatives/option/market-data/Option-Mark-Price

Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch greeks for
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchGreeks (symbol[, params])
Copy to clipboardErrorCopied

fetchAllGreeks
fetches all option contracts greeks, financial metrics used to measure the factors that affect the price of an options contract

Kind: instance method of binance
Returns: object - a greeks structure

See: https://developers.binance.com/docs/derivatives/option/market-data/Option-Mark-Price

Param	Type	Required	Description
symbols	Array<string>	No	unified symbols of the markets to fetch greeks for, all markets are returned if not assigned
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchAllGreeks ([symbols, params])
Copy to clipboardErrorCopied

fetchPositionMode
fetchs the position mode, hedged or one way, hedged for binance is set identically for all linear markets or all inverse markets

Kind: instance method of binance
Returns: object - an object detailing whether the market is in hedged or one-way mode

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Get-Current-Position-Mode
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Get-Current-Position-Mode
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch the order book for
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchPositionMode (symbol[, params])
Copy to clipboardErrorCopied

fetchMarginModes
fetches margin modes ("isolated" or "cross") that the market for the symbol in in, with symbol=undefined all markets for a subType (linear/inverse) are returned

Kind: instance method of binance
Returns: object - a list of margin mode structures

See

https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Account-Information
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Account-Information-V2
https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Symbol-Config
Param	Type	Required	Description
symbols	Array<string>	Yes	unified market symbols
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchMarginModes (symbols[, params])
Copy to clipboardErrorCopied

fetchMarginMode
fetches the margin mode of a specific symbol

Kind: instance method of binance
Returns: object - a margin mode structure

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Symbol-Config
https://developers.binance.com/docs/derivatives/coin-margined-futures/account/rest-api/Account-Information
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market the order was made in
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchMarginMode (symbol[, params])
Copy to clipboardErrorCopied

fetchOption
fetches option data that is commonly found in an option chain

Kind: instance method of binance
Returns: object - an option chain structure

See: https://developers.binance.com/docs/derivatives/option/market-data/24hr-Ticker-Price-Change-Statistics

Param	Type	Required	Description
symbol	string	Yes	unified market symbol
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchOption (symbol[, params])
Copy to clipboardErrorCopied

fetchMarginAdjustmentHistory
fetches the history of margin added or reduced from contract isolated positions

Kind: instance method of binance
Returns: Array<object> - a list of margin structures

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/trade/rest-api/Get-Position-Margin-Change-History
https://developers.binance.com/docs/derivatives/coin-margined-futures/trade/rest-api/Get-Position-Margin-Change-History
Param	Type	Required	Description
symbol	string	Yes	unified market symbol
type	string	No	"add" or "reduce"
since	int	No	timestamp in ms of the earliest change to fetch
limit	int	No	the maximum amount of changes to fetch
params	object	Yes	extra parameters specific to the exchange api endpoint
params.until	int	No	timestamp in ms of the latest change to fetch
binance.fetchMarginAdjustmentHistory (symbol[, type, since, limit, params])
Copy to clipboardErrorCopied

fetchConvertCurrencies
fetches all available currencies that can be converted

Kind: instance method of binance
Returns: object - an associative dictionary of currencies

See: https://developers.binance.com/docs/convert/market-data/Query-order-quantity-precision-per-asset

Param	Type	Required	Description
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchConvertCurrencies ([params])
Copy to clipboardErrorCopied

fetchConvertQuote
fetch a quote for converting from one currency to another

Kind: instance method of binance
Returns: object - a conversion structure

See: https://developers.binance.com/docs/convert/trade/Send-quote-request

Param	Type	Required	Description
fromCode	string	Yes	the currency that you want to sell and convert from
toCode	string	Yes	the currency that you want to buy and convert into
amount	float	Yes	how much you want to trade in units of the from currency
params	object	No	extra parameters specific to the exchange API endpoint
params.walletType	string	No	either 'SPOT' or 'FUNDING', the default is 'SPOT'
binance.fetchConvertQuote (fromCode, toCode, amount[, params])
Copy to clipboardErrorCopied

createConvertTrade
convert from one currency to another

Kind: instance method of binance
Returns: object - a conversion structure

See: https://developers.binance.com/docs/convert/trade/Accept-Quote

Param	Type	Required	Description
id	string	Yes	the id of the trade that you want to make
fromCode	string	Yes	the currency that you want to sell and convert from
toCode	string	Yes	the currency that you want to buy and convert into
amount	float	No	how much you want to trade in units of the from currency
params	object	No	extra parameters specific to the exchange API endpoint
binance.createConvertTrade (id, fromCode, toCode[, amount, params])
Copy to clipboardErrorCopied

fetchConvertTrade
fetch the data for a conversion trade

Kind: instance method of binance
Returns: object - a conversion structure

See: https://developers.binance.com/docs/convert/trade/Order-Status

Param	Type	Required	Description
id	string	Yes	the id of the trade that you want to fetch
code	string	No	the unified currency code of the conversion trade
params	object	No	extra parameters specific to the exchange API endpoint
binance.fetchConvertTrade (id[, code, params])
Copy to clipboardErrorCopied

fetchConvertTradeHistory
fetch the users history of conversion trades

Kind: instance method of binance
Returns: Array<object> - a list of conversion structures

See: https://developers.binance.com/docs/convert/trade/Get-Convert-Trade-History

Param	Type	Required	Description
code	string	No	the unified currency code
since	int	No	the earliest time in ms to fetch conversions for
limit	int	No	the maximum number of conversion structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.until	int	No	timestamp in ms of the latest conversion to fetch
binance.fetchConvertTradeHistory ([code, since, limit, params])
Copy to clipboardErrorCopied

fetchFundingIntervals
fetch the funding rate interval for multiple markets

Kind: instance method of binance
Returns: Array<object> - a list of funding rate structures

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Get-Funding-Rate-Info
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Get-Funding-Info
Param	Type	Required	Description
symbols	Array<string>	No	list of unified market symbols
params	object	No	extra parameters specific to the exchange API endpoint
params.subType	string	No	"linear" or "inverse"
binance.fetchFundingIntervals ([symbols, params])
Copy to clipboardErrorCopied

fetchLongShortRatioHistory
fetches the long short ratio history for a unified market symbol

Kind: instance method of binance
Returns: Array<object> - an array of long short ratio structures

See

https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Long-Short-Ratio
https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Long-Short-Ratio
Param	Type	Required	Description
symbol	string	Yes	unified symbol of the market to fetch the long short ratio for
timeframe	string	No	the period for the ratio, default is 24 hours
since	int	No	the earliest time in ms to fetch ratios for
limit	int	No	the maximum number of long short ratio structures to retrieve
params	object	No	extra parameters specific to the exchange API endpoint
params.until	int	No	timestamp in ms of the latest ratio to fetch
binance.fetchLongShortRatioHistory (symbol[, timeframe, since, limit, params])