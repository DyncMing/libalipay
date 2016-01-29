/**
 * @copyright Maichong Software Ltd. 2016 http://maichong.it
 * @date 2016-01-29
 * @author Liang <liang@maichong.it>
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const request = require('request');
const _ = require('lodash');

const instances = {};

function Alipay(config) {
  this._config = _.extend({
    partner: '',
    seller_id: '',
    notify_url: '',
    service: 'mobile.securitypay.pay',
    payment_type: '1',
    _input_charset: 'utf-8',
    it_b_pay: '1d',
    sign_type: 'RSA'
  }, config);
  if (config && config.rsa_private_key) {
    this.rsa_private_key = fs.readFileSync(config.rsa_private_key);
    delete this._config.rsa_private_key;
  }
}

/**
 * 获取实例
 * @param {string} name 实例名称
 * @returns {Alipay}
 */
Alipay.getInstance = function (name) {
  if (!instances[name]) {
    instances[name] = new Weixin();
  }
  return instances[name];
};

/**
 * 初始化
 * @param config
 * @returns {Alipay}
 */
Alipay.init = function (config) {
  _.extend(this._config, config);
  if (config.rsa_private_key) {
    this.rsa_private_key = fs.readFileSync(config.rsa_private_key);
    delete this._config.rsa_private_key;
  }
  return this;
};

/**
 * 验证一个通知是否是支付宝发出的,Promise返回bool值,不抛出异常
 * @param notify_id
 * @returns {Promise}
 */
Alipay.verify = function (notify_id) {
  let config = this._config;
  return new Promise(function (resolve) {
    request('https://mapi.alipay.com/gateway.do?service=notify_verify&partner=' + config.partner + '&notify_id=' + notify_id, function (error, response, body) {
      resolve(body == 'true');
    });
  })
};

/**
 * 创建支付参数
 * @param data
 * @returns {string}
 */
Alipay.createPayReq = function (data) {
  _.extend(data, this._config);
  let link = createLinkstring(paramsFilter(data));

  let signer = crypto.createSign('RSA-SHA1');
  signer.update(link, 'utf8');
  data.sign = encodeURIComponent(signer.sign(this.rsa_private_key, "base64"));

  return createLinkstring(data);
};

module.exports = Alipay.prototype = Alipay.default = Alipay;
Alipay.call(Alipay);

/**
 * 除去数组中的空值和签名参数
 * @param params 签名参数组
 * @return {object} 去掉空值与签名参数后的新签名参数组
 */
function paramsFilter(params) {
  return _.reduce(params, function (result, value, key) {
    if (value && key != 'sign' && key != 'sign_type') {
      result[key] = value;
    }
    return result;
  }, {});
}

/**
 * 把数组所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
 * @param params
 * @returns {string}
 */
function createLinkstring(params) {
  let arr = [];
  for (let key in params) {
    arr.push(key + '="' + params[key] + '"');
  }
  return arr.join('&');
}
