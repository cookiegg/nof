/**
 * 交易执行器接口
 * 定义了统一的交易操作接口
 */

/**
 * 交易执行器抽象基类
 */
export class TradingExecutor {
  constructor(config) {
    this.config = config;
  }

  /**
   * 执行买入订单
   * @param {Object} decision - 交易决策
   * @param {string} decision.symbol - 交易对符号（如 'BTC'）
   * @param {number} decision.quantity - 数量
   * @param {number} decision.leverage - 杠杆（期货时使用）
   * @returns {Promise<Object>} 订单结果
   */
  async executeBuyOrder(decision) {
    throw new Error('executeBuyOrder must be implemented');
  }

  /**
   * 执行卖出订单
   * @param {Object} decision - 交易决策
   * @param {string} decision.symbol - 交易对符号
   * @param {number} decision.quantity - 数量
   * @param {number} decision.leverage - 杠杆（期货时使用）
   * @returns {Promise<Object>} 订单结果
   */
  async executeSellOrder(decision) {
    throw new Error('executeSellOrder must be implemented');
  }

  /**
   * 更新账户状态（余额、持仓等）
   * @returns {Promise<Object>} 账户状态
   */
  async updateAccountState() {
    throw new Error('updateAccountState must be implemented');
  }

  /**
   * 获取当前账户余额
   * @returns {Promise<number>} 余额
   */
  async getAccountBalance() {
    throw new Error('getAccountBalance must be implemented');
  }

  /**
   * 获取当前持仓
   * @returns {Promise<Array>} 持仓列表
   */
  async getPositions() {
    throw new Error('getPositions must be implemented');
  }

  /**
   * 获取交易对当前价格
   * @param {string} symbol - 交易对符号
   * @returns {Promise<number>} 当前价格
   */
  async getCurrentPrice(symbol) {
    throw new Error('getCurrentPrice must be implemented');
  }
}

